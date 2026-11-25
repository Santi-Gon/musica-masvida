/**
 * Práctica 11 - Mediciones HTTP, códigos de respuesta, transferencia,
 * carga controlada, interrupción/recuperación e idempotencia.
 *
 * Uso (desde la raíz): node evidencias/practica11/scripts/http_whitebox.mjs
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT_DIR = path.join(process.cwd(), 'evidencias', 'practica11');
const API = 'https://musica-masvida-api.onrender.com/api/v1';
const SITE = 'https://musica-masvida.vercel.app';
const ADMIN_EMAIL = 'admin@musicamasvida.com';
const ADMIN_PASS = 'password123';

const log = [];
const out = { fecha: new Date().toISOString(), api: API, pruebas: {}, defectos: [] };
const createdEventIds = [];
const createdByDefect = [];

function say(line = '') { console.log(line); log.push(line); }
function round(n, d = 2) { return +Number(n).toFixed(d); }
function stats(values) {
  const sorted = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length;
  const p95 = sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * 0.95) - 1)];
  return {
    n: values.length,
    min: round(Math.min(...values)),
    max: round(Math.max(...values)),
    avg: round(avg),
    p95: round(p95),
    stddev: round(Math.sqrt(variance)),
  };
}
async function timedFetch(url, options = {}) {
  const t0 = performance.now();
  const res = await fetch(url, options);
  const buf = await res.arrayBuffer();
  const ms = performance.now() - t0;
  return {
    status: res.status,
    ms: round(ms),
    bytes: buf.byteLength,
    mbps: round((buf.byteLength * 8) / (ms / 1000) / 1_000_000, 3),
    headers: Object.fromEntries(res.headers.entries()),
    body: Buffer.from(buf).toString('utf8'),
  };
}
async function jsonFetch(url, options = {}) {
  const r = await timedFetch(url, options);
  let json = null;
  try { json = JSON.parse(r.body); } catch { /* cuerpo no JSON */ }
  return { ...r, json };
}
const authHeaders = (token) => ({ Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' });
const eventPayload = (suffix, descriptionSize = 120) => ({
  title: `PRACTICA11-HTTP-${suffix}`,
  description: 'x'.repeat(descriptionSize),
  date: new Date(Date.now() + 5 * 86400000).toISOString(),
  time: '19:00',
  location: 'Laboratorio de pruebas',
});

// Métricas de red reportadas desde PowerShell (ping) se agregan al informe.
try {
  say('=== PRÁCTICA 11 · WHITE BOX WEB / API / CONECTIVIDAD ===');
  say(`Fecha: ${out.fecha}`);
  say(`API: ${API}`);

  // 0. Calentamiento (Render free puede tardar ~60 s si estaba dormido)
  const warm = await timedFetch(`${API}/events`, { signal: AbortSignal.timeout(120000) });
  say(`Warm-up: HTTP ${warm.status} en ${warm.ms} ms`);
  out.pruebas.warmup = { status: warm.status, ms: warm.ms };

  // 1. Login admin
  const login = await jsonFetch(`${API}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  });
  out.pruebas.login = { status: login.status, ms: login.ms, bytes: login.bytes, campos: Object.keys(login.json || {}) };
  say(`Login admin: HTTP ${login.status} en ${login.ms} ms (${login.bytes} bytes) campos=${Object.keys(login.json || {}).join(',')}`);
  const adminToken = login.json?.accessToken;
  if (!adminToken) throw new Error('No se obtuvo token de admin');

  // 2. Login alumno (setup idempotente)
  const setupUser = await jsonFetch(`${API}/auth/setup-user`, { method: 'POST', signal: AbortSignal.timeout(60000) });
  const userLogin = await jsonFetch(`${API}/auth/user/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'alumno@musicamasvida.com', password: 'alumno123' }),
  });
  const userToken = userLogin.json?.accessToken || setupUser.json?.accessToken;
  out.pruebas.loginUsuario = { setupStatus: setupUser.status, loginStatus: userLogin.status, ms: userLogin.ms };
  say(`Login alumno: HTTP ${userLogin.status} en ${userLogin.ms} ms`);

  // 3. Diez solicitudes consecutivas a GET /events
  const ten = [];
  for (let i = 1; i <= 10; i++) {
    const r = await timedFetch(`${API}/events`);
    ten.push({ solicitud: i, codigo: r.status, ms: r.ms, bytes: r.bytes });
    say(`Solicitud ${i}: HTTP ${r.status}, ${r.ms} ms, ${r.bytes} bytes`);
  }
  out.pruebas.diez_solicitudes = six(ten);
  say(`GET /events -> avg=${stats(ten.map((t) => t.ms)).avg} ms, p95=${stats(ten.map((t) => t.ms)).p95} ms, tamaño medio=${round(ten.reduce((a, b) => a + b.bytes, 0) / ten.length)} bytes`);

  function six(rows) { return rows; }

  // 4. Subida: 3 POST /events con cuerpo de ~4 KB
  const uploads = [];
  for (let i = 1; i <= 3; i++) {
    const payload = eventPayload(`UP-${i}-${Date.now()}`, 4096);
    const r = await jsonFetch(`${API}/events`, {
      method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify(payload),
    });
    if (r.status === 201 && r.json?.id) createdEventIds.push(r.json.id);
    uploads.push({ intento: i, status: r.status, ms: r.ms, bytes: JSON.stringify(payload).length, mbps: r.mbps });
    say(`Subida ${i}: HTTP ${r.status}, ${r.ms} ms, ${Buffer.byteLength(JSON.stringify(payload))} bytes, ${r.mbps} Mbps`);
  }
  out.pruebas.subida = uploads;

  // 5. Descarga: 3 GET del listado y 3 del bundle web
  const downloads = [];
  for (let i = 1; i <= 3; i++) {
    const r = await timedFetch(`${API}/events`);
    downloads.push({ intento: i, ms: r.ms, bytes: r.bytes, mbps: r.mbps });
    say(`Descarga API ${i}: ${r.ms} ms, ${r.bytes} bytes, ${r.mbps} Mbps`);
  }
  let siteBytes = 0;
  const siteJs = await timedFetch(`${SITE}/`);
  const m = siteJs.body.match(/src="([^"]+\.js)"/);
  if (m) {
    const bundle = await timedFetch(`${SITE}${m[1]}`);
    siteBytes = bundle.bytes;
    out.pruebas.descarga_web = { js: m[1], status: bundle.status, ms: bundle.ms, bytes: bundle.bytes, mbps: bundle.mbps };
    say(`Descarga bundle web: ${bundle.bytes} bytes en ${bundle.ms} ms (${bundle.mbps} Mbps)`);
  }
  out.pruebas.descarga = downloads;

  // 6. Carga controlada: 1, 5 y 10 usuarios concurrentes, 20 solicitudes por escenario
  const load = {};
  for (const concurrency of [1, 5, 10]) {
    const total = 20;
    const times = [];
    const codes = [];
    let bytes = 0;
    const t0 = performance.now();
    let issued = 0;
    async function worker() {
      while (issued < total) {
        issued++;
        const r = await timedFetch(`${API}/events`);
        times.push(r.ms);
        codes.push(r.status);
        bytes += r.bytes;
      }
    }
    await Promise.all(Array.from({ length: concurrency }, worker));
    const duration = performance.now() - t0;
    const st = stats(times);
    load[`c${concurrency}`] = {
      concurrencia: concurrency,
      solicitudes: total,
      exitosas: codes.filter((c) => c === 200).length,
      fallidas: codes.filter((c) => c !== 200).length,
      ...st,
      duracion_ms: round(duration),
      bytes_totales: bytes,
      mbps: round((bytes * 8) / (duration / 1000) / 1_000_000, 3),
      rps: round(total / (duration / 1000), 2),
    };
    say(`Carga C=${concurrency}: avg=${st.avg} ms, p95=${st.p95} ms, OK=${load[`c${concurrency}`].exitosas}/${total}, ${load[`c${concurrency}`].rps} req/s, ${load[`c${concurrency}`].mbps} Mbps`);
  }
  out.pruebas.carga = load;

  // 7. Matriz de códigos HTTP
  const codes = {};
  const record = (name, r, extra = {}) => {
    codes[name] = { status: r.status, ms: r.ms, bytes: r.bytes, ...extra };
    say(`${name}: HTTP ${r.status} en ${r.ms} ms`);
  };
  record('200 GET /events', await timedFetch(`${API}/events`));
  record('201 POST /events (admin)', await jsonFetch(`${API}/events`, {
    method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify(eventPayload(`CODE-201-${Date.now()}`)),
  }), { esperado: 201 });
  // guardar id del 201
  const created201 = await jsonFetch(`${API}/events`, {
    method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify(eventPayload(`CODE-DELETE-${Date.now()}`)),
  });
  if (created201.json?.id) createdEventIds.push(created201.json.id);

  record('400 POST /events sin description', await jsonFetch(`${API}/events`, {
    method: 'POST', headers: authHeaders(adminToken),
    body: JSON.stringify({ title: 'sin descripcion', date: new Date().toISOString(), time: '10:00', location: 'x' }),
  }), { esperado: 400 });

  record('401 POST /events sin token', await jsonFetch(`${API}/events`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(eventPayload('NO-TOKEN')),
  }), { esperado: 401 });

  record('404 GET /events/{uuid inexistente}', await jsonFetch(`${API}/events/00000000-0000-4000-8000-000000000000`), { esperado: 404 });

  if (userToken) {
    const forbiddenCreate = await jsonFetch(`${API}/events`, {
      method: 'POST', headers: authHeaders(userToken), body: JSON.stringify(eventPayload(`USER-WRITE-${Date.now()}`)),
    });
    if (forbiddenCreate.json?.id) createdByDefect.push(forbiddenCreate.json.id);
    record('403 esperado: POST /events con token USER', forbiddenCreate, { esperado: 403, observado: forbiddenCreate.status });
    if (forbiddenCreate.status === 201) {
      out.defectos.push({
        id: 'DEF-01',
        tipo: 'Autorización',
        componente: 'API EventsController',
        descripcion: 'Un usuario con rol USER puede crear eventos (POST /events). El controlador solo aplica JwtAuthGuard y no valida el rol.',
        esperado: 403,
        observado: 201,
        evidencia: 'http_results.json → pruebas.codigos["403 esperado: POST /events con token USER"]',
      });
    }

    record('403 esperado: GET /users/admin/all con token USER', await jsonFetch(`${API}/users/admin/all`, { headers: authHeaders(userToken) }), { esperado: 403 });
  }

  // 409: inscripción duplicada
  const regEvent = await jsonFetch(`${API}/events`, {
    method: 'POST', headers: authHeaders(adminToken), body: JSON.stringify(eventPayload(`REG-${Date.now()}`, 60)),
  });
  const regEventId = regEvent.json?.id;
  if (regEventId) {
    createdEventIds.push(regEventId);
    if (userToken) {
      const first = await jsonFetch(`${API}/events/${regEventId}/register`, { method: 'POST', headers: authHeaders(userToken) });
      const second = await jsonFetch(`${API}/events/${regEventId}/register`, { method: 'POST', headers: authHeaders(userToken) });
      codes['201 primera inscripción'] = { status: first.status, ms: first.ms, bytes: first.bytes };
      codes['409 inscripción duplicada'] = { status: second.status, ms: second.ms, bytes: second.bytes };
      say(`Inscripción 1: HTTP ${first.status}; Inscripción 2: HTTP ${second.status}`);
    }
  }

  // 204 DELETE
  if (created201.json?.id) {
    record('204 DELETE /events/{id}', await timedFetch(`${API}/events/${created201.json.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${adminToken}` } }), { esperado: 204 });
  }

  // 422: probar fecha semánticamente inválida (la API usa 400 para validación)
  record('422/400 fecha inválida', await jsonFetch(`${API}/events`, {
    method: 'POST', headers: authHeaders(adminToken),
    body: JSON.stringify({ ...eventPayload('BAD-DATE'), date: '2026-13-45T99:99:99Z' }),
  }), { esperado: '400 (class-validator) o 422' });

  out.pruebas.codigos = codes;

  // 8. Sensibilidad de respuestas
  const usersList = await jsonFetch(`${API}/users/admin/all`, { headers: authHeaders(adminToken) });
  const rawUsers = usersList.body;
  out.pruebas.sensibilidad = {
    login_campos: Object.keys(login.json || {}),
    login_contiene_password: /"password"/i.test(login.body),
    users_status: usersList.status,
    users_contiene_password: /"password"/i.test(rawUsers),
    users_contiene_pin: /smartwatchPin/i.test(rawUsers),
  };
  say(`Sensibilidad: login password=${out.pruebas.sensibilidad.login_contiene_password}, users password=${out.pruebas.sensibilidad.users_contiene_password}, pin=${out.pruebas.sensibilidad.users_contiene_pin}`);

  // 9. Idempotencia: mismo POST dos veces
  const idemPayload = JSON.stringify(eventPayload(`IDEM-${Date.now()}`));
  const idem1 = await jsonFetch(`${API}/events`, { method: 'POST', headers: authHeaders(adminToken), body: idemPayload });
  const idem2 = await jsonFetch(`${API}/events`, { method: 'POST', headers: authHeaders(adminToken), body: idemPayload });
  if (idem1.json?.id) createdEventIds.push(idem1.json.id);
  if (idem2.json?.id) createdEventIds.push(idem2.json.id);
  out.pruebas.idempotencia = { status1: idem1.status, status2: idem2.status, mismoId: idem1.json?.id === idem2.json?.id, id1: idem1.json?.id, id2: idem2.json?.id };
  say(`Idempotencia: HTTP ${idem1.status}/${idem2.status}, mismo id=${out.pruebas.idempotencia.mismoId}`);
  if (out.pruebas.idempotencia.mismoId === false) {
    out.defectos.push({
      id: 'DEF-02',
      tipo: 'Idempotencia',
      componente: 'API POST /events',
      descripcion: 'Dos POST idénticos crean dos eventos distintos: no existe clave de idempotencia ni detección de duplicados.',
      esperado: 'Un solo registro o 409 en el duplicado',
      observado: '201 en ambas solicitudes con ids diferentes',
      evidencia: 'http_results.json → pruebas.idempotencia',
    });
  }

  // 10. Interrupción y recuperación
  try {
    await fetch(`${API}/events`, { signal: AbortSignal.timeout(1) });
    out.pruebas.interrupcion = { aborto: 'no lanzó error (inesperado)' };
  } catch (e) {
    out.pruebas.interrupcion = { aborto: e.name, mensaje: e.message };
    say(`Interrupción simulada: ${e.name}`);
  }
  const retry = await timedFetch(`${API}/events`);
  out.pruebas.recuperacion = { status: retry.status, ms: retry.ms };
  say(`Recuperación tras fallo: HTTP ${retry.status} en ${retry.ms} ms`);

  // 11. Concurrencia de escritura: 5 POST simultáneos (capacidad/duplicados)
  const concPayload = JSON.stringify(eventPayload(`CONC-${Date.now()}`));
  const concResults = await Promise.all(Array.from({ length: 5 }, () =>
    jsonFetch(`${API}/events`, { method: 'POST', headers: authHeaders(adminToken), body: concPayload })));
  concResults.forEach((r) => { if (r.json?.id) createdEventIds.push(r.json.id); });
  out.pruebas.escritura_concurrente = concResults.map((r) => r.status);
  say(`POST concurrentes x5: ${out.pruebas.escritura_concurrente.join(', ')}`);
  if (concResults.filter((r) => r.status === 201).length > 1) {
    out.defectos.push({
      id: 'DEF-03',
      tipo: 'Concurrencia',
      componente: 'API POST /events',
      descripcion: 'Cinco solicitudes simultáneas con el mismo cuerpo generan cinco registros duplicados; no hay restricción UNIQUE por título/fecha.',
      esperado: '1 registro o rechazo de duplicados',
      observado: `${concResults.filter((r) => r.status === 201).length} registros creados`,
      evidencia: 'http_results.json → pruebas.escritura_concurrente',
    });
  }
} catch (e) {
  out.fatal = { message: e.message, stack: e.stack };
  say(`ERROR FATAL: ${e.message}`);
} finally {
  // Limpieza de todos los eventos creados por la práctica
  const token = out.pruebas.login && (await (async () => {
    try {
      const r = await jsonFetch(`${API}/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
      });
      return r.json?.accessToken;
    } catch { return null; }
  })());
  const allIds = [...new Set([...createdEventIds, ...createdByDefect])];
  out.limpieza = { intentos: allIds.length, eliminados: 0, fallidos: [] };
  for (const id of allIds) {
    try {
      const r = await fetch(`${API}/events/${id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
      if (r.status === 204 || r.status === 404) out.limpieza.eliminados++;
      else out.limpieza.fallidos.push({ id, status: r.status });
    } catch (e) {
      out.limpieza.fallidos.push({ id, error: e.message });
    }
  }
  say(`Limpieza: ${out.limpieza.eliminados}/${out.limpieza.intentos} eventos eliminados`);
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, 'http_results.json'), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, 'http_whitebox.log'), log.join('\n'));
  say('Evidencia escrita en evidencias/practica11/http_results.json');
}
