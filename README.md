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
| `src/domain/consent.ts` | RF-02, CA-02, CA-08 | Consentimientos versionados; los opcionales nunca vienen premarcados |
| `src/domain/password.ts` | RF-01 | Política de contraseñas y bloqueo temporal con tope |
| `src/lib/session-token.ts` | RF-01 | Sesión firmada con HMAC y expiración dentro de la firma |
| `src/domain/profile.ts` | RF-03 | Perfil personal y clínico; coherencia entre nacimiento, edad y diagnóstico |
| `src/domain/weight.ts` | RF-05 | Peso, conversión kg/lb y cambio respecto a la medición anterior |
| `src/domain/blood-pressure.ts` | RF-06 | Presión arterial; sistólica > diastólica y confirmación de cifras atípicas |
| `src/domain/time-zone.ts` | RF-09, §13.4 | Hora civil ↔ UTC vía Intl, correcta en cambios de horario de verano |
| `src/domain/medication.ts` | RF-08, RF-09, CA-06 | Tomas previstas por día civil y adherencia autorreportada |
| `src/domain/report.ts` | RF-15, CA-07 | Armado del reporte; solo lo que el usuario marca, con aclaración de alcance |

Pantallas: alta de cuenta con verificación de correo, inicio y cierre de
sesión, onboarding de consentimientos y perfil, edición de perfil, dashboard,
registro de glucosa, peso y presión arterial, gestión de medicamentos con
sus tomas del día, y reporte en PDF para la consulta.

### Pendiente

Actividad física (RF-07), contenido educativo (RF-12), metas (RF-14), panel
administrativo (RF-16) y suscripciones (RF-17).

Los recordatorios se calculan y se muestran dentro de la aplicación, pero
**todavía no se envían** por ningún canal: eso depende del servicio de
notificaciones del §27, aún no contratado.

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

Hace falta un Postgres. Con uno local:

```bash
createdb prueba_medico
for f in drizzle/*.sql; do psql -d prueba_medico -f "$f"; done
```

```bash
npm install
cp .env.example .env.local   # ajusta DATABASE_URL
npm test                     # unitarios e integración (Vitest)
npm run typecheck            # tsc --noEmit
npm run dev                  # servidor de desarrollo
npm run build
```

Pruebas de navegador, con el servidor levantado en otra terminal:

```bash
npm run test:e2e:auth        # alta, verificación, consentimientos, sesión
npm run test:e2e             # registro de glucosa y dashboard
npm run test:e2e:mediciones  # perfil, peso y presión arterial
npm run test:e2e:medicamentos # medicamentos, tomas y adherencia
npm run test:e2e:reportes    # reporte para la consulta y descarga del PDF
```

Cada corrida crea su propia cuenta, así que no hace falta vaciar la base.

### Configuración

`DATABASE_URL` es **obligatoria** y apunta a cualquier Postgres.

Hubo una versión que embebía PGlite cuando faltaba, para no exigir una base en
desarrollo. Se retiró: PGlite solo admite un proceso sobre su directorio de
datos, y el servidor de desarrollo de Next atiende páginas, acciones y route
handlers desde procesos distintos, así que la descarga del PDF abría una
segunda instancia y reventaba. PGlite se sigue usando en los tests de
integración, donde sí hay un único proceso.

`SESSION_SECRET` firma las cookies de sesión y es **obligatoria en
producción**: sin ella el servidor se niega a crear sesiones. En desarrollo,
si falta, se usa un secreto conocido e inseguro y se avisa por consola.

## Frontera clínica en el código

El motor de reglas **rechaza evaluar cualquier regla que no tenga `approvedBy`
y `approvedAt`** (`src/domain/rules/engine.ts`). Esto no es validación
defensiva: es el mecanismo que impide que la plataforma emita un mensaje
clínico que ningún profesional haya revisado, tal como exige el §22 del PRD.

Los umbrales que aparecen en `src/domain/glucose.ts` son límites **técnicos de
captura** (¿pudo un glucómetro producir este número?), no criterios clínicos.
Los criterios clínicos son datos, no código, y requieren aprobación de un
responsable clínico —cargo que el PRD todavía marca como *"Por definir"*.
