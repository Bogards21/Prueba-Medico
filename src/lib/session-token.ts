import { createHmac, timingSafeEqual } from 'node:crypto';

/**
 * Firma y verificación del token de sesión — RF-01.
 *
 * Sin dependencias de Next ni de cookies, a propósito: así la parte que
 * decide si una sesión es válida se puede probar de forma exhaustiva. El
 * manejo de la cookie vive en `session.ts`.
 *
 * Cookie firmada con HMAC-SHA256 y sin estado en servidor. La expiración va
 * dentro del payload firmado, así que no se puede alargar desde el cliente.
 * El token no contiene ningún dato de salud: solo el id de usuario.
 */

export const SESSION_MAX_AGE_S = 60 * 60 * 8; // 8 horas

/**
 * Secreto de respaldo para desarrollo. Es una CONSTANTE, y eso es
 * deliberado: el servidor de desarrollo de Next atiende las acciones de
 * servidor y los route handlers desde procesos distintos, así que un valor
 * aleatorio —aunque se guardara en `globalThis`— sería diferente en cada
 * proceso. La cookie firmada al iniciar sesión no validaría al descargar un
 * PDF, y la descarga acabaría redirigiendo a la pantalla de acceso.
 *
 * No es secreto ni pretende serlo. En producción no se usa nunca: si falta
 * SESSION_SECRET, el arranque de sesión falla de forma explícita.
 */
const DEV_FALLBACK_SECRET =
  'desarrollo-inseguro-no-usar-en-produccion-prueba-medico-0000';

let avisoEmitido = false;

function secret(): string {
  const s = process.env.SESSION_SECRET;
  if (s && s.length >= 32) return s;

  if (process.env.NODE_ENV === 'production') {
    throw new Error(
      'Falta SESSION_SECRET (mínimo 32 caracteres). Sin él las sesiones no son seguras.',
    );
  }

  if (!avisoEmitido) {
    avisoEmitido = true;
    console.warn(
      '[sesión] SESSION_SECRET no está definida: se usa un secreto de desarrollo conocido. ' +
        'Define SESSION_SECRET antes de exponer este servidor a alguien más.',
    );
  }

  return DEV_FALLBACK_SECRET;
}

function sign(payload: string): string {
  return createHmac('sha256', secret()).update(payload).digest('base64url');
}

function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

export interface SessionData {
  userId: string;
  exp: number;
}

export function createToken(userId: string, now = Date.now()): string {
  const payload = Buffer.from(
    JSON.stringify({ userId, exp: Math.floor(now / 1000) + SESSION_MAX_AGE_S }),
  ).toString('base64url');

  return `${payload}.${sign(payload)}`;
}

export function readToken(token: string | undefined, now = Date.now()): SessionData | null {
  if (!token) return null;

  const partes = token.split('.');
  if (partes.length !== 2) return null;

  const [payload, signature] = partes;
  if (!payload || !signature) return null;
  if (!safeEqual(signature, sign(payload))) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString()) as SessionData;
    if (typeof data.userId !== 'string' || typeof data.exp !== 'number') return null;
    if (data.exp * 1000 <= now) return null; // RF-01: expiración
    return data;
  } catch {
    return null;
  }
}
