import test from 'node:test';
import assert from 'node:assert/strict';
import { generateEditorialCoverSvg, mockAnswer, normalizeAiRequest, serveStatic } from '../server-core.mjs';

test('normalizes a valid sentence request', () => {
  const request = normalizeAiRequest({
    mode: 'explain',
    articleId: 'ai-productivity',
    selectedSentence: 'Companies once looked to new software mainly for faster execution.',
    paragraphContext: 'Companies once looked to new software mainly for faster execution.',
  });
  assert.equal(request.mode, 'explain');
  assert.equal(request.articleId, 'ai-productivity');
});

test('rejects unsupported mode', () => {
  assert.throws(() => normalizeAiRequest({ mode: 'bad', articleId: 'a', selectedSentence: 'x' }), /Unsupported AI mode/);
});

test('chat requires a question', () => {
  assert.throws(() => normalizeAiRequest({ mode: 'chat', articleId: 'a' }), /question is required/);
});

test('mock provider returns an educational answer', () => {
  const result = mockAnswer({ mode: 'explain', selectedSentence: 'Demand is rising.', paragraphContext: '', articleId: 'x' });
  assert.match(result.answer, /Demand is rising/);
});

test('static serving resolves the root page', async () => {
  const file = await serveStatic('/');
  assert.match(file, /public[\\/]index\.html$/);
});

test('static serving rejects path traversal', async () => {
  const file = await serveStatic('/../../package.json');
  assert.equal(file, null);
});


test('article translation request does not require a sentence id', () => {
  const request = normalizeAiRequest({
    mode: 'article_translate',
    articleId: '101',
    articleSlug: 'sample-article',
    selectedSentenceId: null,
    articleText: 'Companies use software.'
  });
  assert.equal(request.selectedSentenceId, '');
  assert.equal(request.mode, 'article_translate');
});


test('supports the Chinese sentence-learning action', () => {
  const request = normalizeAiRequest({ mode: 'chinese', articleId: 'a', selectedSentence: 'Demand is rising.' });
  assert.equal(request.mode, 'chinese');
  assert.match(mockAnswer(request).answer, /中文/);
});

test('generates a content-derived SVG cover', () => {
  const svg = generateEditorialCoverSvg({ title: 'The New Geography of Remote Work', subtitle: 'How flexible work is reshaping cities', category: 'Business', tags: ['remote work'] });
  assert.match(svg, /^<svg /);
  assert.match(svg, /The New Geography/);
  assert.match(svg, /REMOTE WORK|remote work/i);
});
