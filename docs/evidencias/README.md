# Evidencias — Módulo 5, Sección 2: Pipelines de GitHub Actions

Fecha de las ejecuciones: 2026-10-18.

- **Local**: Node v22.18.0 y pnpm 12.14.0, en Windows.
- **Remoto**: GitHub Actions con `ubuntu-latest` y Node 22.

`logs/` y `github/logs/` contienen la salida real de cada comando. `local/` y `github/cli/` tienen esas mismas salidas en formato de terminal. Las capturas de `github/*.png` son de las páginas públicas del repositorio.

## Por task

| Task | Evidencia |
|---|---|
| **S2.1** Pipeline CI | [`.github/workflows/ci.yml`](../../.github/workflows/ci.yml) · [run #1 exitoso](github/01-run-exito.png) · [resumen de pasos](github/cli/run1-exito-resumen.png) · [historial del workflow](github/05-historial-runs.png) |
| **S2.2** Instalación | [local](local/01-install.png) · paso "Instalar dependencias" en el [resumen del run #1](github/cli/run1-exito-resumen.png) |
| **S2.3** Pruebas y análisis estático | Tipos: [local](local/02-tsc.png) · ESLint: [local](local/03-lint.png) · Vitest: [local](local/04-test.png) |
| **S2.4** Build y validación | Build: [local](local/05-build.png) · Artefactos: [local](local/06-artefactos.png) · Prueba de humo: [local](local/07-smoke.png) |
| **S2.5** Detección de fallos | Ver las dos secciones siguientes |

## S2.5 — Fallos inyectados en local (uno por etapa)

Cada fallo se introdujo de forma temporal y el archivo se restauró después. Todos terminan con un código de salida distinto de cero, que es lo que hace fallar el paso en GitHub Actions.

| # | Fallo inyectado | Paso que lo detecta | Captura |
|---|---|---|---|
| f1 | `package.json` desincronizado de `pnpm-lock.yaml` | Instalación (`ERR_PNPM_OUTDATED_LOCKFILE`) | [f1](local/f1-lockfile.png) |
| f2 | Error de tipos | `tsc --noEmit` (TS2322) | [f2](local/f2-tsc.png) |
| f3 | Hook condicional | ESLint (`react-hooks/rules-of-hooks`) | [f3](local/f3-lint-error.png) |
| f4 | Un warning nuevo (36 > 35) | ESLint (`--max-warnings`) | [f4](local/f4-lint-warnings.png) |
| f5 | Regresión en el motor (2.5 → 3 GB/h) | Vitest (4 pruebas fallan) | [f5](local/f5-test.png) |
| f6 | Import a un módulo inexistente | `next build` (TS2307) | [f6](local/f6-build.png) |
| f7 | Cambio del título de la página | Prueba de humo | [f7](local/f7-smoke.png) |

## S2.5 — Validación en GitHub Actions

| Run | Commit | Resultado | Evidencia |
|---|---|---|---|
| #1 | `ee87e2f` pipeline | ✅ success | [página](github/01-run-exito.png) · [pasos](github/cli/run1-exito-resumen.png) |
| #2 | `7516f8f` regresión intencional | ❌ failure en "Ejecutar pruebas"; build, artefactos y prueba de humo se omiten | [página](github/03-run-fallo-regresion.png) · [pasos](github/cli/run2-fallo-resumen.png) · [log](github/cli/run2-log-fallido.png) |
| #3 | `25d7116` revert | ✅ success | [página](github/04-run-exito-tras-revertir.png) · [pasos](github/cli/run3-exito-resumen.png) |

## Require status checks to pass before merging

El ruleset **ResilientOps CI Protection.** está activo sobre `refs/heads/main` y nadie tiene permiso para saltárselo. Exige el check **Tipos, lint, pruebas y build** de la app GitHub Actions (integration id 15368).

- Configuración: [ruleset](github/cli/r1-ruleset.png) · [reglas efectivas en `main`](github/cli/r2-reglas-main.png)
- **PR #1** (pipeline correcto): el check pasa y el PR queda en estado `CLEAN`. [checks](github/cli/pr1-checks.png) · [página](github/06-pr1.png)
- **PR #2** (regresión): el check falla y el PR queda en estado `BLOCKED`, aunque no tiene conflictos (`MERGEABLE`). [checks](github/cli/pr2-checks.png) · [página](github/07-pr2.png)
