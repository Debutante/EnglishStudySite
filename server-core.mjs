import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const ROOT = path.dirname(fileURLToPath(import.meta.url));
export const PUBLIC_DIR = path.join(ROOT, 'public');

export const AI_MODES = new Set(['explain', 'translate', 'grammar', 'vocabulary', 'simplify', 'chat']);

const MOCKS = {
  explain: (sentence) => `この文は、${sentence.replace(/\.$/, '')} という内容を述べています。記事の流れでは、重要な主張を短くまとめた文として読むと理解しやすいです。`,
  translate: (sentence) => `【自然な日本語訳】${sentence}`,
  grammar: (sentence) => `この文では、主節の動作とその理由・結果をつなぐ表現に注目してください。まず主語と動詞を特定し、その後に修飾語句を区切って読むと構造が見えやすくなります。`,
  vocabulary: () => `重要表現\n• demand — 需要。ここでは市場や利用者からの必要量という意味。\n• expected to — ～すると予想される。\n• reshape — ～を大きく変える。`,
  simplify: (sentence) => `Simpler English: ${sentence.replace(/\b(expected to|increasingly|significantly)\b/gi, 'will').replace(/\s+/g, ' ')}`,
};

export function normalizeAiRequest(body) {
  if (!body || typeof body !== 'object') throw new Error('Invalid request body.');
  const mode = String(body.mode || '');
  if (!AI_MODES.has(mode)) throw new Error('Unsupported AI mode.');

  const articleId = typeof body.articleId === 'string' ? body.articleId.slice(0, 120) : '';
  const selectedSentence = typeof body.selectedSentence === 'string' ? body.selectedSentence.slice(0, 1600) : '';
  const paragraphContext = typeof body.paragraphContext === 'string' ? body.paragraphContext.slice(0, 4000) : '';
  const question = typeof body.question === 'string' ? body.question.slice(0, 1200) : '';

  if (!articleId) throw new Error('articleId is required.');
  if (mode !== 'chat' && !selectedSentence) throw new Error('selectedSentence is required for this action.');
  if (mode === 'chat' && !question) throw new Error('question is required.');

  return { mode, articleId, selectedSentence, paragraphContext, question };
}

export function mockAnswer(request) {
  if (request.mode === 'chat') {
    return { answer: `この記事の文脈では、「${request.question}」について、まず該当する文と前後の段落を確認するのがポイントです。選択した文があれば、その表現の意味・文法・ニュアンスまで具体的に説明できます。` };
  }
  return { answer: MOCKS[request.mode](request.selectedSentence, request.paragraphContext) };
}

export async function callOpenAI(request, env = process.env) {
  const apiKey = env.OPENAI_API_KEY;
  const model = env.OPENAI_MODEL || 'gpt-5-mini';
  if (!apiKey) throw new Error('OPENAI_API_KEY is not configured.');

  const system = `You are an English-learning tutor helping an intermediate-to-advanced Japanese-speaking learner understand authentic English articles. Use the supplied article context as the primary source. Be concise, accurate and educational. Prefer natural Japanese. Distinguish literal meaning from natural interpretation. Explain grammar only when relevant. Explain vocabulary in context. Do not invent article facts. If the article context is insufficient, say so. For vocabulary, return a short, useful list. For simplify, rewrite the selected sentence in simpler English without changing its meaning.`;
  const user = [
    `Mode: ${request.mode}`,
    `Article ID: ${request.articleId}`,
    `Selected sentence: ${request.selectedSentence || '(none)'}`,
    `Paragraph context: ${request.paragraphContext || '(none)'}`,
    `Question: ${request.question || '(none)'}`,
  ].join('\n');

  const response = await fetch('https://api.openai.com/v1/responses', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model,
      input: [
        { role: 'system', content: system },
        { role: 'user', content: user },
      ],
      max_output_tokens: 700,
    }),
    signal: AbortSignal.timeout(25000),
  });

  if (!response.ok) {
    const details = await response.text();
    throw new Error(`AI provider error (${response.status}): ${details.slice(0, 500)}`);
  }

  const data = await response.json();
  const answer = data.output_text || data.output?.map((item) => item.content?.map((part) => part.text).join('')).filter(Boolean).join('\n') || '';
  if (!answer) throw new Error('AI provider returned an empty response.');
  return { answer };
}

export async function aiResponse(body, env = process.env) {
  const request = normalizeAiRequest(body);
  const provider = env.AI_PROVIDER || 'mock';
  return provider === 'openai' ? callOpenAI(request, env) : mockAnswer(request);
}

export async function serveStatic(urlPath) {
  const clean = decodeURIComponent(urlPath.split('?')[0] || '/');
  const relative = clean === '/' ? 'index.html' : clean.replace(/^\/+/, '');
  const safe = path.normalize(relative);
  if (safe.startsWith('..')) return null;
  const file = path.join(PUBLIC_DIR, safe);
  try {
    const stat = await fs.stat(file);
    if (!stat.isFile()) return null;
    return file;
  } catch {
    return null;
  }
}
