/**
 * Política de contraseñas y bloqueo temporal — RF-01.
 *
 * El PRD pide "requisitos mínimos" y "bloqueo temporal ante intentos
 * fallidos", sin fijar cuáles. La política favorece LONGITUD sobre
 * composición: exigir mayúsculas, dígitos y símbolos a una persona de 45-70
 * años con experiencia digital básica (§8.1) produce contraseñas peores y
 * más apuntadas en papel. Una frase larga es más segura y más usable (§17.7).
 */

const MIN_LENGTH = 10;

/** Contraseñas evidentes. En producción conviene una lista más amplia. */
const OBVIAS = new Set([
  'contraseña',
  'contrasena',
  'password',
  '1234567890',
  '0123456789',
  'qwertyuiop',
  'diabetes1',
  'micontraseña',
]);

export type PasswordValidation = { ok: true } | { ok: false; error: string };

export function validatePassword(password: string, email?: string): PasswordValidation {
  if (password.length < MIN_LENGTH) {
    return {
      ok: false,
      error: `Tu contraseña debe tener al menos ${MIN_LENGTH} caracteres. Una frase que recuerdes funciona bien.`,
    };
  }

  const normalizada = password.toLowerCase();

  if (OBVIAS.has(normalizada)) {
    return { ok: false, error: 'Esa contraseña es demasiado fácil de adivinar. Elige otra.' };
  }

  if (/^(\d)\1+$/.test(password) || /^(.)\1+$/.test(password)) {
    return { ok: false, error: 'Esa contraseña es demasiado fácil de adivinar. Elige otra.' };
  }

  if (email) {
    const correo = email.toLowerCase();
    const usuario = correo.split('@')[0];
    if (normalizada.includes(correo) || (usuario.length >= 4 && normalizada.includes(usuario))) {
      return { ok: false, error: 'Tu contraseña no debe contener tu correo electrónico.' };
    }
  }

  return { ok: true };
}

/* ───────────────── Bloqueo temporal por intentos fallidos ───────────────── */

export const MAX_FAILED_ATTEMPTS = 5;

const BASE_LOCK_MS = 60_000; // 1 minuto tras alcanzar el máximo
const MAX_LOCK_MS = 60 * 60 * 1000; // tope de 1 hora

export function shouldLock(failedAttempts: number): boolean {
  return failedAttempts >= MAX_FAILED_ATTEMPTS;
}

/**
 * Retardo creciente con tope. Frena la fuerza bruta sin dejar a un usuario
 * legítimo fuera de su cuenta indefinidamente.
 */
export function lockedUntil(now: Date, failedAttempts: number = MAX_FAILED_ATTEMPTS): Date {
  const exceso = Math.max(0, failedAttempts - MAX_FAILED_ATTEMPTS);
  const espera = Math.min(BASE_LOCK_MS * 2 ** exceso, MAX_LOCK_MS);
  return new Date(now.getTime() + espera);
}
