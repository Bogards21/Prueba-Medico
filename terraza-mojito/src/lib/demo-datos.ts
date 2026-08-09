import type { Cliente, EstadoReserva, NotaCliente, Reserva } from './tipos';

/**
 * Datos de ejemplo para el modo demo.
 *
 * Por qué existe: sin Supabase el almacén vive en memoria, y en un entorno
 * serverless cada invocación arranca con la suya. Sin semilla, quien abre el
 * panel de una demo desplegada ve todo en cero y parece roto.
 *
 * Todo aquí es DETERMINISTA a propósito —identificadores fijos y fechas
 * derivadas del día actual— para que dos peticiones servidas por instancias
 * distintas muestren exactamente lo mismo y los enlaces al detalle no se
 * rompan.
 *
 * Son personas ficticias. En cuanto se configura Supabase esta semilla deja de
 * cargarse.
 */

const dia = (desplazamiento: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + desplazamiento);
  return d.toISOString().slice(0, 10);
};

/** Marca de tiempo estable para un día dado. */
const marca = (desplazamiento: number, hora = 11): string => {
  const d = new Date();
  d.setDate(d.getDate() + desplazamiento);
  d.setHours(hora, 0, 0, 0);
  return d.toISOString();
};

const CLIENTES: Array<Omit<Cliente, 'created_at' | 'updated_at'> & { alta: number }> = [
  { id: 'd0000001-0000-4000-8000-000000000001', first_name: 'Ana Sofía', last_name: 'Ríos Beltrán',   phone: '7221045512', email: 'ana.rios@ejemplo.mx',      marketing_consent: true,  privacy_accepted_at: marca(-120), source: 'landing', alta: -120 },
  { id: 'd0000002-0000-4000-8000-000000000002', first_name: 'Diego',     last_name: 'Fuentes Mora',   phone: '7223318790', email: 'diego.fuentes@ejemplo.mx', marketing_consent: false, privacy_accepted_at: marca(-86),  source: 'landing', alta: -86 },
  { id: 'd0000003-0000-4000-8000-000000000003', first_name: 'Mariana',   last_name: 'Cervantes Lugo', phone: '7229902244', email: 'mariana.c@ejemplo.mx',     marketing_consent: true,  privacy_accepted_at: marca(-54),  source: 'landing', alta: -54 },
  { id: 'd0000004-0000-4000-8000-000000000004', first_name: 'Rodrigo',   last_name: 'Nava Quintero',  phone: '7224471130', email: 'rodrigo.nava@ejemplo.mx',  marketing_consent: false, privacy_accepted_at: marca(-31),  source: 'landing', alta: -31 },
  { id: 'd0000005-0000-4000-8000-000000000005', first_name: 'Paulina',   last_name: 'Ortega Sandoval',phone: '7226650983', email: 'paulina.o@ejemplo.mx',     marketing_consent: true,  privacy_accepted_at: marca(-19),  source: 'landing', alta: -19 },
  { id: 'd0000006-0000-4000-8000-000000000006', first_name: 'Emiliano',  last_name: 'Salas Vega',     phone: '7227734506', email: 'emiliano.s@ejemplo.mx',    marketing_consent: false, privacy_accepted_at: marca(-9),   source: 'landing', alta: -9 },
  { id: 'd0000007-0000-4000-8000-000000000007', first_name: 'Regina',    last_name: 'Iglesias Prado', phone: '7222218865', email: 'regina.i@ejemplo.mx',      marketing_consent: true,  privacy_accepted_at: marca(-4),   source: 'landing', alta: -4 },
  { id: 'd0000008-0000-4000-8000-000000000008', first_name: 'Tomás',     last_name: 'Herrera Cano',   phone: '7225583417', email: 'tomas.h@ejemplo.mx',       marketing_consent: false, privacy_accepted_at: marca(-1),   source: 'landing', alta: -1 },
];

interface SemillaReserva {
  n: number;
  cliente: number;
  desplazamiento: number;
  hora: string;
  personas: number;
  estado: EstadoReserva;
  ocasion?: string;
  peticion?: string;
  motivo?: string;
}

const RESERVAS: SemillaReserva[] = [
  // --- Historial pasado: da cuerpo a las métricas del CRM y a los reportes ---
  { n: 1,  cliente: 0, desplazamiento: -96, hora: '20:00', personas: 4, estado: 'completed', ocasion: 'Cumpleaños' },
  { n: 2,  cliente: 0, desplazamiento: -61, hora: '19:30', personas: 2, estado: 'completed' },
  { n: 3,  cliente: 0, desplazamiento: -22, hora: '21:00', personas: 6, estado: 'completed', ocasion: 'Reunión' },
  { n: 4,  cliente: 1, desplazamiento: -70, hora: '18:30', personas: 2, estado: 'completed' },
  { n: 5,  cliente: 1, desplazamiento: -33, hora: '20:30', personas: 3, estado: 'no_show' },
  { n: 6,  cliente: 2, desplazamiento: -47, hora: '19:00', personas: 8, estado: 'completed', ocasion: 'Celebración', peticion: 'Mesa larga para el grupo.' },
  { n: 7,  cliente: 2, desplazamiento: -12, hora: '20:00', personas: 4, estado: 'completed' },
  { n: 8,  cliente: 3, desplazamiento: -25, hora: '17:30', personas: 2, estado: 'cancelled' },
  { n: 9,  cliente: 4, desplazamiento: -14, hora: '21:30', personas: 5, estado: 'completed', ocasion: 'Aniversario' },
  { n: 10, cliente: 5, desplazamiento: -6,  hora: '19:00', personas: 3, estado: 'rejected', motivo: 'Capacidad completa' },

  // --- Hoy ---
  { n: 11, cliente: 2, desplazamiento: 0, hora: '19:30', personas: 4, estado: 'confirmed', ocasion: 'Cumpleaños', peticion: 'Traemos pastel, ¿hay problema?' },
  { n: 12, cliente: 6, desplazamiento: 0, hora: '20:30', personas: 2, estado: 'confirmed' },
  { n: 13, cliente: 7, desplazamiento: 0, hora: '21:00', personas: 6, estado: 'pending', ocasion: 'Reunión' },

  // --- Cola pendiente: es la pantalla que el negocio usa a diario ---
  { n: 14, cliente: 4, desplazamiento: 1, hora: '20:00', personas: 2, estado: 'pending' },
  { n: 15, cliente: 5, desplazamiento: 2, hora: '19:00', personas: 10, estado: 'pending', ocasion: 'Celebración', peticion: 'Somos diez, si se puede en la terraza mejor.' },
  { n: 16, cliente: 1, desplazamiento: 3, hora: '21:30', personas: 4, estado: 'pending' },

  // --- Confirmadas próximas ---
  { n: 17, cliente: 0, desplazamiento: 2,  hora: '20:30', personas: 3, estado: 'confirmed' },
  { n: 18, cliente: 3, desplazamiento: 5,  hora: '19:30', personas: 2, estado: 'confirmed', ocasion: 'Aniversario' },
  { n: 19, cliente: 6, desplazamiento: 9,  hora: '20:00', personas: 8, estado: 'confirmed', ocasion: 'Cumpleaños' },
];

const NOTAS: Array<{ n: number; cliente: number; texto: string; autor: string; desplazamiento: number }> = [
  { n: 1, cliente: 0, texto: 'Cliente frecuente. Siempre pide mesa en la terraza, del lado de la barra.', autor: 'admin', desplazamiento: -22 },
  { n: 2, cliente: 1, texto: 'No se presentó en su última reserva y no avisó. Confirmar por teléfono antes de apartar mesa grande.', autor: 'admin', desplazamiento: -33 },
  { n: 3, cliente: 2, texto: 'Vino con grupo grande y todo salió bien. Buena candidata para eventos.', autor: 'staff', desplazamiento: -12 },
];

const identificador = (n: number) =>
  `d0000000-0000-4000-9000-${String(n).padStart(12, '0')}`;

export interface Semilla {
  clientes: Cliente[];
  reservas: Reserva[];
  notas: NotaCliente[];
  historial: {
    id: string;
    reservation_id: string;
    previous_status: EstadoReserva | null;
    new_status: EstadoReserva;
    changed_by: string;
    created_at: string;
  }[];
}

export function construirSemilla(): Semilla {
  const clientes: Cliente[] = CLIENTES.map(({ alta, ...c }) => ({
    ...c,
    created_at: marca(alta),
    updated_at: marca(alta),
  }));

  const reservas: Reserva[] = [];
  const historial: Semilla['historial'] = [];

  for (const r of RESERVAS) {
    const id = identificador(r.n);
    // Se solicita entre 2 y 5 días antes de la fecha reservada.
    const creada = marca(r.desplazamiento - ((r.n % 4) + 2), 12);
    const resuelta = marca(r.desplazamiento - 1, 10);

    reservas.push({
      id,
      customer_id: CLIENTES[r.cliente].id,
      reservation_date: dia(r.desplazamiento),
      reservation_time: r.hora,
      party_size: r.personas,
      occasion: r.ocasion ?? null,
      special_requests: r.peticion ?? null,
      status: r.estado,
      rejection_reason: r.motivo ?? null,
      created_at: creada,
      updated_at: r.estado === 'pending' ? creada : resuelta,
      confirmed_at: ['confirmed', 'completed', 'no_show'].includes(r.estado) ? resuelta : null,
      cancelled_at: r.estado === 'cancelled' ? resuelta : null,
      completed_at: r.estado === 'completed' ? marca(r.desplazamiento, 23) : null,
    });

    historial.push({
      id: `${id}-h1`,
      reservation_id: id,
      previous_status: null,
      new_status: 'pending',
      changed_by: 'sistema',
      created_at: creada,
    });

    if (r.estado !== 'pending') {
      // Las que llegaron a completada o no show pasaron antes por confirmada.
      const intermedio = ['completed', 'no_show'].includes(r.estado);
      if (intermedio) {
        historial.push({
          id: `${id}-h2`,
          reservation_id: id,
          previous_status: 'pending',
          new_status: 'confirmed',
          changed_by: 'admin',
          created_at: resuelta,
        });
      }
      historial.push({
        id: `${id}-h3`,
        reservation_id: id,
        previous_status: intermedio ? 'confirmed' : 'pending',
        new_status: r.estado,
        changed_by: 'admin',
        created_at: marca(r.desplazamiento, 23),
      });
    }
  }

  const notas: NotaCliente[] = NOTAS.map((n) => ({
    id: `d0000000-0000-4000-a000-${String(n.n).padStart(12, '0')}`,
    customer_id: CLIENTES[n.cliente].id,
    author: n.autor,
    note: n.texto,
    created_at: marca(n.desplazamiento, 15),
  }));

  return { clientes, reservas, notas, historial };
}
