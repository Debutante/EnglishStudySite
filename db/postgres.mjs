let pool;
let dotEnvLoaded = false;

async function loadDotEnv() {
  if (dotEnvLoaded) return;
  dotEnvLoaded = true;
  const fs = await import('node:fs/promises');
  const path = await import('node:path');
  const { fileURLToPath } = await import('node:url');
  const root = path.dirname(fileURLToPath(import.meta.url));
  await fs.readFile(path.join(root, '..', '.env'), 'utf8')
    .then((text) => {
      for (const line of text.split(/\r?\n/)) {
        const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
        if (!match || process.env[match[1]] !== undefined) continue;
        process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
      }
    })
    .catch(() => {});
}

async function getPool() {
  if (pool) return pool;
  await loadDotEnv();
  const databaseUrl = process.env.DATABASE_URL;
  if (!databaseUrl) throw new Error('DATABASE_URL is not configured. Run the PostgreSQL setup described in README.md.');
  let pg;
  try {
    pg = await import('pg');
  } catch {
    throw new Error('The pg package is not installed. Run npm install before using the database APIs.');
  }
  pool = new pg.default.Pool({ connectionString: databaseUrl, max: 10, idleTimeoutMillis: 30_000 });
  return pool;
}

export async function query(text, values = []) {
  const client = await getPool();
  return client.query(text, values);
}

export async function withTransaction(callback) {
  const client = await getPool();
  const connection = await client.connect();
  try {
    await connection.query('BEGIN');
    const result = await callback(connection);
    await connection.query('COMMIT');
    return result;
  } catch (error) {
    await connection.query('ROLLBACK');
    throw error;
  } finally {
    connection.release();
  }
}

export function formatArticleSummary(row) {
  return {
    id: String(row.id),
    slug: row.slug,
    title: row.title,
    dek: row.subtitle ?? '',
    excerpt: row.excerpt ?? row.subtitle ?? '',
    category: row.category_name,
    categorySlug: row.category_slug,
    date: row.published_at,
    level: row.level,
    readingTime: row.reading_time_minutes,
    coverImageUrl: row.cover_image_url ?? '',
    tags: row.tags ?? [],
  };
}

export function formatSentence(row) {
  return {
    id: String(row.id),
    position: row.position,
    text: row.text,
    audioUrl: row.audio_url,
    audioDurationMs: row.audio_duration_ms,
  };
}

const SUMMARY_SELECT = `
  SELECT
    a.id,
    a.slug,
    a.title,
    a.subtitle,
    a.excerpt,
    a.level,
    a.reading_time_minutes,
    a.published_at,
    a.cover_image_url,
    a.status,
    c.name AS category_name,
    c.slug AS category_slug,
    COALESCE(
      ARRAY_AGG(t.name ORDER BY t.name) FILTER (WHERE t.id IS NOT NULL),
      ARRAY[]::TEXT[]
    ) AS tags
  FROM articles a
  JOIN categories c ON c.id = a.category_id
  LEFT JOIN article_tags at ON at.article_id = a.id
  LEFT JOIN tags t ON t.id = at.tag_id
`;

export async function listPublishedArticles() {
  const result = await query(`${SUMMARY_SELECT}
    WHERE a.status = 'published'
    GROUP BY a.id, c.name, c.slug
    ORDER BY a.published_at DESC NULLS LAST, a.id DESC
  `);
  return result.rows.map(formatArticleSummary);
}

export async function listAdminArticles({ status = '' } = {}) {
  const params = [];
  const statusClause = status && ['draft', 'review', 'published', 'archived'].includes(status)
    ? (params.push(status), 'AND a.status = $1') : '';
  const result = await query(`${SUMMARY_SELECT}
    WHERE TRUE ${statusClause}
    GROUP BY a.id, c.name, c.slug
    ORDER BY a.updated_at DESC, a.id DESC
  `, params);
  return result.rows.map((row) => ({ ...formatArticleSummary(row), status: row.status }));
}

async function getArticleRecord(slugOrId, { publishedOnly = true } = {}) {
  const where = publishedOnly ? 'a.slug = $1 AND a.status = \'published\'' : 'a.slug = $1';
  const result = await query(`
    SELECT
      a.id, a.slug, a.title, a.subtitle, a.excerpt, a.level,
      a.reading_time_minutes, a.published_at, a.language,
      a.cover_image_url, a.source_name, a.source_url, a.copyright_note,
      a.status,
      c.name AS category_name, c.slug AS category_slug,
      av.id AS version_id, av.version_number
    FROM articles a
    JOIN categories c ON c.id = a.category_id
    JOIN LATERAL (
      SELECT id, version_number
      FROM article_versions
      WHERE article_id = a.id
      ORDER BY version_number DESC
      LIMIT 1
    ) av ON TRUE
    WHERE ${where}
    LIMIT 1
  `, [slugOrId]);
  return result.rowCount ? result.rows[0] : null;
}

async function hydrateArticle(articleRow, { includeAi = true } = {}) {
  if (!articleRow) return null;
  const [paragraphsResult, tagsResult, aiResult] = await Promise.all([
    query(`
      SELECT
        p.id AS paragraph_id,
        p.position AS paragraph_position,
        p.text AS paragraph_text,
        s.id AS sentence_id,
        s.position AS sentence_position,
        s.text AS sentence_text,
        s.audio_url,
        s.audio_duration_ms
      FROM paragraphs p
      LEFT JOIN sentences s ON s.paragraph_id = p.id
      WHERE p.article_version_id = $1
      ORDER BY p.position ASC, s.position ASC
    `, [articleRow.version_id]),
    query(`
      SELECT t.name
      FROM article_tags at
      JOIN tags t ON t.id = at.tag_id
      WHERE at.article_id = $1
      ORDER BY t.name
    `, [articleRow.id]),
    includeAi ? query(`
      SELECT sentence_id, scope, kind, language, status, model, content, error, updated_at
      FROM ai_generations
      WHERE article_version_id = $1
        AND status = 'completed'
      ORDER BY updated_at DESC
    `, [articleRow.version_id]) : Promise.resolve({ rows: [] }),
  ]);

  const paragraphs = [];
  let current = null;
  for (const row of paragraphsResult.rows) {
    if (!current || current.id !== String(row.paragraph_id)) {
      current = {
        id: String(row.paragraph_id),
        position: row.paragraph_position,
        text: row.paragraph_text,
        sentences: [],
      };
      paragraphs.push(current);
    }
    if (row.sentence_id !== null) current.sentences.push(formatSentence({
      id: row.sentence_id,
      position: row.sentence_position,
      text: row.sentence_text,
      audio_url: row.audio_url,
      audio_duration_ms: row.audio_duration_ms,
    }));
  }

  const generations = {
    articleTranslationZh: null,
    sentences: {},
  };
  for (const row of aiResult.rows) {
    if (row.scope === 'article' && row.kind === 'article_translate' && row.language === 'zh-CN') {
      if (!generations.articleTranslationZh) generations.articleTranslationZh = row.content;
      continue;
    }
    if (row.scope === 'sentence' && row.sentence_id) {
      const key = String(row.sentence_id);
      generations.sentences[key] ||= {};
      if (generations.sentences[key][row.kind] == null) generations.sentences[key][row.kind] = row.content;
    }
  }

  return {
    id: String(articleRow.id),
    slug: articleRow.slug,
    title: articleRow.title,
    dek: articleRow.subtitle ?? '',
    excerpt: articleRow.excerpt ?? articleRow.subtitle ?? '',
    category: articleRow.category_name,
    categorySlug: articleRow.category_slug,
    date: articleRow.published_at,
    level: articleRow.level,
    readingTime: articleRow.reading_time_minutes,
    language: articleRow.language,
    coverImageUrl: articleRow.cover_image_url,
    sourceName: articleRow.source_name,
    sourceUrl: articleRow.source_url,
    copyrightNote: articleRow.copyright_note,
    status: articleRow.status,
    version: articleRow.version_number,
    versionId: String(articleRow.version_id),
    tags: tagsResult.rows.map((row) => row.name),
    paragraphs,
    ai: generations,
  };
}

export async function getPublishedArticleBySlug(slug) {
  return hydrateArticle(await getArticleRecord(slug, { publishedOnly: true }));
}

export async function getAdminArticleBySlug(slug) {
  return hydrateArticle(await getArticleRecord(slug, { publishedOnly: false }));
}

export async function listPublishedCategories() {
  const result = await query(`
    SELECT
      c.id,
      c.slug,
      c.name,
      c.description,
      COUNT(a.id)::INTEGER AS article_count
    FROM categories c
    LEFT JOIN articles a
      ON a.category_id = c.id
      AND a.status = 'published'
    GROUP BY c.id
    ORDER BY c.name ASC
  `);
  return result.rows.map((row) => ({
    id: String(row.id),
    slug: row.slug,
    name: row.name,
    description: row.description ?? '',
    articleCount: row.article_count,
  }));
}

export async function listCategories() {
  const result = await query(`SELECT id, slug, name, description FROM categories ORDER BY name ASC`);
  return result.rows.map((row) => ({
    id: String(row.id), slug: row.slug, name: row.name, description: row.description ?? '',
  }));
}

export async function getCachedAiGeneration({ articleVersionId, sentenceId = null, kind, language = 'zh-CN', promptVersion = 'v1' }) {
  const result = await query(`
    SELECT content, status, model, prompt_version, updated_at
    FROM ai_generations
    WHERE article_version_id = $1
      AND COALESCE(sentence_id, 0) = COALESCE($2::BIGINT, 0)
      AND kind = $3
      AND language = $4
      AND prompt_version = $5
      AND status = 'completed'
    ORDER BY updated_at DESC
    LIMIT 1
  `, [articleVersionId, sentenceId, kind, language, promptVersion]);
  return result.rowCount ? result.rows[0] : null;
}

export async function upsertAiGeneration({
  articleId,
  articleVersionId,
  sentenceId = null,
  kind,
  language = 'zh-CN',
  model = null,
  promptVersion = 'v1',
  status = 'completed',
  content = null,
  error = null,
}) {
  const result = await query(`
    INSERT INTO ai_generations(
      article_id, article_version_id, sentence_id, scope, kind, language,
      status, model, prompt_version, content, error
    )
    VALUES (
      $1,
      $2,
      $3::BIGINT,
      CASE WHEN $3::BIGINT IS NULL THEN 'article' ELSE 'sentence' END,
      $4, $5, $6, $7, $8, $9, $10
    )
    ON CONFLICT (article_version_id, COALESCE(sentence_id, 0), kind, language, prompt_version)
    DO UPDATE SET
      status = EXCLUDED.status,
      model = EXCLUDED.model,
      content = EXCLUDED.content,
      error = EXCLUDED.error,
      updated_at = NOW()
    RETURNING id, status, content, model, updated_at
  `, [articleId, articleVersionId, sentenceId, kind, language, status, model, promptVersion, content, error]);
  return result.rows[0];
}

export function normalizeSlug(value) {
  return String(value || '')
    .normalize('NFKC')
    .trim()
    .toLocaleLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

async function uniqueSlug(client, baseSlug, existingId = null) {
  const base = normalizeSlug(baseSlug);
  if (!base) throw new Error('Title must produce a valid slug.');
  let candidate = base;
  let suffix = 1;
  while (true) {
    const result = existingId == null
      ? await client.query('SELECT 1 FROM articles WHERE slug = $1 LIMIT 1', [candidate])
      : await client.query('SELECT 1 FROM articles WHERE slug = $1 AND id <> $2 LIMIT 1', [candidate, existingId]);
    if (!result.rowCount) return candidate;
    suffix += 1;
    const suffixText = `-${suffix}`;
    candidate = `${base.slice(0, Math.max(1, 120 - suffixText.length))}${suffixText}`;
  }
}

export async function createArticle(input) {
  return saveArticle(null, input);
}

export async function updateArticleBySlug(slug, input) {
  const existing = await getArticleRecord(slug, { publishedOnly: false });
  if (!existing) return null;
  return saveArticle(existing, input);
}

async function saveArticle(existing, input) {
  const title = String(input.title || '').trim();
  const subtitle = String(input.subtitle ?? input.dek ?? '').trim();
  const level = String(input.level || 'Upper intermediate').trim();
  const readingTime = Math.max(1, Number(input.readingTime || input.reading_time_minutes || 1));
  const status = ['draft', 'review', 'published', 'archived'].includes(input.status) ? input.status : (existing?.status || 'draft');
  const language = String(input.language || 'en').slice(0, 20);
  const sourceName = String(input.sourceName || 'JEnglish').trim();
  const sourceUrl = String(input.sourceUrl || '').trim() || null;
  const copyrightNote = String(input.copyrightNote || '').trim() || null;
  const coverImageUrl = String(input.coverImageUrl || '').trim() || null;
  const tags = Array.isArray(input.tags) ? input.tags.map((x) => String(x).trim()).filter(Boolean).slice(0, 20) : [];
  const paragraphs = Array.isArray(input.paragraphs) ? input.paragraphs : [];
  if (!title) throw new Error('Title is required.');
  if (!paragraphs.length) throw new Error('At least one paragraph is required.');

  return withTransaction(async (client) => {
    const slug = await uniqueSlug(client, title, existing?.id ?? null);
    const categorySlug = normalizeSlug(input.categorySlug || input.category || 'general') || 'general';
    const categoryName = String(input.categoryName || input.category || categorySlug).trim();
    const categoryResult = await client.query(`
      INSERT INTO categories(slug, name, description)
      VALUES ($1, $2, $3)
      ON CONFLICT(slug) DO UPDATE SET name = EXCLUDED.name
      RETURNING id
    `, [categorySlug, categoryName, null]);
    const categoryId = categoryResult.rows[0].id;
    const publishedAt = status === 'published' ? (existing?.published_at || new Date().toISOString()) : null;

    let articleId;
    if (existing) {
      const result = await client.query(`
        UPDATE articles
        SET slug = $1, title = $2, subtitle = $3, excerpt = $3, category_id = $4,
            level = $5, status = $6, published_at = $7, reading_time_minutes = $8,
            language = $9, source_name = $10, source_url = $11, copyright_note = $12,
            cover_image_url = $13, updated_at = NOW()
        WHERE id = $14
        RETURNING id
      `, [slug, title, subtitle, categoryId, level, status, publishedAt, readingTime, language, sourceName, sourceUrl, copyrightNote, coverImageUrl, existing.id]);
      articleId = result.rows[0].id;
    } else {
      const result = await client.query(`
        INSERT INTO articles(
          slug, title, subtitle, excerpt, category_id, level, status, published_at,
          reading_time_minutes, language, source_name, source_url, copyright_note, cover_image_url, updated_at
        ) VALUES ($1,$2,$3,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,NOW())
        RETURNING id
      `, [slug, title, subtitle, categoryId, level, status, publishedAt, readingTime, language, sourceName, sourceUrl, copyrightNote, coverImageUrl]);
      articleId = result.rows[0].id;
    }

    const maxVersion = await client.query('SELECT COALESCE(MAX(version_number), 0) AS max_version FROM article_versions WHERE article_id = $1', [articleId]);
    const nextVersion = Number(maxVersion.rows[0].max_version) + 1;
    const snapshot = {
      slug, title, subtitle, level, readingTime, status, language,
      category: categorySlug, tags, coverImageUrl, sourceName, sourceUrl, copyrightNote, paragraphs,
    };
    const versionResult = await client.query(`
      INSERT INTO article_versions(article_id, version_number, title, subtitle, content_snapshot)
      VALUES ($1,$2,$3,$4,$5)
      RETURNING id
    `, [articleId, nextVersion, title, subtitle, JSON.stringify(snapshot)]);
    const versionId = versionResult.rows[0].id;

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx += 1) {
      const rawParagraph = paragraphs[pIdx];
      const sentences = Array.isArray(rawParagraph) ? rawParagraph : String(rawParagraph).split(/(?<=[.!?])\s+/).map((x) => x.trim()).filter(Boolean);
      const paragraphText = sentences.join(' ');
      const paragraphResult = await client.query(`
        INSERT INTO paragraphs(article_version_id, position, text)
        VALUES ($1,$2,$3) RETURNING id
      `, [versionId, pIdx, paragraphText]);
      for (let sIdx = 0; sIdx < sentences.length; sIdx += 1) {
        await client.query(`INSERT INTO sentences(paragraph_id, position, text) VALUES ($1,$2,$3)`, [paragraphResult.rows[0].id, sIdx, sentences[sIdx]]);
      }
    }

    await client.query('DELETE FROM article_tags WHERE article_id = $1', [articleId]);
    for (const tagName of tags) {
      const tagSlug = normalizeSlug(tagName);
      const tagResult = await client.query(`
        INSERT INTO tags(slug, name) VALUES ($1,$2)
        ON CONFLICT(slug) DO UPDATE SET name = EXCLUDED.name
        RETURNING id
      `, [tagSlug, tagName]);
      await client.query('INSERT INTO article_tags(article_id, tag_id) VALUES ($1,$2) ON CONFLICT DO NOTHING', [articleId, tagResult.rows[0].id]);
    }
    return { slug, articleId: String(articleId), versionId: String(versionId), version: nextVersion, status };
  });
}

export async function setArticleCoverBySlug(slug, coverImageUrl) {
  const result = await query(`
    UPDATE articles
    SET cover_image_url = $1, updated_at = NOW()
    WHERE slug = $2
    RETURNING slug
  `, [coverImageUrl, slug]);
  return result.rowCount ? getAdminArticleBySlug(slug) : null;
}

export async function publishArticle(slug) {
  const existing = await getArticleRecord(slug, { publishedOnly: false });
  if (!existing) return null;
  await query(`UPDATE articles SET status = 'published', published_at = COALESCE(published_at, NOW()), updated_at = NOW() WHERE id = $1`, [existing.id]);
  return getAdminArticleBySlug(slug);
}

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
