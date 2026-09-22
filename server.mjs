import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import {
  aiResponse,
  serveStatic,
  normalizeAiRequest,
} from './server-core.mjs';
import {
  getCachedAiGeneration,
  getPublishedArticleBySlug,
  getAdminArticleBySlug,
  listPublishedArticles,
  listAdminArticles,
  listPublishedCategories,
  listCategories,
  createArticle,
  updateArticleBySlug,
  publishArticle,
  upsertAiGeneration,
} from './db/postgres.mjs';

const PORT = Number(process.env.PORT || 4173);

async function loadDotEnv() {
  if (process.env.ADMIN_KEY !== undefined) return;
  try {
    const text = await fs.readFile(path.join(process.cwd(), '.env'), 'utf8');
    for (const line of text.split(/\r?\n/)) {
      const match = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!match || process.env[match[1]] !== undefined) continue;
      process.env[match[1]] = match[2].replace(/^['"]|['"]$/g, '');
    }
  } catch {
    // The database module has its own .env loader.
  }
}

await loadDotEnv();
const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

function json(res, status, payload, headers = {}) {
  res.writeHead(status, {
    'Content-Type': 'application/json; charset=utf-8',
    'Cache-Control': 'no-store',
    ...headers,
  });
  res.end(JSON.stringify(payload));
}

async function readJsonBody(req, maxBytes = 200_000) {
  let raw = '';
  for await (const chunk of req) {
    raw += chunk;
    if (raw.length > maxBytes) throw new Error('Request body too large.');
  }
  try {
    return JSON.parse(raw || '{}');
  } catch {
    throw new Error('Invalid JSON.');
  }
}

export function parseApiPath(urlValue) {
  const url = new URL(urlValue, 'http://localhost');
  const parts = url.pathname.split('/').filter(Boolean);
  return { url, parts };
}

function getAdminKey(req) {
  const header = req.headers.authorization || '';
  if (header.toLowerCase().startsWith('bearer ')) return header.slice(7).trim();
  return String(req.headers['x-admin-key'] || '').trim();
}

function requireAdmin(req, res) {
  const expected = process.env.ADMIN_KEY;
  if (!expected) {
    json(res, 503, { error: 'ADMIN_KEY is not configured.' });
    return false;
  }
  if (!getAdminKey(req) || getAdminKey(req) !== expected) {
    json(res, 401, { error: 'Admin authentication required.' });
    return false;
  }
  return true;
}

function articleToText(article) {
  return article.paragraphs.map((paragraph) => paragraph.sentences.map((sentence) => sentence.text).join(' ')).join('\n\n');
}

async function runAiAndCache({ request, article, sentenceId = null }) {
  const language = request.mode === 'article_translate' || request.mode !== 'simplify' ? 'zh-CN' : 'en';
  const kind = request.mode;
  if (kind !== 'chat') {
    const cached = await getCachedAiGeneration({
      articleVersionId: article.versionId,
      sentenceId,
      kind,
      language,
      promptVersion: 'v1',
    });
    if (cached) return { answer: cached.content, cached: true };
  }

  const result = await aiResponse({
    ...request,
    articleId: article.id,
    articleSlug: article.slug,
    articleText: request.articleText || articleToText(article),
  });

  if (kind !== 'chat') {
    await upsertAiGeneration({
      articleId: article.id,
      articleVersionId: article.versionId,
      sentenceId,
      kind,
      language,
      model: process.env.AI_PROVIDER === 'openai' ? (process.env.OPENAI_MODEL || 'gpt-5-mini') : 'mock',
      promptVersion: 'v1',
      content: result.answer,
    });
  }
  return result;
}

async function handleAi(req, res) {
  const body = await readJsonBody(req);
  const normalized = normalizeAiRequest(body);
  let article = null;
  if (normalized.articleSlug) article = await getPublishedArticleBySlug(normalized.articleSlug);
  if (!article && normalized.articleId) {
    const summaries = await listPublishedArticles();
    const found = summaries.find((item) => String(item.id) === String(normalized.articleId));
    if (found) article = await getPublishedArticleBySlug(found.slug);
  }
  if (!article) return json(res, 404, { error: 'Published article not found.' });
  if (normalized.mode === 'article_translate') normalized.articleText = articleToText(article);

  const sentenceId = normalized.selectedSentenceId || null;
  const result = await runAiAndCache({ request: normalized, article, sentenceId });
  json(res, 200, result, { 'Cache-Control': 'private, max-age=60' });
}

async function handleAdmin(req, res, parts, url) {
  if (!requireAdmin(req, res)) return true;

  if (req.method === 'GET' && parts[1] === 'admin' && parts[2] === 'articles' && parts.length === 3) {
    const status = url.searchParams.get('status') || '';
    return json(res, 200, { articles: await listAdminArticles({ status }) });
  }

  if (req.method === 'GET' && parts[1] === 'admin' && parts[2] === 'categories' && parts.length === 3) {
    return json(res, 200, { categories: await listCategories() });
  }

  if (parts[1] === 'admin' && parts[2] === 'articles' && parts[3] && !['publish', 'generate'].includes(parts[3])) {
    const slug = decodeURIComponent(parts[3]);
    if (req.method === 'GET' && parts.length === 4) {
      const article = await getAdminArticleBySlug(slug);
      if (!article) return json(res, 404, { error: 'Article not found.' });
      return json(res, 200, { article });
    }

    if (req.method === 'PATCH' && parts.length === 4) {
      const body = await readJsonBody(req);
      const result = await updateArticleBySlug(slug, body);
      if (!result) return json(res, 404, { error: 'Article not found.' });
      const article = await getAdminArticleBySlug(result.slug);
      return json(res, 200, { article });
    }

    if (req.method === 'POST' && parts[4] === 'publish' && parts.length === 5) {
      const article = await publishArticle(slug);
      if (!article) return json(res, 404, { error: 'Article not found.' });
      return json(res, 200, { article });
    }

    if (req.method === 'POST' && parts[4] === 'generate' && parts.length === 5) {
      const body = await readJsonBody(req);
      const article = await getAdminArticleBySlug(slug);
      if (!article) return json(res, 404, { error: 'Article not found.' });
      const kind = String(body.kind || 'article_translate');
      const allowed = new Set(['article_translate', 'explain', 'translate', 'grammar', 'vocabulary', 'simplify', 'sentence_pack']);
      if (!allowed.has(kind)) return json(res, 400, { error: 'Unsupported generation type.' });

      if (kind === 'article_translate') {
        const result = await runAiAndCache({
          request: normalizeAiRequest({ mode: 'article_translate', articleId: article.id, articleSlug: article.slug, articleText: articleToText(article) }),
          article,
        });
        return json(res, 200, { kind, generated: 1, answer: result.answer, cached: result.cached || false });
      }

      if (kind === 'sentence_pack') {
        let generated = 0;
        for (const paragraph of article.paragraphs) {
          for (const sentence of paragraph.sentences) {
            for (const mode of ['explain', 'translate', 'grammar', 'vocabulary', 'simplify']) {
              const request = normalizeAiRequest({
                mode,
                articleId: article.id,
                articleSlug: article.slug,
                selectedSentenceId: String(sentence.id),
                selectedSentence: sentence.text,
                paragraphContext: paragraph.sentences.map((x) => x.text).join(' '),
              });
              await runAiAndCache({ request, article, sentenceId: String(sentence.id) });
              generated += 1;
            }
          }
        }
        return json(res, 200, { kind, generated });
      }

      const sentenceId = String(body.sentenceId || '');
      if (!sentenceId) return json(res, 400, { error: 'sentenceId is required for this generation.' });
      const selected = article.paragraphs.flatMap((p) => p.sentences.map((s) => ({ s, p }))).find(({ s }) => String(s.id) === sentenceId);
      if (!selected) return json(res, 404, { error: 'Sentence not found in this article.' });
      const request = normalizeAiRequest({
        mode: kind,
        articleId: article.id,
        articleSlug: article.slug,
        selectedSentenceId: sentenceId,
        selectedSentence: selected.s.text,
        paragraphContext: selected.p.sentences.map((x) => x.text).join(' '),
      });
      const result = await runAiAndCache({ request, article, sentenceId });
      return json(res, 200, { kind, generated: 1, answer: result.answer, cached: result.cached || false });
    }
  }

  if (req.method === 'POST' && parts[1] === 'admin' && parts[2] === 'articles' && parts.length === 3) {
    const body = await readJsonBody(req);
    const result = await createArticle(body);
    const article = await getAdminArticleBySlug(result.slug);
    return json(res, 201, { article });
  }

  if (req.method === 'POST' && parts[1] === 'admin' && parts[2] === 'articles' && parts[3] === 'publish' && parts.length === 4) {
    return json(res, 400, { error: 'Save the draft before publishing it.' });
  }

  return json(res, 404, { error: 'Admin endpoint not found.' });
}

async function handleApi(req, res) {
  const { url, parts } = parseApiPath(req.url || '/');
  if (parts[0] !== 'api') return false;

  if (parts[1] === 'admin') {
    await handleAdmin(req, res, parts, url);
    return true;
  }

  if (req.method === 'GET' && parts[1] === 'articles' && parts.length === 2) {
    try {
      const articles = await listPublishedArticles();
      return json(res, 200, { articles }, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
    } catch (error) {
      return json(res, 503, { error: error instanceof Error ? error.message : 'Database unavailable.' });
    }
  }

  if (req.method === 'GET' && parts[1] === 'articles' && parts.length === 3) {
    const slug = decodeURIComponent(parts[2]);
    try {
      const article = await getPublishedArticleBySlug(slug);
      if (!article) return json(res, 404, { error: 'Article not found.' });
      return json(res, 200, { article }, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
    } catch (error) {
      return json(res, 503, { error: error instanceof Error ? error.message : 'Database unavailable.' });
    }
  }

  if (req.method === 'GET' && parts[1] === 'categories' && parts.length === 2) {
    try {
      const categories = await listPublishedCategories();
      return json(res, 200, { categories }, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
    } catch (error) {
      return json(res, 503, { error: error instanceof Error ? error.message : 'Database unavailable.' });
    }
  }

  if (req.method === 'POST' && parts[1] === 'ai' && parts.length === 2) {
    try {
      await handleAi(req, res);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI request failed.';
      const status = /required|unsupported|invalid|too large|not found/i.test(message) ? 400 : 502;
      json(res, status, { error: message });
    }
    return true;
  }

  json(res, 404, { error: 'API endpoint not found.' });
  return true;
}

export const server = http.createServer(async (req, res) => {
  try {
    if ((req.url || '').startsWith('/api/')) {
      await handleApi(req, res);
      return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
      res.writeHead(405, { Allow: 'GET, HEAD, POST, PATCH' });
      res.end();
      return;
    }

    const requestPath = new URL(req.url || '/', 'http://localhost').pathname;
    const staticPath = requestPath === '/admin' || requestPath === '/admin/' ? '/admin.html' : requestPath;
    const file = await serveStatic(staticPath);
    if (!file) {
      const fallback = await serveStatic('/index.html');
      res.writeHead(200, { 'Content-Type': MIME['.html'] });
      if (req.method === 'HEAD') return res.end();
      res.end(await fs.readFile(fallback));
      return;
    }

    const ext = path.extname(file).toLowerCase();
    const content = await fs.readFile(file);
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    if (req.method === 'HEAD') return res.end();
    res.end(content);
  } catch (error) {
    json(res, 500, { error: error instanceof Error ? error.message : 'Server error.' });
  }
});

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  server.listen(PORT, () => {
    console.log(`JEnglish TE AI Reader: http://localhost:${PORT}/ai/te`);
    console.log(`JEnglish Admin CMS: http://localhost:${PORT}/admin`);
  });

  process.on('SIGINT', () => server.close(() => process.exit(0)));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
