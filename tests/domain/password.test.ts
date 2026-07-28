import { describe, it, expect } from 'vitest';
import { validatePassword, shouldLock, lockedUntil, MAX_FAILED_ATTEMPTS } from '@/domain/password';

describe('validatePassword', () => {
  it('acepta una contraseña razonable', () => {
    expect(validatePassword('mi casa azul 1980')).toEqual({ ok: true });
  });

  // RF-01: "la contraseña debe cumplir requisitos mínimos".
  it('rechaza una contraseña demasiado corta', () => {
    const r = validatePassword('corta1');
    expect(r.ok).toBe(false);
    expect(!r.ok && r.error).toMatch(/10 caracteres/);
  });

  it('rechaza contraseñas evidentes', () => {
    expect(validatePassword('contraseña').ok).toBe(false);
    expect(validatePassword('1234567890').ok).toBe(false);
  });

  it('rechaza que la contraseña contenga el correo', () => {
    const r = validatePassword('carlos@ejemplo.mx!', 'carlos@ejemplo.mx');
    expect(r.ok).toBe(false);
  });

  it('rechaza que la contraseña contenga el usuario del correo', () => {
    expect(validatePassword('carlosmiperro99', 'carlos@ejemplo.mx').ok).toBe(false);
  });

  it('no impone caracteres especiales: una frase larga es válida', () => {
    // §17.7 — usabilidad; persona de 45-70 con experiencia digital básica.
    expect(validatePassword('el perro come croquetas').ok).toBe(true);
  });

  it('rechaza una contraseña vacía', () => {
    expect(validatePassword('').ok).toBe(false);
  });
});

describe('bloqueo temporal por intentos fallidos (RF-01)', () => {
  it('no bloquea por debajo del máximo', () => {
    expect(shouldLock(MAX_FAILED_ATTEMPTS - 1)).toBe(false);
  });

  it('bloquea al alcanzar el máximo', () => {
    expect(shouldLock(MAX_FAILED_ATTEMPTS)).toBe(true);
    expect(shouldLock(MAX_FAILED_ATTEMPTS + 3)).toBe(true);
  });

  it('el bloqueo tiene fin: devuelve una fecha futura', () => {
    const ahora = new Date('2026-07-28T10:00:00Z');
    const hasta = lockedUntil(ahora);
    expect(hasta.getTime()).toBeGreaterThan(ahora.getTime());
  });

  it('el bloqueo crece con los intentos', () => {
    const ahora = new Date('2026-07-28T10:00:00Z');
    const a = lockedUntil(ahora, MAX_FAILED_ATTEMPTS).getTime();
    const b = lockedUntil(ahora, MAX_FAILED_ATTEMPTS + 5).getTime();
    expect(b).toBeGreaterThan(a);
  });

  it('el bloqueo nunca pasa de una hora: el usuario legítimo recupera su cuenta', () => {
    const ahora = new Date('2026-07-28T10:00:00Z');
    const UNA_HORA = 60 * 60 * 1000;

    for (const intentos of [MAX_FAILED_ATTEMPTS + 50, MAX_FAILED_ATTEMPTS + 500]) {
      const espera = lockedUntil(ahora, intentos).getTime() - ahora.getTime();
      expect(espera).toBe(UNA_HORA);
    }
  });
});
