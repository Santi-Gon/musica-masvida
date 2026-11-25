/**
 * Práctica 12 — Pruebas de estrés de la API (lectura y escritura).
 *
 * Mide RPS, promedio, P90, P95, máximo, errores, códigos HTTP y bytes.
 * Uso:
 *   node evidencias/practica12/scripts/api_stress.mjs --base http://localhost:3000/api/v1 --label antes
 *   node evidencias/practica12/scripts/api_stress.mjs --base https://musica-masvida-api.onrender.com/api/v1 --label render
 */
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const getArg = (name, def) => {
  const i = args.indexOf(`--${name}`);
  return i >= 0 && args[i + 1] ? args[i + 1] : def;
};
const BASE = getArg('base', 'http://localhost:3000/api/v1').replace(/\/$/, '');
const LABEL = getArg('label', 'antes');
const LEVELS = (getArg('levels', '1,5,10,25')).split(',').map(Number);
const READ_REQ = Number(getArg('read', '40'));
const WRITE_REQ = Number(getArg('write', '20'));
const ADMIN_EMAIL = getArg('email', 'admin@musicamasvida.com');
const ADMIN_PASS = getArg('password', 'password123');

const OUT_DIR = path.join(process.cwd(), 'evidencias', 'practica12');
const log = [];
const out = {
  fecha: new Date().toISOString(),
  etiqueta: LABEL,
  base: BASE,
  niveles: LEVELS,
  lectura: { solicitudesPorNivel: READ_REQ },
  escritura: { solicitudesPorNivel: WRITE_REQ },
};
function say(line = '') { console.log(line); log.push(line); }
const r2 = (n) => +Number(n).toFixed(2);

function stats(values) {
  const s = [...values].sort((a, b) => a - b);
  const sum = values.reduce((a, b) => a + b, 0);
  const avg = sum / values.length;
  const variance = values.reduce((a, b) => a + (b - avg) ** 2, 0) / values.length;
  const pick = (p) => s[Math.min(s.length - 1, Math.ceil(s.length * p) - 1)];
  return {
    n: values.length,
    min: r2(Math.min(...values)),
    avg: r2(avg),
    p90: r2(pick(0.90)),
    p95: r2(pick(0.95)),
    max: r2(Math.max(...values)),
    stddev: r2(Math.sqrt(variance)),
  };
}

async function timed(url, options = {}) {
  const t0 = performance.now();
  try {
    const res = await fetch(url, options);
    const buf = await res.arrayBuffer();
    const text = Buffer.from(buf).toString('utf8');
    let json = null;
    try { json = JSON.parse(text); } catch { /* respuesta no JSON */ }
    return { ok: true, status: res.status, ms: performance.now() - t0, bytes: buf.byteLength, json, text };
  } catch (e) {
    return { ok: false, status: 0, ms: performance.now() - t0, bytes: 0, error: e.name + ': ' + e.message };
  }
}

async function scenario(name, concurrency, total, fn) {
  // Calentamiento del nivel: evita outliers por apertura de conexiones y caché fría.
  await Promise.all(Array.from({ length: Math.max(2, Math.min(concurrency, 5)) }, () => fn()));
  const times = [];
  const codes = {};
  const errors = [];
  let bytes = 0;
  let issued = 0;
  const t0 = performance.now();
  async function worker() {
    while (issued < total) {
      issued++;
      const r = await fn();
      times.push(r.ms);
      codes[r.status] = (codes[r.status] || 0) + 1;
      bytes += r.bytes;
      if (!r.ok || r.status >= 400) errors.push(r.error || `HTTP ${r.status}`);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, worker));
  const wall = performance.now() - t0;
  const st = stats(times);
  const errorCount = errors.length;
  const res = {
    concurrencia: concurrency,
    solicitudes: total,
    exitosas: total - errorCount,
    errores: errorCount,
    errorPct: r2((errorCount / total) * 100),
    ...st,
    duracionMs: r2(wall),
    rps: r2(total / (wall / 1000)),
    bytesTotales: bytes,
    mbps: r2((bytes * 8) / (wall / 1000) / 1_000_000),
    codigos: codes,
    muestraErrores: [...new Set(errors)].slice(0, 5),
  };
  say(`[${name} C=${concurrency}] avg=${res.avg} ms · p90=${res.p90} · p95=${res.p95} · max=${res.max} · ${res.rps} req/s · errores=${res.errorPct}% · códigos=${JSON.stringify(codes)}`);
  return res;
}

async function main() {
  say('=== PRÁCTICA 12 · ESTRÉS API ===');
  say(`Fecha: ${out.fecha}`);
  say(`Base: ${BASE} · etiqueta: ${LABEL}`);

  // Calentamiento (Render free puede tardar ~60 s)
  const warm = await timed(`${BASE}/events/upcoming`, { signal: AbortSignal.timeout(120000) });
  out.calentamiento = { status: warm.status, ms: r2(warm.ms) };
  say(`Calentamiento: HTTP ${warm.status} en ${r2(warm.ms)} ms`);

  const login = await timed(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
    signal: AbortSignal.timeout(60000),
  });
  const loginBody = login.ok && login.status === 200 ? await (await fetch(`${BASE}/auth/login`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: ADMIN_EMAIL, password: ADMIN_PASS }),
  })).json() : null;
  const token = loginBody?.accessToken;
  out.login = { status: login.status, ms: r2(login.ms), token: Boolean(token) };
  say(`Login: HTTP ${login.status} · token=${Boolean(token)}`);

  out.lectura.niveles = {};
  for (const c of LEVELS) {
    out.lectura.niveles[`c${c}`] = await scenario('LECTURA GET /events/upcoming', c, READ_REQ, () =>
      timed(`${BASE}/events/upcoming`, { signal: AbortSignal.timeout(30000) }),
    );
  }

  out.escritura.niveles = {};
  const createdIds = [];
  if (token) {
    const headers = { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' };
    for (const c of LEVELS) {
      out.escritura.niveles[`c${c}`] = await scenario('ESCRITURA POST /events', c, WRITE_REQ, async () => {
        const payload = JSON.stringify({
          title: `P12-${LABEL}-C${c}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
          description: 'Evento temporal de la prueba de estrés de la práctica 12',
          date: new Date(Date.now() + 10 * 86400000).toISOString(),
          time: '19:00',
          location: 'Laboratorio',
        });
        const r = await timed(`${BASE}/events`, { method: 'POST', headers, body: payload, signal: AbortSignal.timeout(30000) });
        if (r.status === 201 && r.json?.id) createdIds.push(r.json.id);
        return r;
      });
    }

    // Limpieza: listar todo desde el endpoint administrativo y borrar por prefijo
    try {
      const allRes = await fetch(`${BASE}/events/admin/all`, { headers: { Authorization: `Bearer ${token}` } });
      const all = allRes.ok ? await allRes.json() : [];
      const mine = Array.isArray(all) ? all.filter((e) => typeof e.title === 'string' && e.title.startsWith(`P12-${LABEL}-`)) : [];
      let deleted = 0;
      for (const ev of mine) {
        const r = await fetch(`${BASE}/events/${ev.id}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } });
        if (r.status === 204 || r.status === 404) deleted++;
      }
      out.limpieza = { encontrados: mine.length, eliminados: deleted };
      say(`Limpieza: ${deleted}/${mine.length} eventos eliminados`);
    } catch (e) {
      out.limpieza = { error: e.message };
      say(`ERROR en limpieza: ${e.message}`);
    }
  } else {
    out.escritura.error = 'Sin token de administrador';
    say('Escritura omitida: no se obtuvo token');
  }

  say('\nResumen:');
  for (const [k, v] of Object.entries(out.lectura.niveles)) say(`Lectura ${k}: ${v.rps} req/s, p95=${v.p95} ms, errores=${v.errorPct}%`);
  for (const [k, v] of Object.entries(out.escritura.niveles)) say(`Escritura ${k}: ${v.rps} req/s, p95=${v.p95} ms, errores=${v.errorPct}%`);
}

try {
  await main();
} catch (e) {
  out.fatal = { message: e.message, stack: e.stack };
  say(`ERROR FATAL: ${e.message}`);
} finally {
  fs.mkdirSync(OUT_DIR, { recursive: true });
  fs.writeFileSync(path.join(OUT_DIR, `api_stress_${LABEL}.json`), JSON.stringify(out, null, 2));
  fs.writeFileSync(path.join(OUT_DIR, `api_stress_${LABEL}.log`), log.join('\n'));
  say(`Evidencia: evidencias/practica12/api_stress_${LABEL}.json`);
}
