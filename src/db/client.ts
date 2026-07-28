import 'server-only';

import type { PgDatabase } from 'drizzle-orm/pg-core';
import * as schema from './schema';

/**
 * Conexión a la base de datos.
 *
 * En producción se usa `DATABASE_URL` (cualquier Postgres gestionado:
 * Supabase, RDS, Neon…). En desarrollo, si no hay `DATABASE_URL`, se levanta
 * PGlite persistido en `.pgdata/` — Postgres real compilado a WASM, mismo
 * dialecto y mismas migraciones, sin necesidad de daemon ni contenedor.
 *
 * El SQL es idéntico en ambos casos: las migraciones de `drizzle/` se aplican
 * tal cual, así que no hay deriva entre desarrollo y producción.
 */

type Db = PgDatabase<any, typeof schema>;

let dbPromise: Promise<Db> | null = null;

async function createDb(): Promise<Db> {
  const url = process.env.DATABASE_URL;

  if (url) {
    const [{ drizzle }, postgres] = await Promise.all([
      import('drizzle-orm/postgres-js'),
      import('postgres').then((m) => m.default),
    ]);
    return drizzle(postgres(url), { schema }) as unknown as Db;
  }

  const [{ PGlite }, { drizzle }, { readFileSync, readdirSync }, path] = await Promise.all([
    import('@electric-sql/pglite'),
    import('drizzle-orm/pglite'),
    import('node:fs'),
    import('node:path'),
  ]);

  const client = new PGlite('.pgdata');

  // Aplica las migraciones si la base está vacía.
  const { rows } = await client.query<{ count: string }>(
    `SELECT count(*)::text AS count FROM information_schema.tables
     WHERE table_schema = 'public' AND table_name = 'users'`,
  );

  if (rows[0]?.count === '0') {
    const dir = path.default.resolve(process.cwd(), 'drizzle');
    const files = readdirSync(dir).filter((f) => f.endsWith('.sql')).sort();
    for (const file of files) {
      const sql = readFileSync(path.default.join(dir, file), 'utf8');
      for (const stmt of sql.split('--> statement-breakpoint')) {
        const trimmed = stmt.trim();
        if (trimmed) await client.exec(trimmed);
      }
    }
  }

  return drizzle(client, { schema }) as unknown as Db;
}

export function getDb(): Promise<Db> {
  dbPromise ??= createDb();
  return dbPromise;
}
