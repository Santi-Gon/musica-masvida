#!/usr/bin/env node
/**
 * Prueba de idempotencia para POST /events/:id/register.
 *
 * Envía N veces la misma petición con la misma Idempotency-Key y el mismo
 * usuario. Después de los cambios, todas deben devolver 201 y en la base de
 * datos debe existir exactamente una inscripción.
 *
 * Uso:
 *   BASE_URL=http://localhost:3000/api/v1 \
 *   ADMIN_EMAIL=admin@musicamasvida.com ADMIN_PASSWORD=password123 \
 *   USER_EMAIL=alumno@musicamasvida.com USER_PASSWORD=alumno123 \
 *   N=20 \
 *   node evidencias/practica12/scripts/register_idempotency_test.mjs
 */

const args = process.argv.slice(2);
const option = (name, env, fallback) => {
  const prefix = `--${name}=`;
  const inline = args.find((a) => a.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const idx = args.indexOf(`--${name}`);
  if (idx >= 0 && args[idx + 1] !== undefined) return args[idx + 1];
  return process.env[env] ?? fallback;
};

const BASE = option('base', 'BASE_URL', 'http://localhost:3000/api/v1').replace(/\/$/, '');
const ADMIN_EMAIL = option('admin-email', 'ADMIN_EMAIL', 'admin@musicamasvida.com');
const ADMIN_PASSWORD = option('admin-password', 'ADMIN_PASSWORD', 'password123');
const USER_EMAIL = option('user-email', 'USER_EMAIL', 'alumno@musicamasvida.com');
const USER_PASSWORD = option('user-password', 'USER_PASSWORD', 'alumno123');
const N = Number(option('n', 'N', '20'));
const EVENT_ID = option('event-id', 'EVENT_ID', '');

const r2 = (n) => Number(n.toFixed(2));

async function login(email, password) {
  const res = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok || !body.accessToken) {
    throw new Error(`Login fallido para ${email}: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.accessToken;
}

async function createEvent(adminToken) {
  const res = await fetch(`${BASE}/events`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${adminToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      title: `IdempotencyTest-${Date.now()}`,
      description: 'Evento temporal para probar idempotencia',
      date: new Date(Date.now() + 10 * 86_400_000).toISOString(),
      time: '19:00',
      location: 'Laboratorio',
      capacity: 1,
    }),
  });
  const body = await res.json();
  if (!res.ok || !body.id) {
    throw new Error(`No se pudo crear evento: ${res.status} ${JSON.stringify(body)}`);
  }
  return body.id;
}

async function deleteEvent(adminToken, eventId) {
  await fetch(`${BASE}/events/${eventId}`, {
    method: 'DELETE',
    headers: { 'Authorization': `Bearer ${adminToken}` },
  });
}

async function main() {
  console.log(`Base: ${BASE}`);
  const adminToken = await login(ADMIN_EMAIL, ADMIN_PASSWORD);
  const userToken = await login(USER_EMAIL, USER_PASSWORD);

  const eventId = EVENT_ID || await createEvent(adminToken);
  const createdByTest = !EVENT_ID;
  console.log(`Evento: ${eventId} (capacity=1)`);

  const idempotencyKey = `idem-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  console.log(`Idempotency-Key: ${idempotencyKey}`);

  const times = [];
  const codes = {};
  let i = 0;

  for (i = 0; i < N; i++) {
    const t0 = performance.now();
    const res = await fetch(`${BASE}/events/${eventId}/register`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${userToken}`,
        'Idempotency-Key': idempotencyKey,
      },
    });
    const text = await res.text();
    const ms = performance.now() - t0;
    times.push(ms);
    codes[res.status] = (codes[res.status] || 0) + 1;
    if (i === 0 || i === N - 1 || res.status >= 400) {
      console.log(`  #${i + 1}: HTTP ${res.status} en ${r2(ms)} ms | ${text.slice(0, 120)}`);
    }
  }

  const sorted = [...times].sort((a, b) => a - b);
  const avg = times.reduce((a, b) => a + b, 0) / times.length;
  const p95 = sorted[Math.ceil(sorted.length * 0.95) - 1];
  const max = sorted.at(-1);

  const statusRes = await fetch(`${BASE}/events/${eventId}/registration`, {
    headers: { 'Authorization': `Bearer ${userToken}` },
  });
  const statusBody = await statusRes.json();

  console.log('\nResultados:');
  console.log(`  Peticiones: ${N}`);
  console.log(`  Códigos: ${JSON.stringify(codes)}`);
  console.log(`  Promedio: ${r2(avg)} ms | P95: ${r2(p95)} ms | Máx: ${r2(max)} ms`);
  console.log(`  Estado de inscripción final: ${JSON.stringify(statusBody)}`);

  if (createdByTest) {
    await deleteEvent(adminToken, eventId);
    console.log('Evento de prueba eliminado.');
  }

  if (codes[201] === N && statusBody.registered === true) {
    console.log('\n✅ Idempotencia OK: todas las peticiones devolvieron 201 y hay una sola inscripción.');
  } else {
    console.log('\n❌ Fallo de idempotencia: revisar duplicados o respuestas.');
    process.exitCode = 1;
  }
}

main().catch((e) => {
  console.error(e.message);
  process.exitCode = 1;
});
