/**
 * Práctica 11 - Pruebas White Box de base de datos.
 * Ejecuta CRUD, integridad, transacciones, concurrencia, tiempos y EXPLAIN ANALYZE
 * contra PostgreSQL (Neon). Limpia todos los datos creados.
 *
 * Uso (desde la raíz del repo): node evidencias/practica11/scripts/db_whitebox.mjs
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';

const require = createRequire(pathToFileURL(path.join(process.cwd(), 'apps/api/package.json')).href);
const pg = require('pg');

const OUT_DIR = path.join(process.cwd(), 'evidencias', 'practica11');
const envText = fs.readFileSync(path.join(process.cwd(), '.env.practica11'), 'utf8');
const connectionString = envText.match(/^DATABASE_URL=(.*)$/m)[1].trim();

const pool = new pg.Pool({ connectionString, max: 5, connectionTimeoutMillis: 20000 });
const log = [];
const result = {
  fecha: new Date().toISOString(),
  host: new URL(connectionString).host,
  pruebas: {},
  errores: [],
};
function say(line = '') {
  console.log(line);
  log.push(line);
}
function errorCode(e) {
  return e && e.code ? e.code : e && e.name ? e.name : 'DESCONOCIDO';
}
async function queryRun(sql, params = []) {
  const t0 = performance.now();
  const r = await pool.query(sql, params);
  return { ms: +(performance.now() - t0).toFixed(2), rows: r.rows, rowCount: r.rowCount };
}
async function expectFail(label, sql, params, expectedCodes) {
  try {
    await pool.query(sql, params);
    result.errores.push({ prueba: label, esperado: expectedCodes, observado: 'operacion ACEPTADA (no debía)' });
    say(`[FALLO] ${label}: la operación fue aceptada cuando debía fallar (${expectedCodes})`);
    return { ok: false, code: 'NINGUNO' };
  } catch (e) {
    const code = errorCode(e);
    const ok = expectedCodes.includes(code);
    if (!ok) result.errores.push({ prueba: label, esperado: expectedCodes, observado: code });
    say(`[${ok ? 'OK' : 'REVISAR'}] ${label}: error ${code}${ok ? ' (esperado)' : ` (se esperaba ${expectedCodes})`}`);
    return { ok, code, message: e.message };
  }
}

const TITLE_PREFIX = `PRACTICA11-${Date.now()}`;
const createdEventIds = [];
const createdUserIds = [];
let pass = 0;
let fail = 0;
function check(cond, label, detail = '') {
  if (cond) { pass++; say(`[OK] ${label}${detail ? ' -> ' + detail : ''}`); }
  else { fail++; say(`[FALLO] ${label}${detail ? ' -> ' + detail : ''}`); }
}

try {
  say('=== PRÁCTICA 11 · WHITE BOX BASE DE DATOS ===');
  say(`Fecha: ${result.fecha}`);
  say(`Host: ${result.host}`);

  const meta = await queryRun(`SELECT version() AS version, current_database() AS db, current_user AS usuario, now() AS ahora`);
  result.pruebas.metadatos = meta.rows[0];
  say(`PostgreSQL: ${meta.rows[0].version.split(',')[0]}`);
  say(`Base: ${meta.rows[0].db} | Usuario: ${meta.rows[0].usuario}`);

  // 1. Índices y restricciones
  const indexes = await queryRun(`
    SELECT tablename, indexname, indexdef
    FROM pg_indexes
    WHERE schemaname = 'public' AND tablename IN ('events','event_registrations','users')
    ORDER BY tablename, indexname`);
  const constraints = await queryRun(`
    SELECT conrelid::regclass::text AS tabla, conname, pg_get_constraintdef(oid) AS definicion
    FROM pg_constraint
    WHERE conrelid IN ('events'::regclass,'event_registrations'::regclass,'users'::regclass)
    ORDER BY tabla, conname`);
  result.pruebas.indices = indexes.rows;
  result.pruebas.restricciones = constraints.rows;
  say('\n--- Índices ---');
  indexes.rows.forEach((r) => say(`${r.tablename}: ${r.indexname}`));
  say('\n--- Restricciones ---');
  constraints.rows.forEach((r) => say(`${r.tabla}: ${r.conname} ${r.definicion}`));

  // 2. INSERT válido (tabla events)
  const eventId = crypto.randomUUID();
  createdEventIds.push(eventId);
  const now = new Date().toISOString();
  const insert = await queryRun(
    `INSERT INTO events (id, title, description, date, time, location, "isActive", "createdAt", "updatedAt")
     VALUES ($1,$2,$3,$4,$5,$6,true,$7,$7) RETURNING id, title, "isActive", "createdAt"`,
    [eventId, `${TITLE_PREFIX}-CRUD`, 'Evento de prueba de la práctica 11', new Date(Date.now() + 7 * 86400000), '18:00', 'Laboratorio', now],
  );
  check(insert.rows.length === 1 && insert.rows[0].id === eventId, 'DB-01 Inserción válida (events)', `${insert.ms} ms`);
  result.pruebas.insert = { ms: insert.ms, id: eventId };

  // 3. INSERT inválido: NOT NULL
  await expectFail(
    'DB-02a NOT NULL (title nulo)',
    `INSERT INTO events (id,title,description,date,time,location,"updatedAt") VALUES ($1,NULL,'x',now(),'10:00','x',now())`,
    [crypto.randomUUID()],
    ['23502'],
  );
  // 4. INSERT inválido: tipo de dato en date
  await expectFail(
    'DB-02b Tipo inválido (date = texto)',
    `INSERT INTO events (id,title,description,date,time,location,"updatedAt") VALUES ($1,$2,'x','no-es-fecha','10:00','x',now())`,
    [crypto.randomUUID(), `${TITLE_PREFIX}-BAD-DATE`],
    ['22007', '22008'],
  );

  // 5. SELECT por id existente / inexistente
  const sel = await queryRun(`SELECT id,title FROM events WHERE id=$1`, [eventId]);
  check(sel.rows.length === 1, 'DB-03a Consulta por id existente', `${sel.ms} ms`);
  const selNo = await queryRun(`SELECT id FROM events WHERE id=$1`, [crypto.randomUUID()]);
  check(selNo.rows.length === 0, 'DB-03b Consulta por id inexistente', `${selNo.ms} ms, 0 filas`);

  // 6. UPDATE
  const upd = await queryRun(
    `UPDATE events SET title=$1, location=$2, "updatedAt"=now() WHERE id=$3 RETURNING title, location`,
    [`${TITLE_PREFIX}-ACTUALIZADO`, 'Aula 2', eventId],
  );
  check(upd.rows[0]?.title === `${TITLE_PREFIX}-ACTUALIZADO`, 'DB-04 Actualización de registro', `${upd.ms} ms`);

  // 7. Usuario de prueba + integridad referencial
  const userId = crypto.randomUUID();
  createdUserIds.push(userId);
  await pool.query(
    `INSERT INTO users (id,email,password,name,"isActive","createdAt","updatedAt")
     VALUES ($1,$2,'$2a$10$hashdepractica11','Usuario Practica 11',true,now(),now())`,
    [userId, `${TITLE_PREFIX.toLowerCase()}@test.local`],
  );

  const regId = crypto.randomUUID();
  const reg = await queryRun(
    `INSERT INTO event_registrations (id,"eventId","userId","createdAt") VALUES ($1,$2,$3,now()) RETURNING id`,
    [regId, eventId, userId],
  );
  check(reg.rows.length === 1, 'DB-01b Inserción válida (event_registrations)', `${reg.ms} ms`);

  await expectFail(
    'DB-02c UNIQUE (eventId,userId duplicado)',
    `INSERT INTO event_registrations (id,"eventId","userId","createdAt") VALUES ($1,$2,$3,now())`,
    [crypto.randomUUID(), eventId, userId],
    ['23505'],
  );
  await expectFail(
    'DB-02d FOREIGN KEY (userId inexistente)',
    `INSERT INTO event_registrations (id,"eventId","userId","createdAt") VALUES ($1,$2,$3,now())`,
    [crypto.randomUUID(), eventId, crypto.randomUUID()],
    ['23503'],
  );

  // 8. Transacción con rollback
  const txId = crypto.randomUUID();
  {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO events (id,title,description,date,time,location,"updatedAt") VALUES ($1,$2,'tx',now(),'09:00','x',now())`,
        [txId, `${TITLE_PREFIX}-TX`],
      );
      await client.query('ROLLBACK');
    } finally {
      client.release();
    }
  }
  const txCheck = await pool.query(`SELECT 1 FROM events WHERE id=$1`, [txId]);
  check(txCheck.rowCount === 0, 'DB-05 Rollback de transacción (no persiste)', `${txCheck.rowCount} filas`);

  // 9. Concurrencia: dos inserciones simultáneas del mismo par único
  const concUserId = crypto.randomUUID();
  createdUserIds.push(concUserId);
  await pool.query(
    `INSERT INTO users (id,email,password,name,"isActive","createdAt","updatedAt")
     VALUES ($1,$2,'$2a$10$hash','Usuario Concurrencia',true,now(),now())`,
    [concUserId, `${TITLE_PREFIX.toLowerCase()}-conc@test.local`],
  );
  const c1 = await pool.connect();
  const c2 = await pool.connect();
  const concurrentOutcome = await Promise.allSettled([
    c1.query(`INSERT INTO event_registrations (id,"eventId","userId","createdAt") VALUES ($1,$2,$3,now())`, [crypto.randomUUID(), eventId, concUserId]),
    c2.query(`INSERT INTO event_registrations (id,"eventId","userId","createdAt") VALUES ($1,$2,$3,now())`, [crypto.randomUUID(), eventId, concUserId]),
  ]);
  c1.release();
  c2.release();
  const concCodes = concurrentOutcome.map((r) => (r.status === 'fulfilled' ? 'OK' : errorCode(r.reason)));
  result.pruebas.concurrencia_unique = concCodes;
  check(concCodes.filter((c) => c === 'OK').length === 1 && concCodes.includes('23505'), 'DB-06 Concurrencia: UNIQUE impide registro duplicado', concCodes.join(' / '));

  // 10. Concurrencia: dos UPDATE simultáneos (last write wins, sin bloqueo optimista)
  const upd1 = `UPDATE events SET title=$1, "updatedAt"=now() WHERE id=$2 RETURNING title`;
  const concurrencyUpdates = await Promise.allSettled([
    pool.query(upd1, [`${TITLE_PREFIX}-CLIENTE-A`, eventId]),
    pool.query(upd1, [`${TITLE_PREFIX}-CLIENTE-B`, eventId]),
  ]);
  const finalTitle = (await pool.query(`SELECT title FROM events WHERE id=$1`, [eventId])).rows[0].title;
  result.pruebas.concurrencia_update = {
    resultados: concurrencyUpdates.map((r) => (r.status === 'fulfilled' ? 'OK' : errorCode(r.reason))),
    tituloFinal: finalTitle,
  };
  check(concurrencyUpdates.every((r) => r.status === 'fulfilled'), 'DB-06b UPDATE concurrente: ambos commit (last write wins)', `final=${finalTitle}`);

  // 11. Tiempos de consulta (5 ejecuciones cada una)
  const queries = {
    Q1_listar_activos: { sql: `SELECT * FROM events WHERE "isActive"=true ORDER BY date ASC`, params: [] },
    Q2_por_id: { sql: `SELECT * FROM events WHERE id=$1`, params: [eventId] },
    Q3_contar_inscripciones: { sql: `SELECT COUNT(*)::int AS total FROM event_registrations WHERE "eventId"=$1`, params: [eventId] },
    Q4_admin_con_conteo: {
      sql: `SELECT e.*, (SELECT COUNT(*) FROM event_registrations r WHERE r."eventId"=e.id) AS registros
            FROM events e ORDER BY e."createdAt" DESC LIMIT 50`,
      params: [],
    },
  };
  const timings = {};
  for (const [name, q] of Object.entries(queries)) {
    const samples = [];
    for (let i = 0; i < 5; i++) {
      const t = await queryRun(q.sql, q.params);
      samples.push(t.ms);
    }
    const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
    timings[name] = { samples, min: Math.min(...samples), max: Math.max(...samples), avg: +avg.toFixed(2) };
    say(`\n[TIEMPO] ${name}: min=${timings[name].min} ms, avg=${timings[name].avg} ms, max=${timings[name].max} ms`);
  }
  result.pruebas.tiempos = timings;

  // 12. EXPLAIN ANALYZE
  const explains = {};
  for (const [name, q] of Object.entries(queries)) {
    const plan = await pool.query(`EXPLAIN (ANALYZE, BUFFERS, FORMAT TEXT) ${q.sql}`, q.params);
    explains[name] = plan.rows.map((r) => r['QUERY PLAN']).join('\n');
    say(`\n--- EXPLAIN ANALYZE ${name} ---\n${explains[name]}`);
  }
  result.pruebas.explain = explains;

  // 13. Persistencia y consistencia tras actualizar
  const persisted = await pool.query(`SELECT title, location FROM events WHERE id=$1`, [eventId]);
  check(persisted.rows[0]?.location === 'Aula 2', 'Persistencia tras UPDATE', `title=${persisted.rows[0]?.title}`);

  // 14. DELETE y verificación
  const delReg = await queryRun(`DELETE FROM event_registrations WHERE "eventId"=$1`, [eventId]);
  check(delReg.rowCount >= 1, 'DB-05b Eliminación de registros', `${delReg.rowCount} filas`);
  const del = await queryRun(`DELETE FROM events WHERE id=$1`, [eventId]);
  check(del.rowCount === 1, 'DB-05c Eliminación de evento', `${del.ms} ms`);
  const after = await pool.query(`SELECT 1 FROM events WHERE id=$1`, [eventId]);
  check(after.rowCount === 0, 'DB-03c Consulta posterior al DELETE', '0 filas (consistente)');

  result.pass = pass;
  result.fail = fail;
} catch (e) {
  result.fatal = { message: e.message, code: errorCode(e), stack: e.stack };
  say(`ERROR FATAL: ${e.message}`);
} finally {
  try {
    if (createdEventIds.length) {
      await pool.query(`DELETE FROM event_registrations WHERE "eventId" = ANY($1::text[])`, [createdEventIds]);
      await pool.query(`DELETE FROM events WHERE id = ANY($1::text[])`, [createdEventIds]);
    }
    await pool.query(`DELETE FROM event_registrations WHERE "eventId" IN (SELECT id FROM events WHERE title LIKE $1)`, [`${TITLE_PREFIX}%`]);
    await pool.query(`DELETE FROM events WHERE title LIKE $1`, [`${TITLE_PREFIX}%`]);
    if (createdUserIds.length) {
      await pool.query(`DELETE FROM event_registrations WHERE "userId" = ANY($1::text[])`, [createdUserIds]);
      await pool.query(`DELETE FROM users WHERE id = ANY($1::text[])`, [createdUserIds]);
    }
  } catch (cleanupErr) {
    say(`ERROR limpiando datos: ${cleanupErr.message}`);
  }
  await pool.end();
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'db_results.json'), JSON.stringify(result, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'db_whitebox.log'), log.join('\n'));
  say(`\nResultado: ${pass} OK / ${fail} fallos. Evidencia en evidencias/practica11/db_results.json`);
}
