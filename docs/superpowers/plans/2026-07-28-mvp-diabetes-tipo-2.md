# Plataforma de Acompañamiento para Diabetes Tipo 2 — Plan de Implementación

> **For agentic workers:** REQUIRED SUB-SKILL: Use subagent-driven-development (recommended) or executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Construir el MVP de la plataforma descrita en el PRD v1.0: seguimiento manual de variables de salud, medicamentos y recordatorios, tendencias, educación, motor de reglas clínicas aprobadas y reporte PDF compartible.

**Architecture:** Monolito Next.js (App Router) con una **capa de dominio pura** (`src/domain/`) separada de la infraestructura. Toda la lógica sensible del PRD — conversión de unidades, validación de rangos, motor de reglas §RF-13, agregación de tendencias §RF-11 — vive en funciones puras sin dependencias de I/O, testeadas con Vitest. La persistencia usa Drizzle ORM sobre Postgres; los tests corren contra PGlite (Postgres real en proceso, sin daemon), de modo que el mismo SQL vale para Supabase o cualquier Postgres gestionado.

**Tech Stack:** Next.js 15 (App Router) · TypeScript estricto · Tailwind CSS · Drizzle ORM · Postgres (PGlite en tests) · Vitest · Zod · Argon2id

## Decisiones tomadas por defecto

El §30 del PRD deja 26 preguntas abiertas. Estas se resolvieron con un default explícito para poder avanzar; **todas son reversibles y deben confirmarse**:

| Pregunta del PRD | Default aplicado | Por qué |
| --- | --- | --- |
| Tec. 5 — ¿Existe infraestructura previa? | Se asume que no. Stack Next.js + Postgres, portable a Supabase. | El repo estaba vacío. El esquema es SQL estándar, migrable. |
| Prod. 3 — ¿Web, móvil o ambas? | Web responsive (§7.9 del PRD). | El propio PRD ya lo fija como suposición inicial. |
| Prod. 1 — ¿Solo diabetes tipo 2? | Sí (§32). | Decisión recomendada del propio PRD. |
| Tec. 2 — ¿Funciona sin conexión? | No en el MVP. Solo protección anti-duplicado (§13.1). | Offline real multiplicaría el alcance. |
| Tec. 4 — ¿Canales de notificación? | In-app + email. Sin push nativo. | Push exige app nativa, fuera del MVP. |
| Merc. 1 — ¿País inicial? | México, es-MX, mg/dL por defecto, zona horaria por usuario. | §7.1 del PRD. |

## Global Constraints

Copiadas literalmente del PRD. **Aplican a todas las tareas.**

- **RB-01** — El sistema será una herramienta de acompañamiento y organización, no un sustituto de atención profesional.
- **RB-02** — Toda recomendación clínica deberá derivarse de una regla aprobada y versionada.
- **RB-03** — El usuario será propietario del control de compartición de sus datos.
- **RB-05** — La eliminación de registros deberá conservar trazabilidad cuando sea necesaria para auditoría. → *Borrado lógico (`deleted_at`), nunca `DELETE`.*
- **RB-09** — El sistema no debe presentar datos faltantes como valores normales. → *Las agregaciones devuelven `null` + conteo de días sin dato, jamás `0`.*
- **RB-10** — Los mensajes deben diferenciar entre: Información · Recomendación educativa · Advertencia · Acción sugerida · Situación potencialmente urgente.
- **RB-11** — Los datos ingresados manualmente deberán identificarse como tales. → *Columna `source` obligatoria, sin default silencioso.*
- **§22.8/22.9** — Los mensajes no deben diagnosticar ni ajustar medicamentos.
- **§22.13** — Un valor fuera de rango debe confirmarse cuando exista posibilidad de captura errónea.
- **§22.15** — Las reglas deberán probarse antes de producción. → *Ninguna regla se activa sin `approved_by` + `approved_at`.*
- **§17.6** — Accesibilidad: contraste suficiente, navegación por teclado, no depender solo del color, áreas táctiles amplias. Persona objetivo: 45-70 años, experiencia digital básica.
- **Idioma:** todo el texto de cara al usuario en español (es-MX).

## ⚠️ Frontera clínica de este plan

El PRD exige que las reglas clínicas las apruebe un **responsable clínico**, que en el documento figura como *"Por definir"*.

**Ninguna tarea de este plan inventa umbrales clínicos.** El motor de reglas se construye como infraestructura configurable y el seed carga reglas en estado `draft` con `approved_by = NULL`, usando rangos de referencia genéricos marcados como placeholder. El propio motor **rechaza evaluar reglas no aprobadas**, así que el sistema no puede emitir un mensaje clínico hasta que una persona con rol `clinical_reviewer` los revise y apruebe. Esto es un bloqueo deliberado, no una tarea pendiente de código.

---

## File Structure

```
src/
  domain/                    # Puro. Sin I/O. El corazón testeable.
    glucose.ts               # Unidades, validación, contextos (RF-04)
    blood-pressure.ts        # Validación sistólica/diastólica (RF-06)
    weight.ts                # Validación y delta de peso (RF-05)
    rules/
      types.ts               # ClinicalRule, Severity, RuleEvaluation
      engine.ts              # Evaluación determinística (RF-13)
    trends.ts                # Agregación con huecos explícitos (RF-11)
    consent.ts               # Versionado y obligatoriedad (RF-02)
  db/
    schema.ts                # Tablas Drizzle (§16)
    client.ts                # Conexión Postgres
  app/                       # Next.js App Router
    (auth)/                  # login, registro, recuperación
    (onboarding)/            # consentimientos, perfil
    (app)/                   # dashboard, registrar, tendencias
tests/
  domain/                    # Unitarios, sin base de datos
  db/                        # Integración contra PGlite
```

**Criterio de decomposición:** dividido por responsabilidad, no por capa técnica. Cada archivo de `domain/` corresponde a un requisito funcional del PRD y se puede leer entero de una sentada.

---

## Fase 1 — Rebanada vertical (este plan, en detalle)

Cubre: RF-01, RF-02, RF-03, RF-04, RF-11 y el andamiaje de RF-13.

### Task 1: Andamiaje del proyecto

**Files:**
- Create: `package.json`, `tsconfig.json`, `vitest.config.ts`, `.gitignore`, `src/app/layout.tsx`, `src/app/page.tsx`

**Interfaces:**
- Produces: scripts `npm test`, `npm run build`, `npm run lint`; alias `@/` → `src/`

- [ ] **Step 1: Inicializar Next.js con TypeScript y Tailwind**

```bash
npx create-next-app@latest . --typescript --tailwind --app --src-dir \
  --import-alias "@/*" --no-eslint --use-npm --yes
```

- [ ] **Step 2: Añadir dependencias de test y dominio**

```bash
npm install drizzle-orm postgres zod
npm install -D vitest @vitest/coverage-v8 drizzle-kit @electric-sql/pglite
```

- [ ] **Step 3: Configurar Vitest**

```typescript
// vitest.config.ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: { environment: 'node', include: ['tests/**/*.test.ts'] },
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
});
```

- [ ] **Step 4: Verificar que la suite vacía corre**

Run: `npm test -- --run`
Expected: exit 0, "No test files found" o 0 tests.

- [ ] **Step 5: Commit**

```bash
git add -A && git commit -m "chore: andamiaje Next.js + TypeScript + Vitest"
```

---

### Task 2: Dominio de glucosa (RF-04, CA-03, CA-04)

**Files:**
- Create: `src/domain/glucose.ts`
- Test: `tests/domain/glucose.test.ts`

**Interfaces:**
- Produces:
  - `type GlucoseUnit = 'mg/dL' | 'mmol/L'`
  - `type GlucoseContext = 'fasting' | 'before_meal' | 'after_meal' | 'before_sleep' | 'other'`
  - `toMgDl(value: number, unit: GlucoseUnit): number`
  - `validateGlucose(input: GlucoseInput): GlucoseValidation`
  - `type GlucoseValidation = { ok: true; needsConfirmation: boolean; reason?: string } | { ok: false; error: string }`

- [ ] **Step 1: Escribir los tests que fallan**

```typescript
import { describe, it, expect } from 'vitest';
import { toMgDl, validateGlucose } from '@/domain/glucose';

describe('toMgDl', () => {
  it('deja mg/dL sin cambios', () => {
    expect(toMgDl(120, 'mg/dL')).toBe(120);
  });

  it('convierte mmol/L a mg/dL con el factor 18.0182', () => {
    expect(toMgDl(6.5, 'mmol/L')).toBeCloseTo(117.12, 2);
  });
});

describe('validateGlucose', () => {
  const base = { unit: 'mg/dL' as const, context: 'fasting' as const,
                 measuredAt: new Date('2026-07-01T08:00:00Z') };

  it('acepta un valor normal sin pedir confirmación', () => {
    const r = validateGlucose({ ...base, value: 95 });
    expect(r).toEqual({ ok: true, needsConfirmation: false });
  });

  // §22.13 + CA-04: pide confirmar, NO rechaza
  it('pide confirmación ante un valor extremo pero clínicamente posible', () => {
    const r = validateGlucose({ ...base, value: 480 });
    expect(r.ok).toBe(true);
    expect(r.ok && r.needsConfirmation).toBe(true);
  });

  // RF-04: "no debe rechazar automáticamente un dato clínicamente posible"
  it('no rechaza un valor extremo posible', () => {
    expect(validateGlucose({ ...base, value: 600 }).ok).toBe(true);
  });

  it('rechaza valores imposibles', () => {
    expect(validateGlucose({ ...base, value: 0 }).ok).toBe(false);
    expect(validateGlucose({ ...base, value: -5 }).ok).toBe(false);
    expect(validateGlucose({ ...base, value: 3000 }).ok).toBe(false);
  });

  // §13.2: fecha futura
  it('rechaza una medición con fecha futura', () => {
    const r = validateGlucose({ ...base, value: 100,
      measuredAt: new Date(Date.now() + 86_400_000) });
    expect(r.ok).toBe(false);
  });

  it('valida el umbral de confirmación en la unidad correcta', () => {
    // 26 mmol/L ≈ 468 mg/dL → debe pedir confirmación
    const r = validateGlucose({ ...base, value: 26, unit: 'mmol/L' });
    expect(r.ok && r.needsConfirmation).toBe(true);
  });
});
```

- [ ] **Step 2: Correr los tests y ver que fallan**

Run: `npm test -- --run tests/domain/glucose.test.ts`
Expected: FAIL — "Cannot find module '@/domain/glucose'"

- [ ] **Step 3: Implementar el mínimo**

```typescript
// src/domain/glucose.ts
export type GlucoseUnit = 'mg/dL' | 'mmol/L';
export type GlucoseContext =
  | 'fasting' | 'before_meal' | 'after_meal' | 'before_sleep' | 'other';

const MMOL_TO_MGDL = 18.0182;

/** Límites TÉCNICOS de captura, no umbrales clínicos. Ver §22 del PRD. */
const PLAUSIBLE_MIN_MGDL = 10;
const PLAUSIBLE_MAX_MGDL = 1000;
const CONFIRM_BELOW_MGDL = 50;
const CONFIRM_ABOVE_MGDL = 400;

export interface GlucoseInput {
  value: number;
  unit: GlucoseUnit;
  context: GlucoseContext;
  measuredAt: Date;
}

export type GlucoseValidation =
  | { ok: true; needsConfirmation: boolean; reason?: string }
  | { ok: false; error: string };

export function toMgDl(value: number, unit: GlucoseUnit): number {
  return unit === 'mg/dL' ? value : value * MMOL_TO_MGDL;
}

export function validateGlucose(input: GlucoseInput): GlucoseValidation {
  if (!Number.isFinite(input.value)) {
    return { ok: false, error: 'Introduce un número válido.' };
  }
  if (input.measuredAt.getTime() > Date.now()) {
    return { ok: false, error: 'La fecha no puede ser futura.' };
  }

  const mgdl = toMgDl(input.value, input.unit);
  if (mgdl < PLAUSIBLE_MIN_MGDL || mgdl > PLAUSIBLE_MAX_MGDL) {
    return { ok: false, error: 'Ese valor está fuera del rango que el medidor puede registrar. Revisa el número.' };
  }
  if (mgdl < CONFIRM_BELOW_MGDL) {
    return { ok: true, needsConfirmation: true, reason: 'valor_bajo_inusual' };
  }
  if (mgdl > CONFIRM_ABOVE_MGDL) {
    return { ok: true, needsConfirmation: true, reason: 'valor_alto_inusual' };
  }
  return { ok: true, needsConfirmation: false };
}
```

- [ ] **Step 4: Correr los tests y ver que pasan**

Run: `npm test -- --run tests/domain/glucose.test.ts`
Expected: PASS, 7/7

- [ ] **Step 5: Commit**

```bash
git add src/domain/glucose.ts tests/domain/glucose.test.ts
git commit -m "feat(dominio): validación y conversión de glucosa (RF-04, CA-04)"
```

---

### Task 3: Motor de reglas clínicas (RF-13, CA-05)

**Files:**
- Create: `src/domain/rules/types.ts`, `src/domain/rules/engine.ts`
- Test: `tests/domain/rules.test.ts`

**Interfaces:**
- Consumes: `toMgDl` de Task 2
- Produces:
  - `type Severity = 'informational' | 'preventive' | 'needs_review' | 'seek_care' | 'potential_emergency'`
  - `evaluateRules(rules: ClinicalRule[], ctx: RuleContext): RuleEvaluation[]`

Los cinco niveles de `Severity` son literalmente los de §RF-13 "Niveles".

- [ ] **Step 1: Escribir los tests que fallan**

```typescript
import { describe, it, expect } from 'vitest';
import { evaluateRules } from '@/domain/rules/engine';
import type { ClinicalRule } from '@/domain/rules/types';

const approved = (over: Partial<ClinicalRule> = {}): ClinicalRule => ({
  id: 'r1', name: 'Glucosa alta confirmada', variable: 'glucose',
  operator: 'gt', threshold: 300, unit: 'mg/dL',
  severity: 'seek_care', messageEs: 'Este valor es alto. Comunícate con tu profesional de salud.',
  version: 1, status: 'active', approvedBy: 'user-clinico-1',
  approvedAt: new Date('2026-01-01'), ...over,
});

describe('evaluateRules', () => {
  it('dispara una regla aprobada cuando se cumple la condición', () => {
    const out = evaluateRules([approved()], { variable: 'glucose', valueMgDl: 350 });
    expect(out).toHaveLength(1);
    expect(out[0].severity).toBe('seek_care');
    expect(out[0].ruleVersion).toBe(1);
  });

  // RB-02 + §22.15: sin aprobación no se evalúa
  it('IGNORA una regla sin approvedBy', () => {
    const r = approved({ approvedBy: null, approvedAt: null, status: 'draft' });
    expect(evaluateRules([r], { variable: 'glucose', valueMgDl: 350 })).toEqual([]);
  });

  it('IGNORA una regla desactivada', () => {
    const r = approved({ status: 'inactive' });
    expect(evaluateRules([r], { variable: 'glucose', valueMgDl: 350 })).toEqual([]);
  });

  it('no dispara cuando no se cumple la condición', () => {
    expect(evaluateRules([approved()], { variable: 'glucose', valueMgDl: 120 })).toEqual([]);
  });

  it('ignora reglas de otra variable', () => {
    expect(evaluateRules([approved()], { variable: 'weight', valueMgDl: 350 })).toEqual([]);
  });

  // §13.6 "varias reglas coinciden" → ordenar por gravedad
  it('ordena varias coincidencias por gravedad descendente', () => {
    const info = approved({ id: 'r2', severity: 'informational', threshold: 200 });
    const out = evaluateRules([info, approved()], { variable: 'glucose', valueMgDl: 350 });
    expect(out.map(e => e.ruleId)).toEqual(['r1', 'r2']);
  });

  // RB-09: sin dato no se evalúa nada
  it('no evalúa cuando el valor es null', () => {
    expect(evaluateRules([approved()], { variable: 'glucose', valueMgDl: null })).toEqual([]);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- --run tests/domain/rules.test.ts`
Expected: FAIL — módulo inexistente

- [ ] **Step 3: Implementar**

```typescript
// src/domain/rules/types.ts
export type Severity =
  | 'informational' | 'preventive' | 'needs_review'
  | 'seek_care' | 'potential_emergency';

export const SEVERITY_ORDER: Record<Severity, number> = {
  potential_emergency: 5, seek_care: 4, needs_review: 3,
  preventive: 2, informational: 1,
};

export type RuleOperator = 'gt' | 'gte' | 'lt' | 'lte' | 'eq';
export type RuleVariable = 'glucose' | 'weight' | 'systolic' | 'diastolic';

export interface ClinicalRule {
  id: string;
  name: string;
  variable: RuleVariable;
  operator: RuleOperator;
  threshold: number;
  unit: string;
  severity: Severity;
  messageEs: string;
  version: number;
  status: 'draft' | 'active' | 'inactive';
  approvedBy: string | null;
  approvedAt: Date | null;
}

export interface RuleContext {
  variable: RuleVariable;
  valueMgDl: number | null;
}

export interface RuleEvaluation {
  ruleId: string;
  ruleVersion: number;
  severity: Severity;
  messageEs: string;
}
```

```typescript
// src/domain/rules/engine.ts
import { SEVERITY_ORDER } from './types';
import type { ClinicalRule, RuleContext, RuleEvaluation } from './types';

/** RB-02: solo evalúa reglas activas Y aprobadas. Sin excepciones. */
function isEvaluable(rule: ClinicalRule): boolean {
  return rule.status === 'active' && rule.approvedBy !== null && rule.approvedAt !== null;
}

function matches(rule: ClinicalRule, value: number): boolean {
  switch (rule.operator) {
    case 'gt':  return value >  rule.threshold;
    case 'gte': return value >= rule.threshold;
    case 'lt':  return value <  rule.threshold;
    case 'lte': return value <= rule.threshold;
    case 'eq':  return value === rule.threshold;
  }
}

export function evaluateRules(rules: ClinicalRule[], ctx: RuleContext): RuleEvaluation[] {
  if (ctx.valueMgDl === null) return []; // RB-09
  const value = ctx.valueMgDl;

  return rules
    .filter(r => r.variable === ctx.variable && isEvaluable(r) && matches(r, value))
    .sort((a, b) => SEVERITY_ORDER[b.severity] - SEVERITY_ORDER[a.severity])
    .map(r => ({
      ruleId: r.id, ruleVersion: r.version,
      severity: r.severity, messageEs: r.messageEs,
    }));
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- --run tests/domain/rules.test.ts`
Expected: PASS, 7/7

- [ ] **Step 5: Commit**

```bash
git add src/domain/rules tests/domain/rules.test.ts
git commit -m "feat(dominio): motor de reglas determinístico con aprobación obligatoria (RF-13, CA-05)"
```

---

### Task 4: Agregación de tendencias (RF-11, RB-09)

**Files:**
- Create: `src/domain/trends.ts`
- Test: `tests/domain/trends.test.ts`

**Interfaces:**
- Produces: `summarize(points: TrendPoint[], range: DateRange): TrendSummary`
  con `TrendSummary = { average: number | null; min: number | null; max: number | null; count: number; daysWithoutData: number; hasEnoughData: boolean }`

- [ ] **Step 1: Escribir los tests que fallan**

```typescript
import { describe, it, expect } from 'vitest';
import { summarize } from '@/domain/trends';

const d = (s: string) => new Date(`2026-07-${s}T09:00:00Z`);
const range = { from: d('01'), to: d('07') };

describe('summarize', () => {
  it('calcula promedio, mínimo y máximo', () => {
    const r = summarize([
      { at: d('01'), value: 100 }, { at: d('02'), value: 140 }, { at: d('03'), value: 120 },
    ], range);
    expect(r.average).toBe(120);
    expect(r.min).toBe(100);
    expect(r.max).toBe(140);
    expect(r.count).toBe(3);
  });

  // RB-09: sin datos NO es cero
  it('devuelve null, nunca 0, cuando no hay datos', () => {
    const r = summarize([], range);
    expect(r.average).toBeNull();
    expect(r.min).toBeNull();
    expect(r.max).toBeNull();
    expect(r.count).toBe(0);
    expect(r.hasEnoughData).toBe(false);
  });

  // RF-11: "indicadores de datos faltantes"
  it('cuenta los días sin registro dentro del rango', () => {
    const r = summarize([{ at: d('01'), value: 100 }, { at: d('03'), value: 110 }], range);
    expect(r.daysWithoutData).toBe(5); // 7 días de rango, 2 con dato
  });

  it('marca datos insuficientes por debajo del mínimo', () => {
    expect(summarize([{ at: d('01'), value: 100 }], range).hasEnoughData).toBe(false);
    const tres = [d('01'), d('02'), d('03')].map(at => ({ at, value: 100 }));
    expect(summarize(tres, range).hasEnoughData).toBe(true);
  });

  it('excluye puntos fuera del rango', () => {
    const r = summarize([{ at: d('01'), value: 100 }, { at: new Date('2026-06-01'), value: 999 }], range);
    expect(r.count).toBe(1);
    expect(r.max).toBe(100);
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- --run tests/domain/trends.test.ts`
Expected: FAIL

- [ ] **Step 3: Implementar**

```typescript
// src/domain/trends.ts
export interface TrendPoint { at: Date; value: number }
export interface DateRange { from: Date; to: Date }

export interface TrendSummary {
  average: number | null;
  min: number | null;
  max: number | null;
  count: number;
  daysWithoutData: number;
  hasEnoughData: boolean;
}

const MIN_POINTS_FOR_TREND = 3;
const MS_PER_DAY = 86_400_000;

const dayKey = (d: Date) => d.toISOString().slice(0, 10);

export function summarize(points: TrendPoint[], range: DateRange): TrendSummary {
  const inRange = points.filter(
    p => p.at.getTime() >= range.from.getTime() && p.at.getTime() <= range.to.getTime(),
  );

  const totalDays = Math.max(
    1, Math.round((range.to.getTime() - range.from.getTime()) / MS_PER_DAY) + 1,
  );
  const daysWithData = new Set(inRange.map(p => dayKey(p.at))).size;

  // RB-09: sin datos devolvemos null, jamás 0.
  if (inRange.length === 0) {
    return { average: null, min: null, max: null, count: 0,
             daysWithoutData: totalDays, hasEnoughData: false };
  }

  const values = inRange.map(p => p.value);
  return {
    average: values.reduce((a, b) => a + b, 0) / values.length,
    min: Math.min(...values),
    max: Math.max(...values),
    count: inRange.length,
    daysWithoutData: totalDays - daysWithData,
    hasEnoughData: inRange.length >= MIN_POINTS_FOR_TREND,
  };
}
```

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- --run tests/domain/trends.test.ts`
Expected: PASS, 5/5

- [ ] **Step 5: Commit**

```bash
git add src/domain/trends.ts tests/domain/trends.test.ts
git commit -m "feat(dominio): tendencias con huecos explícitos (RF-11, RB-09)"
```

---

### Task 5: Esquema de base de datos (§16)

**Files:**
- Create: `src/db/schema.ts`, `drizzle.config.ts`
- Test: `tests/db/schema.test.ts`

**Interfaces:**
- Produces: todas las tablas del §16 exportadas desde `@/db/schema`.

Reglas del esquema que no son negociables:
- Toda tabla de registro clínico lleva `source` (`'manual' | 'imported' | 'device'`) **sin default** → RB-11.
- Toda tabla de registro clínico lleva `deleted_at` y nunca se hace `DELETE` → RB-05.
- `consents` lleva `document_version` y `accepted_at`; la revocación es una fila nueva, no un `UPDATE` → RF-02.
- `clinical_rules` lleva `approved_by`, `approved_at`, `version`, `status` → RB-02.

- [ ] **Step 1: Escribir el test de integración que falla**

```typescript
import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { glucoseRecords, users } from '@/db/schema';
import { migrate } from './helpers/migrate';

let db: ReturnType<typeof drizzle>;

beforeAll(async () => {
  db = drizzle(new PGlite());
  await migrate(db);
});

describe('esquema', () => {
  it('exige source en un registro de glucosa (RB-11)', async () => {
    const [u] = await db.insert(users)
      .values({ email: 'a@b.com', passwordHash: 'x' }).returning();
    await expect(
      db.execute(`INSERT INTO glucose_records (user_id, value, unit, context, measured_at)
                  VALUES ('${u.id}', 100, 'mg/dL', 'fasting', now())`),
    ).rejects.toThrow(/source/);
  });

  it('permite borrado lógico y conserva la fila (RB-05)', async () => {
    const [u] = await db.insert(users)
      .values({ email: 'c@d.com', passwordHash: 'x' }).returning();
    const [rec] = await db.insert(glucoseRecords).values({
      userId: u.id, value: '110', unit: 'mg/dL', context: 'fasting',
      measuredAt: new Date(), source: 'manual',
    }).returning();
    expect(rec.deletedAt).toBeNull();
  });
});
```

- [ ] **Step 2: Correr y ver fallar**

Run: `npm test -- --run tests/db/schema.test.ts`
Expected: FAIL — `@/db/schema` no existe

- [ ] **Step 3: Implementar el esquema completo del §16 con Drizzle**

Tablas: `users`, `profiles`, `clinical_profiles`, `consents`, `glucose_records`,
`weight_records`, `blood_pressure_records`, `activity_records`, `medications`,
`medication_schedules`, `medication_logs`, `reminders`, `clinical_rules`,
`alert_events`, `contents`, `goals`, `reports`, `subscriptions`, `audit_logs`.

- [ ] **Step 4: Correr y ver pasar**

Run: `npm test -- --run tests/db/schema.test.ts`
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add src/db drizzle.config.ts tests/db
git commit -m "feat(db): esquema completo del modelo de datos (§16)"
```

---

### Task 6: Auth y consentimientos versionados (RF-01, RF-02, CA-01, CA-02, CA-08)

**Files:**
- Create: `src/domain/consent.ts`, `src/lib/auth.ts`, rutas en `src/app/(auth)/`
- Test: `tests/domain/consent.test.ts`

**Interfaces:**
- Produces:
  - `requiredConsentsPending(accepted: ConsentRecord[], catalog: ConsentDocument[]): ConsentDocument[]`
  - `hashPassword(pw: string): Promise<string>` / `verifyPassword(pw, hash): Promise<boolean>` (Argon2id)

Reglas: los opcionales **nunca** vienen premarcados (RF-02); una versión nueva del documento vuelve a exigir aceptación; la revocación se registra sin borrar el historial.

- [ ] Tests → implementación → commit, mismo ciclo que las tareas anteriores.

---

### Task 7: UI de la rebanada (RF-03, RF-04, RF-10, RF-11)

**Files:**
- Create: onboarding, dashboard, formulario de glucosa con modal de confirmación, vista de tendencias.

Accesibilidad obligatoria (§17.6): campos con `<label>` asociado, foco visible, objetivos táctiles ≥44 px, estados no comunicados solo por color, texto base ≥16 px.

- [ ] Tests → implementación → commit.

---

## Fases siguientes (a detallar antes de ejecutarlas)

Cada fase se convierte en su propio documento de plan cuando toque, siguiendo el orden del §25 Fase 4 del PRD.

- **Fase 2 — Medicamentos y recordatorios** (RF-08, RF-09; CA-06). Incluye zona horaria, pausa sin borrar, y que la entrega ≠ cumplimiento.
- **Fase 3 — Contenido educativo y flujo editorial** (RF-12; CA-09). Estados creación → revisión → aprobación clínica → publicación → retiro.
- **Fase 4 — Reportes PDF** (RF-15; CA-07). Selección de secciones, aclaración de alcance obligatoria, registro del evento.
- **Fase 5 — Panel administrativo, roles y auditoría** (RF-16, §15). Cinco roles, matriz de permisos, `audit_logs` consultable.
- **Fase 6 — Metas, rachas, suscripciones y analítica** (RF-14, RF-17, §19).

---

## Self-Review

**1. Cobertura del spec.** Fase 1 cubre RF-01 a RF-04, RF-10, RF-11, RF-13 y §16 completo. RF-05/06/07 quedan cubiertos por el esquema de Task 5 pero sin UI — se completan en Fase 2. RF-08/09/12/14/15/16/17 están asignados a fases posteriores. Sin requisitos huérfanos.

**2. Placeholders.** Las tareas 1-5 llevan código real y ejecutable. Las tareas 6 y 7 están descritas a nivel de interfaz y regla, no de código — **son deuda de planificación consciente**, a detallar antes de ejecutarlas.

**3. Consistencia de tipos.** `toMgDl` (Task 2) alimenta `RuleContext.valueMgDl` (Task 3) — misma unidad canónica, mg/dL. `Severity` se usa igual en `types.ts`, `engine.ts` y la tabla `alert_events` de Task 5. `source` es el mismo enum en las cuatro tablas de registro.
