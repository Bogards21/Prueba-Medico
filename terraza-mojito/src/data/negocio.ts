/**
 * Fuente única de datos del negocio.
 *
 * IMPORTANTE — PRD §14 y §60: "No inventar estos datos durante desarrollo."
 * Los campos con `pendiente: true` NO se renderizan en la web: en su lugar
 * la UI muestra un aviso de dato faltante. En cuanto llegue la información
 * real de Google Maps se llenan aquí y aparecen en toda la app.
 */

export type DatoPendiente<T> = { valor: T; pendiente: boolean };

const pendiente = <T,>(placeholder: T): DatoPendiente<T> => ({
  valor: placeholder,
  pendiente: true,
});

const confirmado = <T,>(valor: T): DatoPendiente<T> => ({ valor, pendiente: false });

export type DiaSemana = 0 | 1 | 2 | 3 | 4 | 5 | 6;

export interface HorarioDia {
  dia: DiaSemana;
  abre: string | null; // "HH:mm" — null = cerrado
  cierra: string | null;
}

export const NOMBRE_DIA: Record<DiaSemana, string> = {
  0: 'Domingo',
  1: 'Lunes',
  2: 'Martes',
  3: 'Miércoles',
  4: 'Jueves',
  5: 'Viernes',
  6: 'Sábado',
};

export const negocio = {
  nombre: confirmado('Terraza Mojito'),
  tagline: confirmado('Frescura que se comparte.'),
  ciudad: confirmado('Metepec, Estado de México'),

  // --- Pendientes de Google Maps ---
  direccion: pendiente('Dirección pendiente de confirmar'),
  coordenadas: pendiente<{ lat: number; lng: number } | null>(null),
  telefono: pendiente(''),
  whatsapp: pendiente(''),
  email: pendiente(''),
  rating: pendiente<{ valor: number; resenas: number } | null>(null),

  /**
   * Testimonios reales de clientes. Es lo único que convierte de verdad en una
   * landing de venta, y por lo mismo es lo único que NO se puede inventar:
   * publicar reseñas falsas es engañoso y, en México, sancionable por la
   * PROFECO. Se llenan copiando reseñas reales de Google o redes, con permiso.
   */
  resenas: pendiente<
    { texto: string; autor: string; fuente: string }[]
  >([]),
  categoria: pendiente('Bar · Terraza'),
  rangoPrecios: pendiente(''),

  // --- Confirmados por las redes del negocio ---
  redes: confirmado({
    instagram: 'https://www.instagram.com/terraza_mojitometepec/',
    facebook: 'https://www.facebook.com/p/Terraza-Mojito-Metepec-61579700160729/',
    tiktok: 'https://www.tiktok.com/@terraza_mojitometepec',
  }),

  /**
   * Horarios provisionales SOLO para que el motor de reservas sea navegable
   * en desarrollo. En producción los sobreescribe `availability_rules` de la
   * base de datos, configurable desde el Back Office (PRD RN-09).
   */
  horarios: pendiente<HorarioDia[]>([
    { dia: 0, abre: '13:00', cierra: '20:00' },
    { dia: 1, abre: null, cierra: null },
    { dia: 2, abre: '17:00', cierra: '23:00' },
    { dia: 3, abre: '17:00', cierra: '23:00' },
    { dia: 4, abre: '17:00', cierra: '23:00' },
    { dia: 5, abre: '17:00', cierra: '01:00' },
    { dia: 6, abre: '13:00', cierra: '01:00' },
  ]),
} as const;

/** Reglas de reserva. Configurables desde Back Office en producción. */
export const reglasReserva = {
  intervaloMinutos: 30,
  antelacionMinimaHoras: 2,
  diasMaximosAnticipacion: 60,
  personasMaximoDirecto: 8, // >8 se marca como "grupo grande" (PRD §15 paso 3)
  personasMaximoAbsoluto: 30,
  capacidadPorFranja: 40,
} as const;

export const AVISO_DATO_PENDIENTE =
  'Dato pendiente de confirmar con el negocio.';
