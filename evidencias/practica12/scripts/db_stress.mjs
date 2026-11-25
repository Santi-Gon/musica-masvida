/**
 * Práctica 12 — Pruebas avanzadas de base de datos y comparación antes/después.
 *
 * Crea un esquema aislado `p12_bench` (no toca las tablas de producción),
 * replica la estructura de `events`, carga 50 000 filas y mide:
 *   - consulta por id, conjunto pequeño, conjunto grande, filtros
 *   - consultas repetidas
 *   - concurrencia (incremento atómico, lost updates, UNIQUE, bloqueos)
 *   - EXPLAIN (ANALYZE, BUFFERS) antes y después de crear índices
 *
 * Uso: node evidencias/practica12/scripts/db_stress.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(pathToFileURL(path.join(process.cwd(), 'apps/api/package.json')).href);
const pg = require('pg');

const OUT_DIR = path.join(process.cwd(), 'evidencias', 'practica12');
const envText = fs.readFileSync(path.join(process.cwd(), '.env.practica11'), 'utf8');
const connectionString = envText.match(/^DATABASE_URL=(.*)$/m)[1].trim();

const pool = new pg.Pool({ connectionString, max: 30, connectionTimeoutMillis: 30000 });
const log = [];
const result = { fecha: new Date().toISOString(), host: new URL(connectionString).host, filas: 50000, antes: {}, despues: {}, concurrencia: {} };

function say(line = '') { console.log(line); log.push(line); }
const r2 = (n) => +Number(n).toFixed(2);
const delay = (ms) => new Promise((res) => setTimeout(res, ms));

async function bench(label, sql, params = [], runs = 5) {
  const times = [];
  let rows = 0;
  let last = null;
  for (let i = 0; i < runs; i++) {
    const t0 = performance.now();
    const r = await pool.query(sql, params);
    times.push(performance.now() - t0);
    rows = r.rowCount ?? r.rows.length;
    last = r;
  }
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const bytes = Buffer.byteLength(JSON.stringify(last.rows));
  const out = {
    runs,
    min: r2(Math.min(...times)),
    avg: r2(avg),
    max: r2(Math.max(...times)),
    filas: rows,
    bytes,
    kbps: r2((bytes * 8) / (avg / 1000) / 1000),
  };
  say(`[${label}] avg=${out.avg} ms · min=${out.min} · max=${out.max} · filas=${rows} · ${bytes} bytes`);
  return out;
}

async function explain(label, sql, params = []) {
  const r = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${sql}`, params);
  const plan = r.rows.map((x) => x['QUERY PLAN']).join('\n');
  say(`\n--- EXPLAIN ${label} ---\n${plan}`);
  return plan;
}

async function setup() {
  say('=== PRÁCTICA 12 · BASE DE DATOS ===');
  say(`Fecha: ${result.fecha}`);
  say(`Host: ${result.host}`);

  await pool.query('DROP SCHEMA IF EXISTS p12_bench CASCADE');
  await pool.query('CREATE SCHEMA p12_bench');
  await pool.query('CREATE TABLE p12_bench.events_bench (LIKE public.events INCLUDING ALL)');
  await pool.query('ALTER TABLE p12_bench.events_bench ADD COLUMN counter integer NOT NULL DEFAULT 0');
  await pool.query('ALTER TABLE p12_bench.events_bench ADD COLUMN counter2 integer NOT NULL DEFAULT 0');
  await pool.query(`
    CREATE TABLE p12_bench.registrations_bench (
      id text PRIMARY KEY,
      "eventId" text NOT NULL,
      "userId" text NOT NULL,
      UNIQUE ("eventId", "userId")
    )`);

  const seed = await pool.query(`
    INSERT INTO p12_bench.events_bench
      (id, title, description, date, time, location, "imageUrl", "isActive", capacity, "createdAt", "updatedAt")
    SELECT
      'bench-' || lpad(g::text, 6, '0'),
      'Evento de prueba ' || g,
      repeat('descripcion ', 12) || g,
      now() + ((g - 25000) * interval '10 minutes'),
      lpad((g % 24)::text, 2, '0') || ':' || lpad((g % 60)::text, 2, '0'),
      CASE WHEN g % 7 = 0 THEN 'Auditorio Principal' ELSE 'Aula ' || (g % 20) END,
      NULL,
      (g % 10 <> 0),
      50,
      now() - (g * interval '1 minute'),
      now() - (g * interval '1 minute')
    FROM generate_series(1, 50000) AS g`);
  await pool.query('ANALYZE p12_bench.events_bench');
  say(`Semilla: ${seed.rowCount} filas insertadas en p12_bench.events_bench`);
}

async function before() {
  say('\n===== MEDICIONES ANTES (sin índices adicionales) =====');
  const q1sql = `SELECT * FROM p12_bench.events_bench WHERE id = $1`;
  const q2sql = `SELECT * FROM p12_bench.events_bench WHERE "isActive" = true ORDER BY date ASC LIMIT 100`;
  const q3sql = `SELECT * FROM p12_bench.events_bench ORDER BY date ASC LIMIT 20000`;
  const q3psql = `SELECT id, title, date, time, location, capacity FROM p12_bench.events_bench ORDER BY date ASC LIMIT 20000`;
  const q4sql = `SELECT id, title, date FROM p12_bench.events_bench
                 WHERE "isActive" = true AND date >= now() AND date < now() + interval '30 days'
                 ORDER BY date ASC LIMIT 1000`;

  result.antes.q1_id = await bench('Q1 individual por id', q1sql, ['bench-025000'], 10);
  result.antes.q2_pequeno = await bench('Q2 conjunto pequeño (100)', q2sql, [], 5);
  result.antes.q3_grande = await bench('Q3 conjunto grande (20 000, SELECT *)', q3sql, [], 3);
  result.antes.q3_proyeccion = await bench('Q3b conjunto grande (20 000, solo campos)', q3psql, [], 3);
  result.antes.q4_filtro = await bench('Q4 filtro por activo + rango de fecha', q4sql, [], 5);

  // Consultas repetidas innecesariamente: 50 consultas por id
  const t0 = performance.now();
  for (let i = 0; i < 50; i++) await pool.query(q1sql, ['bench-025000']);
  result.antes.q5_repetidas = { consultas: 50, totalMs: r2(performance.now() - t0) };
  say(`[Q5] 50 consultas repetidas por id: ${result.antes.q5_repetidas.totalMs} ms total`);

  result.antes.plan_q2 = await explain('Q2 antes', q2sql);
  result.antes.plan_q3 = await explain('Q3 antes', q3sql);
  result.antes.plan_q4 = await explain('Q4 antes', q4sql);
}

async function after() {
  say('\n===== OPTIMIZACIÓN: ÍNDICES =====');
  const t0 = performance.now();
  await pool.query('CREATE INDEX events_bench_active_date_idx ON p12_bench.events_bench ("isActive", date)');
  await pool.query('CREATE INDEX events_bench_date_idx ON p12_bench.events_bench (date)');
  await pool.query('ANALYZE p12_bench.events_bench');
  result.optimizacion = { indices: ['events_bench_active_date_idx ("isActive", date)', 'events_bench_date_idx (date)'], creacionMs: r2(performance.now() - t0) };
  say(`Índices creados en ${result.optimizacion.creacionMs} ms`);

  say('\n===== MEDICIONES DESPUÉS =====');
  const q1sql = `SELECT * FROM p12_bench.events_bench WHERE id = $1`;
  const q2sql = `SELECT * FROM p12_bench.events_bench WHERE "isActive" = true ORDER BY date ASC LIMIT 100`;
  const q3sql = `SELECT * FROM p12_bench.events_bench ORDER BY date ASC LIMIT 20000`;
  const q3psql = `SELECT id, title, date, time, location, capacity FROM p12_bench.events_bench ORDER BY date ASC LIMIT 20000`;
  const q4sql = `SELECT id, title, date FROM p12_bench.events_bench
                 WHERE "isActive" = true AND date >= now() AND date < now() + interval '30 days'
                 ORDER BY date ASC LIMIT 1000`;

  result.despues.q1_id = await bench('Q1 individual por id', q1sql, ['bench-025000'], 10);
  result.despues.q2_pequeno = await bench('Q2 conjunto pequeño (100)', q2sql, [], 5);
  result.despues.q3_grande = await bench('Q3 conjunto grande (20 000, SELECT *)', q3sql, [], 3);
  result.despues.q3_proyeccion = await bench('Q3b conjunto grande (20 000, solo campos)', q3psql, [], 3);
  result.despues.q4_filtro = await bench('Q4 filtro por activo + rango de fecha', q4sql, [], 5);

  const t1 = performance.now();
  for (let i = 0; i < 50; i++) await pool.query(q1sql, ['bench-025000']);
  result.despues.q5_repetidas = { consultas: 50, totalMs: r2(performance.now() - t1) };
  say(`[Q5] 50 consultas repetidas por id: ${result.despues.q5_repetidas.totalMs} ms total`);

  result.despues.plan_q2 = await explain('Q2 después', q2sql);
  result.despues.plan_q3 = await explain('Q3 después', q3sql);
  result.despues.plan_q4 = await explain('Q4 después', q4sql);
}

async function concurrency() {
  say('\n===== CONCURRENCIA =====');

  // 1) Incremento atómico: 20 clientes × 5 updates sobre la misma fila
  const id = 'bench-025000';
  await pool.query('UPDATE p12_bench.events_bench SET counter = 0, counter2 = 0 WHERE id = $1', [id]);
  const t0 = performance.now();
  await Promise.all(
    Array.from({ length: 20 }, async () => {
      for (let i = 0; i < 5; i++) {
        await pool.query('UPDATE p12_bench.events_bench SET counter = counter + 1 WHERE id = $1', [id]);
      }
    }),
  );
  const atomicMs = r2(performance.now() - t0);
  const counter = (await pool.query('SELECT counter FROM p12_bench.events_bench WHERE id = $1', [id])).rows[0].counter;
  result.concurrencia.atomic = { clientes: 20, updates: 100, totalMs: atomicMs, contadorFinal: counter, esperado: 100, correcto: counter === 100 };
  say(`[CONC-1] 100 incrementos atómicos concurrentes: ${atomicMs} ms, contador=${counter} (esperado 100)`);

  // 2) Read-modify-write sin bloqueo: 20 clientes × 5 iteraciones
  const t1 = performance.now();
  await Promise.all(
    Array.from({ length: 20 }, async () => {
      for (let i = 0; i < 5; i++) {
        const current = (await pool.query('SELECT counter2 FROM p12_bench.events_bench WHERE id = $1', [id])).rows[0].counter2;
        await delay(1);
        await pool.query('UPDATE p12_bench.events_bench SET counter2 = $1 WHERE id = $2', [current + 1, id]);
      }
    }),
  );
  const lostMs = r2(performance.now() - t1);
  const counter2 = (await pool.query('SELECT counter2 FROM p12_bench.events_bench WHERE id = $1', [id])).rows[0].counter2;
  result.concurrencia.lost_update = { clientes: 20, updates: 100, totalMs: lostMs, contadorFinal: counter2, esperado: 100, perdidas: 100 - counter2 };
  say(`[CONC-2] read-modify-write concurrente: ${lostMs} ms, contador=${counter2}, actualizaciones perdidas=${100 - counter2}`);

  // 3) Bloqueo de fila controlado: una transacción retiene el lock 1 s
  const locker = await pool.connect();
  let lockWaitMs = 0;
  try {
    await locker.query('BEGIN');
    await locker.query('UPDATE p12_bench.events_bench SET title = title WHERE id = $1', [id]);
    const t2 = performance.now();
    const waiter = pool.query('UPDATE p12_bench.events_bench SET title = title || \' \' WHERE id = $1', [id]);
    await delay(150);
    const locks = await pool.query(`SELECT count(*)::int AS no_otorgados FROM pg_locks WHERE NOT granted`);
    await delay(850);
    await locker.query('COMMIT');
    await waiter;
    lockWaitMs = r2(performance.now() - t2);
    result.concurrencia.lock = { esperaMs: lockWaitMs, locksNoOtorgados: locks.rows[0].no_otorgados, bloqueoDetectado: lockWaitMs > 500 };
    say(`[CONC-3] espera por bloqueo de fila: ${lockWaitMs} ms, locks no otorgados observados=${locks.rows[0].no_otorgados}`);
  } finally {
    locker.release();
  }

  // 4) Escrituras simultáneas con UNIQUE
  const eventId = 'race-event';
  const outcomes = await Promise.allSettled(
    Array.from({ length: 20 }, (_, i) =>
      pool.query('INSERT INTO p12_bench.registrations_bench (id, "eventId", "userId") VALUES ($1,$2,$3)', [`race-${i}`, eventId, 'race-user']),
    ),
  );
  const codes = outcomes.map((o) => (o.status === 'fulfilled' ? 'OK' : o.reason?.code || 'ERR'));
  const ok = codes.filter((c) => c === 'OK').length;
  const dup = codes.filter((c) => c === '23505').length;
  result.concurrencia.unique = { intentos: 20, insertados: ok, conflictos: dup, codigos: codes, correcto: ok === 1 && dup === 19 };
  say(`[CONC-4] 20 inserciones simultáneas del mismo par: ${ok} OK, ${dup} conflictos 23505`);

  // 5) Integridad final
  const total = (await pool.query('SELECT count(*)::int AS n FROM p12_bench.events_bench')).rows[0].n;
  result.concurrencia.integridad = { filasTotales: total, filasEsperadas: 50000, correcto: total === 50000 };
  say(`[INTEGRIDAD] filas totales=${total} (esperado 50000)`);
}

try {
  await setup();
  await before();
  await after();
  await concurrency();

  const pct = (a, b) => (b === 0 ? 0 : r2(((a - b) / b) * 100));
  result.comparativa = {
    q2_ms: { antes: result.antes.q2_pequeno.avg, despues: result.despues.q2_pequeno.avg, mejoraPct: pct(result.antes.q2_pequeno.avg, result.despues.q2_pequeno.avg) },
    q3_ms: { antes: result.antes.q3_grande.avg, despues: result.despues.q3_grande.avg, mejoraPct: pct(result.antes.q3_grande.avg, result.despues.q3_grande.avg) },
    q3_bytes: { antes: result.antes.q3_grande.bytes, despues: result.despues.q3_proyeccion.bytes },
    q4_ms: { antes: result.antes.q4_filtro.avg, despues: result.despues.q4_filtro.avg, mejoraPct: pct(result.antes.q4_filtro.avg, result.despues.q4_filtro.avg) },
  };
} catch (e) {
  result.fatal = { message: e.message, stack: e.stack };
  say(`ERROR FATAL: ${e.message}`);
} finally {
  try {
    await pool.query('DROP SCHEMA IF EXISTS p12_bench CASCADE');
    say('\nEsquema p12_bench eliminado (limpieza).');
  } catch (e) {
    say(`ERROR limpiando: ${e.message}`);
  }
  await pool.end();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'db_stress.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'db_stress.log'), log.join('\n'));
  say('Evidencia: evidencias/practica12/db_stress.json');
}
