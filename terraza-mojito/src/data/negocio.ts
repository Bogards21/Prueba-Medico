/**
 * Fuente única de datos del negocio.
 *
 * ┌──────────────────────────────────────────────────────────────────────┐
 * │  CONTENIDO_DEMO = true  →  la web muestra DATOS DE EJEMPLO INVENTADOS │
 * │                                                                      │
 * │  Sirve para enseñarle al cliente cómo se verá la página terminada.    │
 * │  Dirección, teléfono, correo, reseñas, calificación y precios NO son  │
 * │  reales. ANTES DE PUBLICAR: pon el interruptor en false y llena los   │
 * │  valores reales, o la web publicará una dirección y un teléfono que   │
 * │  no existen.                                                         │
 * └──────────────────────────────────────────────────────────────────────┘
 *
 * Con el interruptor en false, cada campo sin confirmar vuelve a marcarse
 * como pendiente y la interfaz muestra un aviso en vez de inventarlo
 * (PRD §14 y §60).
 */
export const CONTENIDO_DEMO = true;

export type Dato<T> = { valor: T; pendiente: boolean; esDemo: boolean };

const confirmado = <T,>(valor: T): Dato<T> => ({
  valor,
  pendiente: false,
  esDemo: false,
});

/**
 * Campo aún sin confirmar. En modo demo toma el valor de ejemplo; fuera de
 * demo se marca como pendiente y la UI avisa que falta.
 */
const porConfirmar = <T,>(placeholder: T, demo: T): Dato<T> =>
  CONTENIDO_DEMO
    ? { valor: demo, pendiente: false, esDemo: true }
    : { valor: placeholder, pendiente: true, esDemo: false };

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

export interface Producto {
  nombre: string;
  descripcion: string;
  precio: number;
}

export interface CategoriaMenu {
  nombre: string;
  productos: Producto[];
}

const HORARIOS_EJEMPLO: HorarioDia[] = [
  { dia: 0, abre: '13:00', cierra: '20:00' },
  { dia: 1, abre: null, cierra: null },
  { dia: 2, abre: '17:00', cierra: '23:00' },
  { dia: 3, abre: '17:00', cierra: '23:00' },
  { dia: 4, abre: '17:00', cierra: '23:00' },
  { dia: 5, abre: '17:00', cierra: '01:00' },
  { dia: 6, abre: '13:00', cierra: '01:00' },
];

const MENU_EJEMPLO: CategoriaMenu[] = [
  {
    nombre: 'Mojitos de la casa',
    productos: [
      { nombre: 'Mojito clásico', descripcion: 'Hierbabuena, limón y ron blanco.', precio: 130 },
      { nombre: 'Mojito de frutos rojos', descripcion: 'Frambuesa y zarzamora machacadas.', precio: 150 },
      { nombre: 'Mojito de maracuyá', descripcion: 'Pulpa natural, dulce y ácido.', precio: 150 },
      { nombre: 'Mojito de pepino', descripcion: 'Pepino, hierbabuena y limón.', precio: 140 },
    ],
  },
  {
    nombre: 'Coctelería',
    productos: [
      { nombre: 'Margarita de tamarindo', descripcion: 'Con chile en polvo en el borde.', precio: 145 },
      { nombre: 'Paloma de la terraza', descripcion: 'Tequila, toronja y sal de gusano.', precio: 140 },
      { nombre: 'Piña colada', descripcion: 'Coco y piña natural.', precio: 155 },
    ],
  },
  {
    nombre: 'Sin alcohol',
    productos: [
      { nombre: 'Mojito sin alcohol', descripcion: 'El mismo sabor, sin ron.', precio: 95 },
      { nombre: 'Limonada de hierbabuena', descripcion: 'Recién hecha.', precio: 75 },
      { nombre: 'Agua del día', descripcion: 'Pregunta por el sabor.', precio: 60 },
    ],
  },
  {
    nombre: 'Para compartir',
    productos: [
      { nombre: 'Tabla de la terraza', descripcion: 'Quesos, embutidos y fruta.', precio: 320 },
      { nombre: 'Alitas', descripcion: 'BBQ, mango habanero o búfalo.', precio: 210 },
      { nombre: 'Papas gajo', descripcion: 'Con aderezo de la casa.', precio: 135 },
      { nombre: 'Guacamole con totopos', descripcion: 'Preparado al momento.', precio: 165 },
    ],
  },
];

const RESENAS_EJEMPLO = [
  {
    texto:
      'La terraza al atardecer es otra cosa. Fuimos por un mojito y nos quedamos toda la tarde.',
    autor: 'Andrea M.',
    fuente: 'Google',
  },
  {
    texto:
      'Reservé para el cumpleaños de mi hermana y nos tenían la mesa lista. Cero complicaciones.',
    autor: 'Luis R.',
    fuente: 'Google',
  },
  {
    texto: 'El de maracuyá está buenísimo y el ambiente es muy relajado. Ya vamos seguido.',
    autor: 'Paola G.',
    fuente: 'Facebook',
  },
];

export const negocio = {
  nombre: confirmado('Terraza Mojito'),
  tagline: confirmado('Frescura que se comparte.'),
  ciudad: confirmado('Metepec, Estado de México'),

  // --- Pendientes de confirmar con el negocio (con ejemplo para la demo) ---
  direccion: porConfirmar(
    'Dirección pendiente de confirmar',
    'Av. Estado de México 1204, Llano Grande, 52148 Metepec, Méx.',
  ),
  coordenadas: porConfirmar<{ lat: number; lng: number } | null>(null, {
    lat: 19.2537,
    lng: -99.6039,
  }),
  telefono: porConfirmar('', '722 123 4567'),
  whatsapp: porConfirmar('', '5217221234567'),
  email: porConfirmar('', 'hola@terrazamojito.mx'),
  rating: porConfirmar<{ valor: number; resenas: number } | null>(null, {
    valor: 4.7,
    resenas: 128,
  }),
  categoria: confirmado('Bar · Terraza'),

  /**
   * Testimonios. Fuera del modo demo NO se rellenan con texto plausible:
   * publicar reseñas falsas engaña al visitante y es sancionable. Se copian
   * reseñas reales de Google o redes, con autorización.
   */
  resenas: porConfirmar<typeof RESENAS_EJEMPLO>([], RESENAS_EJEMPLO),

  menu: porConfirmar<CategoriaMenu[]>([], MENU_EJEMPLO),

  // --- Confirmados por las redes del negocio ---
  redes: confirmado({
    instagram: 'https://www.instagram.com/terraza_mojitometepec/',
    facebook: 'https://www.facebook.com/p/Terraza-Mojito-Metepec-61579700160729/',
    tiktok: 'https://www.tiktok.com/@terraza_mojitometepec',
  }),

  /**
   * En producción los sobreescribe `availability_rules` de la base de datos,
   * configurable desde el Back Office (PRD RN-09).
   */
  horarios: porConfirmar<HorarioDia[]>(HORARIOS_EJEMPLO, HORARIOS_EJEMPLO),
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

export const AVISO_DATO_PENDIENTE = 'Dato pendiente de confirmar con el negocio.';

export const precioMXN = (n: number) =>
  new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 0,
  }).format(n);
