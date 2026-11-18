# Evidencias — Práctica 11 (Whitebox)

Fecha de ejecución: **2026-11-18** · Rama `correcciones` · Commit `4ea963d`
Entorno: Windows 11 10.0.26200 · Flutter 3.47.6 / Dart 3.13.5 · Node v22.23.2 · pnpm 11.21.0

## Contenido

| Archivo | Descripción |
|---|---|
| `flutter_test_clean.txt` | Suite Flutter completa: **48 pruebas aprobadas** |
| `flutter_test_final.txt` | Ejecución con las pruebas nuevas de límites/excepciones |
| `flutter_test_branch.txt` | Intento con `--branch-coverage` (Dart no emitió `BRDA`) |
| `flutter_analyze.txt` | `flutter analyze`: **No issues found** |
| `api_jest_final.txt` | Jest: **57 pruebas / 5 suites**, cobertura global 32.02 % |
| `db_results.json` | Resultados estructurados de las 12 verificaciones de BD |
| `db_whitebox.log` | Log de BD, incluidos los 4 `EXPLAIN (ANALYZE, BUFFERS)` |
| `db_stdout.txt` | Salida de consola del script de BD |
| `http_results.json` | Códigos HTTP, tiempos, carga, idempotencia y limpieza |
| `http_whitebox.log` / `http_stdout.txt` | Log legible de las pruebas HTTP |
| `authz_results.json` | Evidencia del escalamiento de privilegios (DEF-01/DEF-02) |
| `pnpm_audit.txt` | `pnpm audit --prod`: 45 vulnerabilidades |
| `eslint_api.txt` | ESLint API: 149 errores (formato y `any`) |
| `oxlint_web.txt`, `oxlint_admin.txt` | Advertencias de lint de los frontends |
| `scripts/db_whitebox.mjs` | Código fuente de las pruebas de base de datos |
| `scripts/http_whitebox.mjs` | Código fuente de las pruebas HTTP, carga y conectividad |

## Reproducción

```powershell
# Móvil
cd apps/mobile
flutter pub get
flutter analyze
flutter test --coverage

# API
pnpm --filter api test -- --coverage

# Base de datos (requiere .env.practica11 con DATABASE_URL; no versionado)
node evidencias/practica11/scripts/db_whitebox.mjs

# HTTP, carga y conectividad
node evidencias/practica11/scripts/http_whitebox.mjs
Test-Connection -ComputerName musica-masvida-api.onrender.com -Count 20
```

## Notas

- El script de base de datos crea usuarios, eventos e inscripciones temporales y **los elimina en el bloque `finally`**; puede ejecutarse varias veces sin dejar residuos.
- El script HTTP crea eventos temporales y los elimina al final (`limpieza.eliminados = 13/13`).
- La cadena de conexión de Neon **no** se incluye en el repositorio.
- El host de Neon no responde ICMP; la latencia se midió mediante consultas SQL.
- No se usó emulador ni dispositivo Android (no disponibles en el equipo); la suite Flutter se ejecutó en el runner de Windows.
