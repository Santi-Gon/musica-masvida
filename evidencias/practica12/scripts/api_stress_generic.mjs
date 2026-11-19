#!/usr/bin/env node
/**
 * Prueba de estrés por duración para endpoints GET y POST/PUT/PATCH.
 * Requiere Node.js 18+; usa fetch nativo y no instala dependencias.
 *
 * Parámetros (argumento / variable de entorno):
 *   --read-url       READ_URL             URL completa del GET (opcional)
 *   --write-url      WRITE_URL            URL completa de escritura (opcional)
 *   --method         WRITE_METHOD         POST, PUT o PATCH (default: POST)
 *   --concurrency    CONCURRENCY          Usuarios simultáneos (default: 5)
 *   --duration       DURATION_SECONDS     Segundos por endpoint (default: 30)
 *   --timeout        REQUEST_TIMEOUT_MS   Timeout por petición (default: 30000)
 *   --token          AUTH_TOKEN           JWT; se envía como Bearer a ambos endpoints
 *   --write-body     WRITE_BODY           Cuerpo JSON de escritura
 *   --headers        HEADERS_JSON         Cabeceras adicionales como objeto JSON
 *   --warmup         WARMUP               1 = calentar solo el GET (default: 1)
 *
 * En WRITE_BODY se pueden usar {{requestId}}, {{timestamp}}, {{isoDate}},
 * {{futureDate}} y {{workerId}} para generar valores por petición.
 * La duración aplica por separado a lectura y escritura. Las peticiones ya
 * iniciadas se esperan hasta terminar o alcanzar su timeout.
 *
 * Ejemplo:
 *   READ_URL=http://localhost:3000/api/v1/events/upcoming \
 *   WRITE_URL=http://localhost:3000/api/v1/events \
 *   AUTH_TOKEN=... CONCURRENCY=10 DURATION_SECONDS=30 \
 *   WRITE_BODY='{"title":"stress-{{requestId}}","description":"Prueba","date":"{{futureDate}}","time":"19:00","location":"Laboratorio"}' \
 *   node evidencias/practica12/scripts/api_stress_generic.mjs
 */
import { randomUUID } from 'node:crypto';

const args = process.argv.slice(2);

function option(name, envName, fallback) {
  const prefix = `--${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  if (inline) return inline.slice(prefix.length);
  const index = args.indexOf(`--${name}`);
  if (index >= 0 && args[index + 1] !== undefined) return args[index + 1];
  return process.env[envName] ?? fallback;
}

function positiveNumber(value, name, { integer = false } = {}) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0 || (integer && !Number.isInteger(parsed))) {
    throw new Error(`${name} debe ser un número ${integer ? 'entero ' : ''}mayor que cero`);
  }
  return parsed;
}

function endpoint(value, name) {
  if (!value) return null;
  const parsed = new URL(value);
  if (!['http:', 'https:'].includes(parsed.protocol)) {
    throw new Error(`${name} debe usar HTTP o HTTPS`);
  }
  return parsed.toString();
}

const config = {
  readUrl: endpoint(option('read-url', 'READ_URL'), 'READ_URL'),
  writeUrl: endpoint(option('write-url', 'WRITE_URL'), 'WRITE_URL'),
  method: option('method', 'WRITE_METHOD', 'POST').toUpperCase(),
  concurrency: positiveNumber(option('concurrency', 'CONCURRENCY', '5'), 'CONCURRENCY', { integer: true }),
  durationSeconds: positiveNumber(option('duration', 'DURATION_SECONDS', '30'), 'DURATION_SECONDS'),
  timeoutMs: positiveNumber(option('timeout', 'REQUEST_TIMEOUT_MS', '30000'), 'REQUEST_TIMEOUT_MS', { integer: true }),
  token: option('token', 'AUTH_TOKEN', ''),
  writeBody: option('write-body', 'WRITE_BODY', ''),
  warmup: option('warmup', 'WARMUP', '1') !== '0',
  extraHeaders: JSON.parse(option('headers', 'HEADERS_JSON', '{}')),
};

if (!config.readUrl && !config.writeUrl) {
  throw new Error('Define READ_URL, WRITE_URL o ambas');
}
if (!['POST', 'PUT', 'PATCH'].includes(config.method)) {
  throw new Error('WRITE_METHOD debe ser POST, PUT o PATCH');
}
if (config.extraHeaders === null || Array.isArray(config.extraHeaders) || typeof config.extraHeaders !== 'object') {
  throw new Error('HEADERS_JSON debe ser un objeto JSON');
}
if (config.writeBody) JSON.parse(config.writeBody);

const round = (value) => Number(value.toFixed(2));

function percentile(sorted, fraction) {
  if (sorted.length === 0) return 0;
  return sorted[Math.min(sorted.length - 1, Math.ceil(sorted.length * fraction) - 1)];
}

function summarize(times) {
  const sorted = [...times].sort((a, b) => a - b);
  const average = times.length ? times.reduce((sum, value) => sum + value, 0) / times.length : 0;
  return {
    averageMs: round(average),
    p90Ms: round(percentile(sorted, 0.90)),
    p95Ms: round(percentile(sorted, 0.95)),
    maxMs: round(sorted.at(-1) ?? 0),
  };
}

function headersFor(hasBody) {
  const headers = { ...config.extraHeaders };
  if (config.token && !Object.keys(headers).some((key) => key.toLowerCase() === 'authorization')) {
    headers.Authorization = `Bearer ${config.token}`;
  }
  if (hasBody && !Object.keys(headers).some((key) => key.toLowerCase() === 'content-type')) {
    headers['Content-Type'] = 'application/json';
  }
  return headers;
}

async function request({ url, method, bodyTemplate, requestId, workerId }) {
  const replacements = {
    requestId,
    timestamp: String(Date.now()),
    isoDate: new Date().toISOString(),
    futureDate: new Date(Date.now() + 10 * 86_400_000).toISOString(),
    workerId: String(workerId),
  };
  let body = bodyTemplate;
  for (const [key, value] of Object.entries(replacements)) {
    body = body.split(`{{${key}}}`).join(value);
  }

  const startedAt = performance.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), config.timeoutMs);
  try {
    const response = await fetch(url, {
      method,
      headers: headersFor(Boolean(body)),
      body: body || undefined,
      signal: controller.signal,
    });
    await response.arrayBuffer();
    return {
      status: response.status,
      ms: performance.now() - startedAt,
      error: response.status >= 400 ? `HTTP_${response.status}` : null,
    };
  } catch (error) {
    return {
      status: null,
      ms: performance.now() - startedAt,
      error: error.name === 'AbortError' ? 'TIMEOUT' : `NETWORK_${error.name}`,
      detail: error.message,
    };
  } finally {
    clearTimeout(timeout);
  }
}

function printResult(result) {
  console.log(`\n=== ${result.name} ===`);
  console.log(`Concurrencia: ${config.concurrency} | Duración objetivo: ${config.durationSeconds} s | Duración real: ${result.elapsedSeconds} s`);
  console.log(`Completadas: ${result.completed} | RPS: ${result.rps}`);
  console.log(`Promedio: ${result.averageMs} ms | P90: ${result.p90Ms} ms | P95: ${result.p95Ms} ms | Máximo: ${result.maxMs} ms`);
  console.log(`Errores: ${result.errors} (${result.errorPercent}%) | Timeouts: ${result.timeouts}`);
  console.log(`Códigos HTTP: ${JSON.stringify(result.httpStatuses)}`);
  console.log(`Tipos de error: ${JSON.stringify(result.errorTypes)}`);
  for (const note of result.notes) console.log(`Nota: ${note}`);
  if (result.errorSamples.length) console.log(`Muestra de errores: ${JSON.stringify(result.errorSamples)}`);
}

async function runScenario(name, url, method, bodyTemplate = '') {
  const times = [];
  const httpStatuses = {};
  const errorTypes = {};
  const errorSamples = [];
  const deadline = performance.now() + config.durationSeconds * 1000;
  const startedAt = performance.now();
  let sequence = 0;
  let errors = 0;
  let timeouts = 0;

  async function worker(workerId) {
    while (performance.now() < deadline) {
      const requestId = `${name.toLowerCase()}-${Date.now()}-${++sequence}-${randomUUID()}`;
      const result = await request({ url, method, bodyTemplate, requestId, workerId });
      times.push(result.ms);
      if (result.status === null) {
        httpStatuses.SIN_RESPUESTA = (httpStatuses.SIN_RESPUESTA ?? 0) + 1;
      } else {
        httpStatuses[result.status] = (httpStatuses[result.status] ?? 0) + 1;
      }
      if (result.error) {
        errors++;
        errorTypes[result.error] = (errorTypes[result.error] ?? 0) + 1;
        if (result.error === 'TIMEOUT') timeouts++;
        if (result.detail && errorSamples.length < 5 && !errorSamples.includes(result.detail)) {
          errorSamples.push(result.detail);
        }
      }
    }
  }

  await Promise.all(Array.from({ length: config.concurrency }, (_, index) => worker(index + 1)));
  const elapsedMs = performance.now() - startedAt;
  const errorPercent = times.length ? (errors / times.length) * 100 : 0;
  const first = times.slice(0, Math.min(5, times.length));
  const rest = times.slice(first.length);
  const firstAverage = first.length ? first.reduce((sum, value) => sum + value, 0) / first.length : 0;
  const restAverage = rest.length ? rest.reduce((sum, value) => sum + value, 0) / rest.length : 0;
  const stats = summarize(times);
  const notes = [];

  if (rest.length && firstAverage > restAverage * 2) {
    notes.push('Las primeras respuestas superan 2x el promedio posterior: posible cold start, apertura de conexiones o calentamiento de caché.');
  }
  if (errorPercent >= 5 || timeouts > 0) {
    notes.push('Errores/timeouts bajo carga: posible saturación o límite de red/pool; correlacionar con CPU, memoria, event loop y conexiones de Neon.');
  }
  if (stats.p95Ms > stats.averageMs * 2) {
    notes.push('P95 supera 2x el promedio: hay cola o latencia de cola; esto por sí solo no demuestra saturación.');
  }
  if (!notes.length) notes.push('Sin señales heurísticas claras; comparar varios niveles de concurrencia para localizar saturación.');
  if (name === 'LECTURA' && new URL(url).pathname.endsWith('/events/upcoming')) {
    notes.push('Esta lectura puede medir caché caliente (TTL 15 s), no PostgreSQL en cada petición.');
  }

  return {
    name,
    completed: times.length,
    elapsedSeconds: round(elapsedMs / 1000),
    rps: round(times.length / (elapsedMs / 1000)),
    ...stats,
    errors,
    errorPercent: round(errorPercent),
    timeouts,
    httpStatuses,
    errorTypes,
    errorSamples,
    notes,
  };
}

console.log('Inicio de prueba de estrés. ADVERTENCIA: las escrituras modifican datos reales; usar staging y limpiar los registros creados.');
console.log(`Node ${process.version} | concurrencia=${config.concurrency} | duración=${config.durationSeconds}s por endpoint | timeout=${config.timeoutMs}ms`);

let warmup = null;
if (config.readUrl && config.warmup) {
  console.log('Calentamiento GET (excluido de las métricas; puede incluir cold start de Render/Neon)...');
  warmup = await request({ url: config.readUrl, method: 'GET', bodyTemplate: '', requestId: `warmup-${randomUUID()}`, workerId: 0 });
  console.log(`Calentamiento: HTTP ${warmup.status ?? 'SIN_RESPUESTA'} | ${round(warmup.ms)} ms${warmup.error ? ` | ${warmup.error}` : ''}`);
}

if (config.readUrl) {
  printResult(await runScenario('LECTURA', config.readUrl, 'GET'));
}
if (config.writeUrl) {
  printResult(await runScenario('ESCRITURA', config.writeUrl, config.method, config.writeBody));
}

console.log('\nCold start: revisar el tiempo del calentamiento y las primeras peticiones. Saturación: confirmar estas notas con métricas de Render/Neon; no diagnosticar solo desde el cliente.');
