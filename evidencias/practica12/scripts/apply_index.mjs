import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(pathToFileURL(path.join(process.cwd(), 'apps/api/package.json')).href);
const pg = require('pg');
const envText = fs.readFileSync(path.join(process.cwd(), '.env.practica11'), 'utf8');
const connectionString = envText.match(/^DATABASE_URL=(.*)$/m)[1].trim();
const pool = new pg.Pool({ connectionString, max: 2 });
const begin = await pool.query('EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM events WHERE "isActive" = true ORDER BY date ASC LIMIT 3');
console.log('=== ANTES ===');
console.log(begin.rows.map(r => r['QUERY PLAN']).join('\n'));

const t0 = performance.now();
await pool.query('CREATE INDEX CONCURRENTLY IF NOT EXISTS "events_isActive_date_idx" ON "events" ("isActive", "date")');
console.log(`Índice creado/verificado con CONCURRENTLY en ${(performance.now()-t0).toFixed(2)} ms`);

await pool.query('ANALYZE events');
const indexes = await pool.query(`SELECT indexname, indexdef FROM pg_indexes WHERE tablename = 'events' ORDER BY indexname`);
console.log('=== ÍNDICES ===');
for (const r of indexes.rows) console.log(`${r.indexname}: ${r.indexdef}`);
const end = await pool.query('EXPLAIN (ANALYZE, BUFFERS) SELECT * FROM events WHERE "isActive" = true ORDER BY date ASC LIMIT 3');
console.log('=== DESPUÉS ===');
console.log(end.rows.map(r => r['QUERY PLAN']).join('\n'));
const count = await pool.query('SELECT count(*)::int AS n FROM events');
console.log(`Filas en events: ${count.rows[0].n}`);
fs.writeFileSync(path.join(process.cwd(), 'evidencias/practica12/db_index_produccion.txt'),
  ['=== ANTES ===', ...begin.rows.map(r => r['QUERY PLAN']), '=== ÍNDICES ===', ...indexes.rows.map(r => r.indexdef), '=== DESPUÉS ===', ...end.rows.map(r => r['QUERY PLAN']), `Filas: ${count.rows[0].n}`].join('\n'));
await pool.end();
