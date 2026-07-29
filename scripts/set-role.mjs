/**
 * Asigna un rol a una cuenta por correo.
 *
 *   node scripts/set-role.mjs alguien@ejemplo.mx clinical_reviewer
 *
 * Existe porque la gestión de usuarios del panel administrativo (RF-16)
 * todavía no está construida y el primer responsable clínico tiene que salir
 * de algún sitio. Cuando RF-16 exista, esto se queda solo para el arranque
 * inicial de un entorno.
 */

import { readFileSync, existsSync } from 'node:fs';
import postgres from 'postgres';

/** Next carga .env.local por su cuenta; este script corre fuera, así que lo lee él. */
function cargarEnvLocal() {
  if (!existsSync('.env.local')) return;

  for (const linea of readFileSync('.env.local', 'utf8').split('\n')) {
    const limpia = linea.trim();
    if (!limpia || limpia.startsWith('#')) continue;

    const i = limpia.indexOf('=');
    if (i === -1) continue;

    const clave = limpia.slice(0, i).trim();
    const valor = limpia.slice(i + 1).trim().replace(/^["']|["']$/g, '');
    process.env[clave] ??= valor;
  }
}

cargarEnvLocal();

const ROLES = ['patient', 'admin', 'editor', 'clinical_reviewer', 'support', 'analyst'];

const [email, role] = process.argv.slice(2);

if (!email || !role) {
  console.error('Uso: node scripts/set-role.mjs <correo> <rol>');
  console.error(`Roles: ${ROLES.join(', ')}`);
  process.exit(1);
}

if (!ROLES.includes(role)) {
  console.error(`Rol desconocido: ${role}. Debe ser uno de: ${ROLES.join(', ')}`);
  process.exit(1);
}

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Falta DATABASE_URL.');
  process.exit(1);
}

const sql = postgres(url, { max: 1 });

const filas = await sql`
  UPDATE users SET role = ${role} WHERE email = ${email.toLowerCase()}
  RETURNING id, email, role
`;

if (filas.length === 0) {
  console.error(`No existe ninguna cuenta con el correo ${email}.`);
  await sql.end();
  process.exit(1);
}

console.log(`${filas[0].email} ahora tiene el rol ${filas[0].role}.`);
await sql.end();
