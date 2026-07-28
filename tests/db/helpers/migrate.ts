import { readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import type { PGlite } from '@electric-sql/pglite';

const MIGRATIONS_DIR = path.resolve(__dirname, '../../../drizzle');

/**
 * Aplica las migraciones SQL generadas por drizzle-kit sobre una instancia
 * de PGlite. Usamos el SQL real —no un `push` en memoria— para que los tests
 * ejerciten exactamente el DDL que llegará a producción, incluidos los
 * NOT NULL y los CHECK que hacen cumplir RB-05 y RB-11.
 */
export async function migrate(client: PGlite): Promise<void> {
  const files = readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort();

  if (files.length === 0) {
    throw new Error(`No hay migraciones en ${MIGRATIONS_DIR}. Corre: npm run db:generate`);
  }

  for (const file of files) {
    const sql = readFileSync(path.join(MIGRATIONS_DIR, file), 'utf8');
    // drizzle-kit separa las sentencias con este marcador.
    for (const stmt of sql.split('--> statement-breakpoint')) {
      const trimmed = stmt.trim();
      if (trimmed) await client.exec(trimmed);
    }
  }
}
