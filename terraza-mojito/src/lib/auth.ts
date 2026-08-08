import 'server-only';
import { createHmac, timingSafeEqual } from 'crypto';
import { cookies } from 'next/headers';

/**
 * Autenticación del Back Office.
 *
 * Sesión firmada con HMAC en cookie httpOnly. Las credenciales viven en
 * variables de entorno, no en la base de datos.
 *
 * ALCANCE: sirve para el equipo pequeño que describe el PRD (§34: Admin y
 * Staff). No cubre alta de usuarios desde la interfaz, recuperación de
 * contraseña ni 2FA. Si el negocio crece a varios usuarios con altas y bajas,
 * migrar a Supabase Auth y sustituir este módulo — el resto del código solo
 * depende de `sesionActual()` y `Rol`.
 */

export type Rol = 'admin' | 'staff';

export interface Sesion {
  usuario: string;
  rol: Rol;
  expira: number;
}

const COOKIE = 'tm_sesion';
const DURACION_MS = 12 * 60 * 60 * 1000; // 12 h

function secreto(): string | null {
  return process.env.AUTH_SECRET || null;
}

/** En desarrollo se permite entrar sin configurar nada; en producción no. */
export function authConfigurada(): boolean {
  return Boolean(secreto() && (process.env.ADMIN_PASSWORD || process.env.STAFF_PASSWORD));
}

export function permiteAccesoDeDesarrollo(): boolean {
  return process.env.NODE_ENV !== 'production' && !authConfigurada();
}

function firmar(carga: string, clave: string): string {
  return createHmac('sha256', clave).update(carga).digest('base64url');
}

function comparar(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  if (ba.length !== bb.length) return false;
  return timingSafeEqual(ba, bb);
}

function serializar(sesion: Sesion, clave: string): string {
  const carga = Buffer.from(JSON.stringify(sesion)).toString('base64url');
  return `${carga}.${firmar(carga, clave)}`;
}

function deserializar(token: string, clave: string): Sesion | null {
  const [carga, firma] = token.split('.');
  if (!carga || !firma) return null;
  if (!comparar(firma, firmar(carga, clave))) return null;
  try {
    const sesion = JSON.parse(Buffer.from(carga, 'base64url').toString()) as Sesion;
    if (typeof sesion.expira !== 'number' || sesion.expira < Date.now()) return null;
    if (sesion.rol !== 'admin' && sesion.rol !== 'staff') return null;
    return sesion;
  } catch {
    return null;
  }
}

/**
 * Verifica credenciales. Devuelve la sesión o null.
 * La comparación es de tiempo constante para no filtrar la contraseña.
 */
export function verificarCredenciales(usuario: string, contrasena: string): Sesion | null {
  const u = usuario.trim().toLowerCase();

  if (permiteAccesoDeDesarrollo()) {
    // Solo fuera de producción y solo mientras no haya credenciales reales.
    if (u === 'admin' && contrasena === 'demo') {
      return { usuario: 'admin', rol: 'admin', expira: Date.now() + DURACION_MS };
    }
    return null;
  }

  const admin = process.env.ADMIN_PASSWORD;
  const staff = process.env.STAFF_PASSWORD;
  const usuarioAdmin = (process.env.ADMIN_USER || 'admin').toLowerCase();
  const usuarioStaff = (process.env.STAFF_USER || 'staff').toLowerCase();

  if (admin && u === usuarioAdmin && comparar(contrasena, admin)) {
    return { usuario: usuarioAdmin, rol: 'admin', expira: Date.now() + DURACION_MS };
  }
  if (staff && u === usuarioStaff && comparar(contrasena, staff)) {
    return { usuario: usuarioStaff, rol: 'staff', expira: Date.now() + DURACION_MS };
  }
  return null;
}

export async function iniciarSesion(sesion: Sesion): Promise<void> {
  const clave = secreto() ?? 'desarrollo-sin-secreto';
  const almacen = await cookies();
  almacen.set(COOKIE, serializar(sesion, clave), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: DURACION_MS / 1000,
  });
}

export async function cerrarSesion(): Promise<void> {
  const almacen = await cookies();
  almacen.delete(COOKIE);
}

export async function sesionActual(): Promise<Sesion | null> {
  const clave = secreto() ?? 'desarrollo-sin-secreto';
  const almacen = await cookies();
  const token = almacen.get(COOKIE)?.value;
  if (!token) return null;
  return deserializar(token, clave);
}

/**
 * PRD §46: los permisos se validan en el servidor, no ocultando botones.
 * Solo Admin puede ver reportes y configuración.
 */
export function puedeVerReportes(sesion: Sesion): boolean {
  return sesion.rol === 'admin';
}
