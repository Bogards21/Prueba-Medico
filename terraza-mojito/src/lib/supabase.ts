import { createClient, type SupabaseClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

/**
 * La app arranca sin Supabase para poder desarrollar y revisar la UI, pero
 * en ese caso NO persiste nada. `estaConfigurado` es la bandera que la UI usa
 * para avisarlo de forma visible en lugar de fingir que guardó.
 */
export const estaConfigurado = Boolean(url && anonKey);

export const tieneServiceRole = Boolean(url && serviceKey);

/** Cliente de solo lectura pública. Sujeto a RLS. */
export function clientePublico(): SupabaseClient | null {
  if (!url || !anonKey) return null;
  return createClient(url, anonKey, { auth: { persistSession: false } });
}

/**
 * Cliente con service role. SOLO servidor — nunca importar desde un
 * componente cliente. Salta RLS, así que toda autorización debe validarse
 * antes de llamarlo (PRD §46: "los permisos deben validarse en backend").
 */
export function clienteServicio(): SupabaseClient | null {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, { auth: { persistSession: false } });
}
