import test from 'node:test';
import assert from 'node:assert/strict';
import { formatArticleSummary, formatSentence, normalizeSlug } from '../db/postgres.mjs';
import { parseApiPath } from '../server.mjs';
import { normalizeAiRequest, mockAnswer } from '../server-core.mjs';

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
    coverImageUrl: '',
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


test('normalizes a full article translation request', () => {
  const request = normalizeAiRequest({
    mode: 'article_translate',
    articleId: '101',
    articleSlug: 'sample-article',
    articleText: 'Companies use software.\n\nTeams redesign workflows.',
  });
  assert.equal(request.mode, 'article_translate');
  assert.equal(request.articleSlug, 'sample-article');
  assert.match(request.articleText, /Teams redesign/);
});

test('mock article translation returns paragraph-separated Chinese output', () => {
  const result = mockAnswer({
    mode: 'article_translate',
    articleSlug: 'unknown-demo',
    articleText: 'Companies use software.\n\nTeams redesign workflows.',
  });
  assert.match(result.answer, /中文翻译/);
  assert.match(result.answer, /Teams redesign workflows/);
});

test('admin page is directly servable', async () => {
  const { serveStatic } = await import('../server-core.mjs');
  const file = await serveStatic('/admin.html');
  assert.match(file, /admin\.html$/);
});


test('auto-generates URL-safe slugs from titles, including Unicode', () => {
  assert.equal(normalizeSlug('The New Geography of Remote Work'), 'the-new-geography-of-remote-work');
  assert.equal(normalizeSlug('人工智能改变城市'), '人工智能改变城市');
});
