import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

let pool;

function loadDotEnv() {
  return fs.readFile(path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '.env'), 'utf8')
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

export async function listPublishedArticles() {
  const result = await query(`
    SELECT
      a.id,
      a.slug,
      a.title,
      a.subtitle,
      a.excerpt,
      a.level,
      a.reading_time_minutes,
      a.published_at,
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
    WHERE a.status = 'published'
    GROUP BY a.id, c.name, c.slug
    ORDER BY a.published_at DESC NULLS LAST, a.id DESC
  `);
  return result.rows.map(formatArticleSummary);
}

export async function getPublishedArticleBySlug(slug) {
  const articleResult = await query(`
    SELECT
      a.id,
      a.slug,
      a.title,
      a.subtitle,
      a.excerpt,
      a.level,
      a.reading_time_minutes,
      a.published_at,
      a.language,
      a.cover_image_url,
      a.source_name,
      a.source_url,
      a.copyright_note,
      c.name AS category_name,
      c.slug AS category_slug,
      av.id AS version_id,
      av.version_number
    FROM articles a
    JOIN categories c ON c.id = a.category_id
    JOIN LATERAL (
      SELECT id, version_number
      FROM article_versions
      WHERE article_id = a.id
      ORDER BY version_number DESC
      LIMIT 1
    ) av ON TRUE
    WHERE a.slug = $1 AND a.status = 'published'
    LIMIT 1
  `, [slug]);

  if (!articleResult.rowCount) return null;
  const articleRow = articleResult.rows[0];

  const [paragraphsResult, tagsResult] = await Promise.all([
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
    version: articleRow.version_number,
    tags: tagsResult.rows.map((row) => row.name),
    paragraphs,
  };
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

export async function closePool() {
  if (!pool) return;
  await pool.end();
  pool = undefined;
}
