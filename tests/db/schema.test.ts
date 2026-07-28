import { describe, it, expect, beforeAll } from 'vitest';
import { PGlite } from '@electric-sql/pglite';
import { drizzle } from 'drizzle-orm/pglite';
import { eq } from 'drizzle-orm';
import { migrate } from './helpers/migrate';
import {
  users,
  consents,
  glucoseRecords,
  clinicalRules,
  auditLogs,
} from '@/db/schema';

let client: PGlite;
let db: ReturnType<typeof drizzle>;

async function nuevoUsuario(email: string) {
  const [u] = await db.insert(users).values({ email, passwordHash: 'x' }).returning();
  return u;
}

beforeAll(async () => {
  client = new PGlite();
  await migrate(client);
  db = drizzle(client);
});

describe('users', () => {
  it('exige correo único (RF-01: "el correo debe ser único")', async () => {
    await nuevoUsuario('unico@ejemplo.mx');
    await expect(nuevoUsuario('unico@ejemplo.mx')).rejects.toThrow();
  });

  it('arranca sin verificar el correo (CA-01)', async () => {
    const u = await nuevoUsuario('pendiente@ejemplo.mx');
    expect(u.emailVerifiedAt).toBeNull();
    expect(u.status).toBe('pending_verification');
  });
});

describe('glucose_records', () => {
  it('rechaza un registro sin source (RB-11)', async () => {
    const u = await nuevoUsuario('sinsource@ejemplo.mx');
    await expect(
      client.exec(
        `INSERT INTO glucose_records (user_id, value, unit, context, measured_at)
         VALUES ('${u.id}', 100, 'mg/dL', 'fasting', now())`,
      ),
    ).rejects.toThrow(/source/i);
  });

  it('no tiene default silencioso para source (RB-11)', async () => {
    const [col] = (
      await client.query<{ column_default: string | null }>(
        `SELECT column_default FROM information_schema.columns
         WHERE table_name = 'glucose_records' AND column_name = 'source'`,
      )
    ).rows;
    expect(col.column_default).toBeNull();
  });

  it('conserva la fila al borrar lógicamente (RB-05)', async () => {
    const u = await nuevoUsuario('borrado@ejemplo.mx');
    const [rec] = await db
      .insert(glucoseRecords)
      .values({
        userId: u.id,
        value: '110',
        unit: 'mg/dL',
        context: 'fasting',
        measuredAt: new Date(),
        source: 'manual',
      })
      .returning();
    expect(rec.deletedAt).toBeNull();

    await db
      .update(glucoseRecords)
      .set({ deletedAt: new Date() })
      .where(eq(glucoseRecords.id, rec.id));

    const vivas = await db.select().from(glucoseRecords).where(eq(glucoseRecords.id, rec.id));
    expect(vivas).toHaveLength(1);
    expect(vivas[0].deletedAt).not.toBeNull();
  });

  it('borra los registros en cascada si se elimina la cuenta (CA-10)', async () => {
    const u = await nuevoUsuario('cascada@ejemplo.mx');
    await db.insert(glucoseRecords).values({
      userId: u.id,
      value: '100',
      unit: 'mg/dL',
      context: 'other',
      measuredAt: new Date(),
      source: 'manual',
    });
    await db.delete(users).where(eq(users.id, u.id));
    const quedan = await db
      .select()
      .from(glucoseRecords)
      .where(eq(glucoseRecords.userId, u.id));
    expect(quedan).toHaveLength(0);
  });
});

describe('consents', () => {
  it('guarda versión y fecha de aceptación (RF-02)', async () => {
    const u = await nuevoUsuario('consent@ejemplo.mx');
    const [c] = await db
      .insert(consents)
      .values({
        userId: u.id,
        consentType: 'privacy_notice',
        documentVersion: '2026-07-01',
        accepted: true,
        acceptedAt: new Date(),
      })
      .returning();
    expect(c.documentVersion).toBe('2026-07-01');
    expect(c.revokedAt).toBeNull();
  });

  it('permite historial de varias versiones del mismo consentimiento (RF-02)', async () => {
    const u = await nuevoUsuario('historial@ejemplo.mx');
    for (const v of ['2026-01-01', '2026-07-01']) {
      await db.insert(consents).values({
        userId: u.id,
        consentType: 'terms',
        documentVersion: v,
        accepted: true,
        acceptedAt: new Date(),
      });
    }
    const filas = await db.select().from(consents).where(eq(consents.userId, u.id));
    expect(filas).toHaveLength(2);
  });
});

describe('clinical_rules', () => {
  it('nace en borrador y sin aprobar (RB-02, §22)', async () => {
    const [r] = await db
      .insert(clinicalRules)
      .values({
        name: 'Placeholder',
        variable: 'glucose',
        operator: 'gt',
        threshold: '300',
        unit: 'mg/dL',
        severity: 'seek_care',
        messageEs: 'Pendiente de aprobación clínica.',
      })
      .returning();
    expect(r.status).toBe('draft');
    expect(r.approvedBy).toBeNull();
    expect(r.approvedAt).toBeNull();
    expect(r.version).toBe(1);
  });

  it('impide marcar una regla como activa sin aprobación (§22.15)', async () => {
    await expect(
      client.exec(
        `INSERT INTO clinical_rules (name, variable, operator, threshold, unit, severity, message_es, status)
         VALUES ('Sin aprobar', 'glucose', 'gt', 300, 'mg/dL', 'seek_care', 'x', 'active')`,
      ),
    ).rejects.toThrow(/aprobad|approved|check/i);
  });
});

describe('audit_logs', () => {
  it('conserva el registro aunque se elimine el actor (RB-05)', async () => {
    const u = await nuevoUsuario('auditor@ejemplo.mx');
    await db.insert(auditLogs).values({
      actorId: u.id,
      action: 'glucose_record_created',
      entityType: 'glucose_records',
      entityId: u.id,
    });
    await db.delete(users).where(eq(users.id, u.id));
    const filas = await db.select().from(auditLogs);
    expect(filas.length).toBeGreaterThan(0);
    expect(filas.at(-1)?.actorId).toBeNull();
  });
});
