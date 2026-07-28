import 'server-only';

import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import type { PgDatabase } from 'drizzle-orm/pg-core';
import * as schema from './schema';

/**
 * Conexión a Postgres.
 *
 * `DATABASE_URL` es obligatoria en todos los entornos. Hubo una versión
 * anterior que embebía PGlite cuando faltaba, para no exigir una base en
 * desarrollo; se retiró porque PGlite solo admite UN proceso sobre su
 * directorio de datos, y el servidor de desarrollo de Next atiende páginas,
 * acciones de servidor y route handlers desde procesos distintos. La
 * consecuencia era que la descarga de un PDF abría una segunda instancia,
 * reventaba con `Aborted()` y acababa redirigiendo a la pantalla de acceso.
 *
 * PGlite se sigue usando en los tests de integración (`tests/db/`), donde sí
 * hay un único proceso y aporta un Postgres real sin daemon.
 */

type Db = PgDatabase<any, typeof schema>;

let instancia: Db | null = null;

export async function getDb(): Promise<Db> {
  if (instancia) return instancia;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error(
      'Falta DATABASE_URL. Copia .env.example a .env.local y apunta a tu Postgres.',
    );
  }

  // El tamaño del pool se puede ajustar por entorno.
  const max = Number(process.env.DATABASE_POOL_MAX) || 10;

  instancia = drizzle(postgres(url, { max }), { schema }) as unknown as Db;
  return instancia;
}
