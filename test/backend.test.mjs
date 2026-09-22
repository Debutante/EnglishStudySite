import test from 'node:test';
import assert from 'node:assert/strict';
import { formatArticleSummary, formatSentence } from '../db/postgres.mjs';
import { parseApiPath } from '../server.mjs';

const sampleArticleRow = {
  id: 101,
  slug: 'sample-article',
  title: 'Sample article',
  subtitle: 'A useful subtitle',
  excerpt: 'A short excerpt',
  category_name: 'Technology',
  category_slug: 'technology',
  published_at: '2026-09-18T08:00:00.000Z',
  level: 'Upper intermediate',
  reading_time_minutes: 5,
  tags: ['AI', 'work'],
};

test('maps database article rows to public API summaries', () => {
  const article = formatArticleSummary(sampleArticleRow);
  assert.deepEqual(article, {
    id: '101',
    slug: 'sample-article',
    title: 'Sample article',
    dek: 'A useful subtitle',
    excerpt: 'A short excerpt',
    category: 'Technology',
    categorySlug: 'technology',
    date: '2026-09-18T08:00:00.000Z',
    level: 'Upper intermediate',
    readingTime: 5,
    tags: ['AI', 'work'],
  });
});

test('maps sentence rows without exposing database-specific fields', () => {
  assert.deepEqual(formatSentence({
    id: 200,
    position: 1,
    text: 'Hello.',
    audio_url: null,
    audio_duration_ms: null,
  }), {
    id: '200',
    position: 1,
    text: 'Hello.',
    audioUrl: null,
    audioDurationMs: null,
  });
});

test('parses article API paths safely', () => {
  const result = parseApiPath('/api/articles/sample-article?lang=en');
  assert.deepEqual(result.parts, ['api', 'articles', 'sample-article']);
  assert.equal(result.url.searchParams.get('lang'), 'en');
});
