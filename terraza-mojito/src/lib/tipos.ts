/** Modelo de dominio — PRD §42 y §19. */

export const ESTADOS_RESERVA = [
  'pending',
  'confirmed',
  'rejected',
  'cancelled',
  'completed',
  'no_show',
] as const;

export type EstadoReserva = (typeof ESTADOS_RESERVA)[number];

export const ETIQUETA_ESTADO: Record<EstadoReserva, string> = {
  pending: 'Pendiente',
  confirmed: 'Confirmada',
  rejected: 'Rechazada',
  cancelled: 'Cancelada',
  completed: 'Completada',
  no_show: 'No Show',
};

/**
 * PRD §41: los estados no pueden depender solo del color.
 * Cada estado lleva color + icono + texto.
 */
export const ESTILO_ESTADO: Record<
  EstadoReserva,
  { clase: string; icono: string }
> = {
  pending: { clase: 'bg-lima-pale text-noche border-mojito', icono: '⏳' },
  confirmed: { clase: 'bg-menta text-noche border-hoja', icono: '✓' },
  rejected: { clase: 'bg-red-50 text-red-900 border-red-300', icono: '✕' },
  cancelled: { clase: 'bg-neutral-100 text-neutral-700 border-neutral-300', icono: '⊘' },
  completed: { clase: 'bg-hoja text-espuma border-noche', icono: '★' },
  no_show: { clase: 'bg-amber-50 text-amber-900 border-amber-400', icono: '!' },
};

export const MOTIVOS_RECHAZO = [
  'Sin disponibilidad',
  'Capacidad completa',
  'Horario no disponible',
  'Evento privado',
  'Otro',
] as const;

export const OCASIONES = [
  'Cumpleaños',
  'Aniversario',
  'Celebración',
  'Reunión',
  'Otro',
] as const;

export interface Cliente {
  id: string;
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  marketing_consent: boolean;
  privacy_accepted_at: string | null;
  source: string | null;
  created_at: string;
  updated_at: string;
}

export interface Reserva {
  id: string;
  customer_id: string;
  reservation_date: string; // YYYY-MM-DD
  reservation_time: string; // HH:mm
  party_size: number;
  occasion: string | null;
  special_requests: string | null;
  status: EstadoReserva;
  rejection_reason: string | null;
  created_at: string;
  updated_at: string;
  confirmed_at: string | null;
  cancelled_at: string | null;
  completed_at: string | null;
}

export interface ReservaConCliente extends Reserva {
  cliente: Cliente;
}

export interface NotaCliente {
  id: string;
  customer_id: string;
  author: string;
  note: string;
  created_at: string;
}

export interface CambioEstado {
  id: string;
  reservation_id: string;
  previous_status: EstadoReserva | null;
  new_status: EstadoReserva;
  changed_by: string;
  created_at: string;
}

/** Métricas del cliente calculadas, no almacenadas (PRD §30). */
export interface ResumenCliente {
  cliente: Cliente;
  total: number;
  completadas: number;
  canceladas: number;
  noShows: number;
  ultimaVisita: string | null;
  proximaReserva: Reserva | null;
}

export interface KPIsDashboard {
  reservasHoy: number;
  pendientes: number;
  confirmadas: number;
  personasEsperadas: number;
  clientesNuevos: number;
}
