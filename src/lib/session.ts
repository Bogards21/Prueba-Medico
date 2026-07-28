import 'server-only';

import { cookies } from 'next/headers';
import { createToken, readToken, SESSION_MAX_AGE_S } from './session-token';

/** Manejo de la cookie de sesión. La firma y validación viven en session-token.ts. */

const COOKIE = 'pm_session';

export async function startSession(userId: string): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, createToken(userId), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_MAX_AGE_S,
  });
}

export async function endSession(): Promise<void> {
  (await cookies()).delete(COOKIE);
}

/** Identificador del usuario de la sesión vigente, o `null`. */
export async function getSessionUserId(): Promise<string | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  return readToken(token)?.userId ?? null;
}
