import { describe, it, expect, beforeAll } from 'vitest';

// La firma depende de SESSION_SECRET; fijarlo hace los tests deterministas.
beforeAll(() => {
  process.env.SESSION_SECRET = 'secreto-de-pruebas-con-mas-de-32-caracteres';
});

const { createToken, readToken } = await import('@/lib/session-token');

const AHORA = new Date('2026-07-28T10:00:00Z').getTime();
const UNA_HORA = 60 * 60 * 1000;

describe('sesión firmada', () => {
  it('lee de vuelta el usuario de un token válido', () => {
    const t = createToken('usuario-1', AHORA);
    expect(readToken(t, AHORA)?.userId).toBe('usuario-1');
  });

  // RF-01: "las sesiones deben expirar".
  it('rechaza un token expirado', () => {
    const t = createToken('usuario-1', AHORA);
    expect(readToken(t, AHORA + 9 * UNA_HORA)).toBeNull();
  });

  it('acepta el token dentro de su ventana de validez', () => {
    const t = createToken('usuario-1', AHORA);
    expect(readToken(t, AHORA + 7 * UNA_HORA)).not.toBeNull();
  });

  it('rechaza un token con la firma alterada', () => {
    const t = createToken('usuario-1', AHORA);
    const [payload] = t.split('.');
    expect(readToken(`${payload}.firmafalsa`, AHORA)).toBeNull();
  });

  // Lo importante: no se puede cambiar de usuario ni alargar la sesión.
  it('rechaza un payload manipulado aunque esté bien formado', () => {
    const falso = Buffer.from(
      JSON.stringify({ userId: 'otro-usuario', exp: 99_999_999_999 }),
    ).toString('base64url');
    const original = createToken('usuario-1', AHORA);
    const [, firma] = original.split('.');
    expect(readToken(`${falso}.${firma}`, AHORA)).toBeNull();
  });

  it('rechaza entradas vacías o mal formadas', () => {
    expect(readToken(undefined, AHORA)).toBeNull();
    expect(readToken('', AHORA)).toBeNull();
    expect(readToken('sinpunto', AHORA)).toBeNull();
    expect(readToken('a.b.c.d', AHORA)).toBeNull();
  });
});
