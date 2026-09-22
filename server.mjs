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
  getPublishedArticleBySlug,
  listPublishedArticles,
  listPublishedCategories,
} from './db/postgres.mjs';

const PORT = Number(process.env.PORT || 4173);
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

async function readJsonBody(req, maxBytes = 100_000) {
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

async function handleApi(req, res) {
  const { url, parts } = parseApiPath(req.url || '/');
  if (parts[0] !== 'api') return false;

  if (req.method === 'GET' && parts[1] === 'articles' && parts.length === 2) {
    try {
      const articles = await listPublishedArticles();
      json(res, 200, { articles }, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
    } catch (error) {
      json(res, 503, { error: error instanceof Error ? error.message : 'Database unavailable.' });
    }
    return true;
  }

  if (req.method === 'GET' && parts[1] === 'articles' && parts.length === 3) {
    const slug = decodeURIComponent(parts[2]);
    try {
      const article = await getPublishedArticleBySlug(slug);
      if (!article) return json(res, 404, { error: 'Article not found.' });
      json(res, 200, { article }, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
    } catch (error) {
      json(res, 503, { error: error instanceof Error ? error.message : 'Database unavailable.' });
    }
    return true;
  }

  if (req.method === 'GET' && parts[1] === 'categories' && parts.length === 2) {
    try {
      const categories = await listPublishedCategories();
      json(res, 200, { categories }, { 'Cache-Control': 'public, max-age=60, stale-while-revalidate=300' });
    } catch (error) {
      json(res, 503, { error: error instanceof Error ? error.message : 'Database unavailable.' });
    }
    return true;
  }

  if (req.method === 'POST' && parts[1] === 'ai' && parts.length === 2) {
    try {
      const body = await readJsonBody(req);
      normalizeAiRequest(body);
      const result = await aiResponse(body);
      json(res, 200, result);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'AI request failed.';
      const status = /required|unsupported|invalid|too large/i.test(message) ? 400 : 502;
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
      res.writeHead(405, { Allow: 'GET, HEAD, POST' });
      res.end();
      return;
    }

    const file = await serveStatic(req.url || '/');
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
  });

  process.on('SIGINT', () => server.close(() => process.exit(0)));
  process.on('SIGTERM', () => server.close(() => process.exit(0)));
}
