# Prueba-Medico

Plataforma digital de acompañamiento para adultos con **diabetes tipo 2**.

Permite al paciente registrar glucosa, peso, presión arterial, medicamentos y
actividad física; ver tendencias; recibir recordatorios; consultar contenido
educativo aprobado; y generar un resumen para compartir con su médico.

> **Alcance clínico.** Esta plataforma es una herramienta de seguimiento,
> educación y organización de información. **No diagnostica, no prescribe, no
> ajusta tratamientos y no sustituye la atención médica profesional ni los
> servicios de emergencia.** Ver §33 del PRD.

## Estado

MVP en construcción. Fase 1 (rebanada vertical) en curso.

- **PRD:** el documento fuente v1.0 define 17 requisitos funcionales, 12 reglas
  de negocio y 10 criterios de aceptación.
- **Plan:** [`docs/superpowers/plans/2026-07-28-mvp-diabetes-tipo-2.md`](docs/superpowers/plans/2026-07-28-mvp-diabetes-tipo-2.md)

### Implementado

| Módulo | Requisito | Estado |
| --- | --- | --- |
| `src/domain/glucose.ts` | RF-04, CA-04 | Validación, conversión de unidades y confirmación de valores inusuales |
| `src/domain/rules/` | RF-13, CA-05 | Motor determinístico; solo evalúa reglas aprobadas y versionadas |
| `src/domain/trends.ts` | RF-11, RB-09 | Agregación con huecos explícitos; nunca presenta ausencia como cero |

### Pendiente

Esquema de datos (§16), autenticación y consentimientos (RF-01/RF-02), UI,
medicamentos y recordatorios (RF-08/RF-09), contenido educativo (RF-12),
reportes PDF (RF-15), panel administrativo (RF-16) y suscripciones (RF-17).

## Arquitectura

La lógica sensible vive en `src/domain/`, en funciones **puras y sin I/O**, para
que sea testeable de forma exhaustiva y auditable sin levantar infraestructura.
La persistencia y el framework se acoplan por encima, nunca al revés.

```
src/domain/     Reglas del PRD. Sin dependencias de base de datos ni de Next.
src/db/         Esquema Drizzle y conexión a Postgres.
src/app/        Next.js App Router.
tests/domain/   Unitarios, sin base de datos.
tests/db/       Integración contra PGlite (Postgres en proceso).
```

**Stack:** Next.js 16 (App Router) · TypeScript · Tailwind CSS · Drizzle ORM ·
Postgres · Vitest

## Desarrollo

```bash
npm install
npm test          # Vitest
npm run typecheck # tsc --noEmit
npm run dev       # servidor de desarrollo
npm run build
```

## Frontera clínica en el código

El motor de reglas **rechaza evaluar cualquier regla que no tenga `approvedBy`
y `approvedAt`** (`src/domain/rules/engine.ts`). Esto no es validación
defensiva: es el mecanismo que impide que la plataforma emita un mensaje
clínico que ningún profesional haya revisado, tal como exige el §22 del PRD.

Los umbrales que aparecen en `src/domain/glucose.ts` son límites **técnicos de
captura** (¿pudo un glucómetro producir este número?), no criterios clínicos.
Los criterios clínicos son datos, no código, y requieren aprobación de un
responsable clínico —cargo que el PRD todavía marca como *"Por definir"*.
