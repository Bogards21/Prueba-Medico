import { z } from 'zod';
import { reglasReserva } from '@/data/negocio';
import { OCASIONES } from './tipos';

/** Deja solo dígitos y quita el 52 / +52 de país si viene incluido. */
export function normalizarTelefono(entrada: string): string {
  const digitos = entrada.replace(/\D/g, '');
  if (digitos.length === 12 && digitos.startsWith('52')) return digitos.slice(2);
  if (digitos.length === 13 && digitos.startsWith('521')) return digitos.slice(3);
  return digitos;
}

export function telefonoInternacional(local: string): string {
  return `+52${normalizarTelefono(local)}`;
}

export function normalizarEmail(entrada: string): string {
  return entrada.trim().toLowerCase();
}

const soloEspacios = (s: string) => s.trim().length > 0;

export const esquemaReserva = z.object({
  first_name: z
    .string()
    .trim()
    .min(2, 'El nombre debe tener al menos 2 caracteres')
    .max(60, 'Máximo 60 caracteres')
    .refine(soloEspacios, 'El nombre no puede estar vacío'),

  last_name: z
    .string()
    .trim()
    .min(2, 'Los apellidos deben tener al menos 2 caracteres')
    .max(60, 'Máximo 60 caracteres'),

  phone: z
    .string()
    .transform(normalizarTelefono)
    .refine((v) => v.length === 10, 'El teléfono debe tener 10 dígitos'),

  email: z
    .string()
    .trim()
    .toLowerCase()
    .email('Correo electrónico no válido')
    .max(120),

  reservation_date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Selecciona una fecha'),

  reservation_time: z
    .string()
    .regex(/^\d{2}:\d{2}$/, 'Selecciona un horario'),

  party_size: z.coerce
    .number()
    .int('Número de personas inválido')
    .min(1, 'Debe ser al menos 1 persona')
    .max(
      reglasReserva.personasMaximoAbsoluto,
      `Para grupos de más de ${reglasReserva.personasMaximoAbsoluto} personas contáctanos directamente`,
    ),

  occasion: z.enum(OCASIONES).nullable().optional(),

  special_requests: z
    .string()
    .trim()
    .max(300, 'Máximo 300 caracteres')
    .nullable()
    .optional(),

  // PRD §16 y §47: el consentimiento comercial va SEPARADO del de privacidad.
  privacy_accepted: z
    .boolean()
    .refine((v) => v === true, 'Debes aceptar el aviso de privacidad para continuar'),

  marketing_consent: z.boolean().default(false),
});

export type DatosReserva = z.infer<typeof esquemaReserva>;
export type EntradaReserva = z.input<typeof esquemaReserva>;

/** Errores por campo, en el shape que consume el formulario. */
export function erroresPorCampo(
  error: z.ZodError,
): Record<string, string> {
  const salida: Record<string, string> = {};
  for (const issue of error.issues) {
    const campo = String(issue.path[0] ?? '_');
    if (!salida[campo]) salida[campo] = issue.message;
  }
  return salida;
}
