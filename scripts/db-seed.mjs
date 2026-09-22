import { DEMO_ARTICLES, DEMO_CATEGORIES } from '../db/seed-data.mjs';
import { closePool, withTransaction } from '../db/postgres.mjs';

function publishedAt(date) {
  return `${date}T08:00:00Z`;
}

async function main() {
  await withTransaction(async (client) => {
    const categoryIds = new Map();
    for (const category of DEMO_CATEGORIES) {
      const result = await client.query(`
        INSERT INTO categories(slug, name, description)
        VALUES ($1, $2, $3)
        ON CONFLICT(slug) DO UPDATE SET name = EXCLUDED.name, description = EXCLUDED.description
        RETURNING id
      `, [category.slug, category.name, category.description]);
      categoryIds.set(category.slug, result.rows[0].id);
    }

    for (const article of DEMO_ARTICLES) {
      const articleResult = await client.query(`
        INSERT INTO articles(
          slug, title, subtitle, excerpt, category_id, level, status,
          published_at, reading_time_minutes, language, source_name, copyright_note, cover_image_url, updated_at
        ) VALUES ($1, $2, $3, $3, $4, $5, 'published', $6, $7, 'en', 'JEnglish Demo', 'Original demo content for development and testing.', $8, NOW())
        ON CONFLICT(slug) DO UPDATE SET
          title = EXCLUDED.title,
          subtitle = EXCLUDED.subtitle,
          excerpt = EXCLUDED.excerpt,
          category_id = EXCLUDED.category_id,
          level = EXCLUDED.level,
          status = EXCLUDED.status,
          published_at = EXCLUDED.published_at,
          reading_time_minutes = EXCLUDED.reading_time_minutes,
          language = EXCLUDED.language,
          source_name = EXCLUDED.source_name,
          copyright_note = EXCLUDED.copyright_note,
          cover_image_url = EXCLUDED.cover_image_url,
          updated_at = NOW()
        RETURNING id
      `, [
        article.slug,
        article.title,
        article.dek,
        categoryIds.get(article.category),
        article.level,
        publishedAt(article.date),
        article.readingTime,
        article.coverImageUrl || null,
      ]);

      const articleId = articleResult.rows[0].id;
      await client.query('DELETE FROM article_tags WHERE article_id = $1', [articleId]);
      await client.query('DELETE FROM article_versions WHERE article_id = $1', [articleId]);

      const versionResult = await client.query(`
        INSERT INTO article_versions(article_id, version_number, title, subtitle, content_snapshot)
        VALUES ($1, 1, $2, $3, $4)
        RETURNING id
      `, [articleId, article.title, article.dek, JSON.stringify(article)]);
      const versionId = versionResult.rows[0].id;

      for (let pIdx = 0; pIdx < article.paragraphs.length; pIdx += 1) {
        const paragraph = article.paragraphs[pIdx];
        const paragraphResult = await client.query(`
          INSERT INTO paragraphs(article_version_id, position, text)
          VALUES ($1, $2, $3)
          RETURNING id
        `, [versionId, pIdx, paragraph.join(' ')]);
        const paragraphId = paragraphResult.rows[0].id;

        for (let sIdx = 0; sIdx < paragraph.length; sIdx += 1) {
          await client.query(`
            INSERT INTO sentences(paragraph_id, position, text)
            VALUES ($1, $2, $3)
          `, [paragraphId, sIdx, paragraph[sIdx]]);
        }
      }

      for (const tagName of article.tags) {
        const tagResult = await client.query(`
          INSERT INTO tags(slug, name)
          VALUES ($1, $2)
          ON CONFLICT(slug) DO UPDATE SET name = EXCLUDED.name
          RETURNING id
        `, [tagName.toLowerCase().replace(/[^a-z0-9]+/g, '-'), tagName]);
        await client.query('INSERT INTO article_tags(article_id, tag_id) VALUES ($1, $2) ON CONFLICT DO NOTHING', [articleId, tagResult.rows[0].id]);
      }
    }
  });

  console.log(`Seeded ${DEMO_ARTICLES.length} demo articles.`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => closePool());
