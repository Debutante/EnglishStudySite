import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { query, withTransaction } from '../db/postgres.mjs';

const ROOT = path.dirname(fileURLToPath(import.meta.url));
const DB_DIR = path.join(ROOT, '..', 'db');

async function main() {
  const files = (await fs.readdir(DB_DIR))
    .filter((name) => /^\d+_.+\.sql$/.test(name))
    .sort();

  if (!files.length) throw new Error('No migration files found.');

  await query(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      version TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  const applied = new Set((await query('SELECT version FROM schema_migrations')).rows.map((row) => row.version));

  for (const file of files) {
    const version = file.split('_', 1)[0];
    if (applied.has(version)) {
      console.log(`skip ${file}`);
      continue;
    }
    const sql = await fs.readFile(path.join(DB_DIR, file), 'utf8');
    await withTransaction(async (client) => {
      await client.query(sql);
      await client.query('INSERT INTO schema_migrations(version) VALUES ($1)', [version]);
    });
    console.log(`apply ${file}`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
