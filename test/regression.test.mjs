import test from 'node:test';
import assert from 'node:assert/strict';
import { draftToPayload, slugify, splitContent, emptyDraft } from '../public/admin-model.mjs';
import { generateEditorialCoverSvg, mockAnswer, normalizeAiRequest } from '../server-core.mjs';
import { normalizeSlug } from '../db/postgres.mjs';
import fs from 'node:fs/promises';

const modes = ['explain','chinese','translate','grammar','vocabulary','simplify'];

test('CMS draft with a complete title/body serializes without losing the title', () => {
  const draft = emptyDraft();
  draft.title = 'The New Geography of Remote Work';
  draft.dek = 'How flexible working is changing cities';
  draft.category = 'Technology';
  draft.status = 'draft';
  draft.paragraphs = splitContent('Remote work is changing cities. It is also changing where people choose to live.\n\nCompanies are redesigning offices.');
  const payload = draftToPayload(draft);
  assert.equal(payload.title, 'The New Geography of Remote Work');
  assert.equal(payload.slug, 'the-new-geography-of-remote-work');
  assert.equal(payload.status, 'draft');
  assert.equal(payload.paragraphs.length, 2);
});

test('CMS Other category is serialized as the entered category', () => {
  const payload = draftToPayload({ ...emptyDraft(), title: 'Test', category: 'Urban Mobility', paragraphs: [['A sentence.']] });
  assert.equal(payload.category, 'Urban Mobility');
  assert.equal(payload.categorySlug, 'urban-mobility');
});

test('slug is always generated from title', () => {
  assert.equal(slugify('The New Geography of Remote Work'), 'the-new-geography-of-remote-work');
  assert.equal(normalizeSlug('The New Geography of Remote Work'), 'the-new-geography-of-remote-work');
  assert.equal(slugify('人工智能改变城市'), '人工智能改变城市');
});

test('generated cover changes when article content changes', () => {
  const a = generateEditorialCoverSvg({ title:'Test article', subtitle:'', category:'Technology', tags:[], content:'Artificial intelligence changes software teams and productivity.' });
  const b = generateEditorialCoverSvg({ title:'Test article', subtitle:'', category:'Technology', tags:[], content:'Electricity demand changes energy markets and grid investment.' });
  assert.notEqual(a, b);
  assert.match(a, /artificial|productivity/i);
  assert.match(b, /electricity|energy|demand/i);
});

test('every sentence AI action produces a non-empty result in mock mode', () => {
  for (const mode of modes) {
    const request = normalizeAiRequest({ mode, articleId:'101', selectedSentence:'Demand is rising.', paragraphContext:'Demand is rising.' });
    const result = mockAnswer(request);
    assert.equal(typeof result.answer, 'string');
    assert.ok(result.answer.trim().length > 0, mode);
  }
});

test('article translation mock always returns Chinese-mode feedback instead of the original article unchanged', () => {
  const request = normalizeAiRequest({ mode:'article_translate', articleId:'101', articleSlug:'unknown', articleText:'Teams redesign workflows.' });
  const result = mockAnswer(request);
  assert.match(result.answer, /模拟 AI 模式/);
  assert.doesNotMatch(result.answer, /^【中文翻译】Teams redesign workflows\.$/);
});

test('reader source has no Japanese labels and uses the translated UI keys', async () => {
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /日本語|日語|日文/);
  assert.doesNotMatch(source, />TE WEEKLY<|>SAVED</);
  for (const key of ['thisWeek','previous','explain','chinese','translate','grammar','vocabulary','simplify','readMin','editorial']) {
    assert.match(source, new RegExp(`\\b${key}:`));
  }
});

test('speech UI contains a moving thumb tied to speech progress', async () => {
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /audio-progress-thumb/);
  assert.match(source, /requestAnimationFrame\(updateSpeechProgress\)/);
  assert.match(source, /thumb\.style\.left/);
  assert.match(source, /speechResumeChar/);
  assert.match(source, /speakSelectedFromOffset/);
  assert.doesNotMatch(source, /speechSynthesis\.pause\(\)/);
});


test('translation cache SQL explicitly casts nullable sentence ids', async () => {
  const source = await fs.readFile(new URL('../db/postgres.mjs', import.meta.url), 'utf8');
  assert.match(source, /COALESCE\(\$2::BIGINT, 0\)/);
  assert.match(source, /\$3::BIGINT/);
});

test('AI close control is wired to the close state transition', async () => {
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /document\.querySelectorAll\('\[data-close-ai\]'\)\.forEach\(btn => btn\.addEventListener\('click', closeDrawer\)\)/);
  assert.match(source, /function closeDrawer\(\)\s*\{\s*state\.drawerOpen = false;/);
});

test('language switch controls both UI language and article content language', async () => {
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /state\.contentLanguage = target;/);
  assert.match(source, /state\.uiLanguage = target;/);
  assert.match(source, /localStorage\.setItem\('jenglish-ui-language', target\)/);
  assert.match(source, /data-language="zh">中文/);
  assert.match(source, /data-language="en">EN/);
});

test('all six AI buttons call the shared AI action runner', async () => {
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  for (const mode of modes) assert.match(source, new RegExp(`\\['${mode}'`));
  assert.match(source, /data-ai-action="\$\{mode\}"/);
  assert.match(source, /runAi\(btn\.dataset\.aiAction\)/);
});

test('previous article cascade is rendered from similar article thumbnails', async () => {
  const source = await fs.readFile(new URL('../public/app.js', import.meta.url), 'utf8');
  assert.match(source, /state\.previousOpen/);
  assert.match(source, /previous-cascade/);
  assert.match(source, /coverImageUrl/);
  assert.match(source, /similarArticles\(\)/);
});


test('speech progress uses a white circular dot and visible filled track', async () => {
  const css = await fs.readFile(new URL('../public/styles.css', import.meta.url), 'utf8');
  assert.match(css, /background:#fff/);
  assert.match(css, /border-radius:50%/);
  assert.match(css, /width:20px/);
  assert.match(css, /height:20px/);
  assert.match(css, /background:#fff/);
  assert.match(css, /border:0/);
  assert.match(css, /\.audio-progress-thumb/);
  assert.match(css, /\.audio-progress \{[^}]*background:var\(--accent\)/s);
});
