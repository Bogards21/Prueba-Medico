'use server';

import { z } from 'zod';
import { reglasReserva } from '@/data/negocio';
import { esquemaReserva, erroresPorCampo } from '@/lib/reserva.schema';
import { franjasDisponibles } from '@/lib/horarios';
import {
  crearReserva,
  encontrarOCrearCliente,
  existeReservaDuplicada,
  modoDemo,
  personasEnFranja,
} from '@/lib/repo';

export interface ResultadoReserva {
  ok: boolean;
  reservaId?: string;
  errores?: Record<string, string>;
  mensaje?: string;
  modoDemo?: boolean;
}

/**
 * Crea una solicitud de reserva.
 *
 * PRD §46: la validación del cliente no se confía. Todo se revalida aquí,
 * incluida la disponibilidad de la franja, que puede haber cambiado entre que
 * el usuario la eligió y envió (PRD §51).
 */
export async function solicitarReserva(entrada: unknown): Promise<ResultadoReserva> {
  const parseo = esquemaReserva.safeParse(entrada);
  if (!parseo.success) {
    return { ok: false, errores: erroresPorCampo(parseo.error as z.ZodError) };
  }
  const datos = parseo.data;

  // --- Revalidación de fecha y hora contra las reglas del negocio ---
  const fecha = new Date(`${datos.reservation_date}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) {
    return { ok: false, errores: { reservation_date: 'Fecha no válida' } };
  }

  const disponibles = franjasDisponibles(fecha);
  if (disponibles.length === 0) {
    return {
      ok: false,
      errores: { reservation_date: 'Ese día no estamos abiertos. Elige otra fecha.' },
    };
  }
  if (!disponibles.includes(datos.reservation_time)) {
    return {
      ok: false,
      errores: {
        reservation_time:
          'Este horario acaba de dejar de estar disponible. Selecciona otro.',
      },
    };
  }

  try {
    const cliente = await encontrarOCrearCliente({
      first_name: datos.first_name,
      last_name: datos.last_name,
      phone: datos.phone,
      email: datos.email,
      marketing_consent: datos.marketing_consent,
      privacy_accepted: datos.privacy_accepted,
      source: 'landing',
    });

    // PRD §51 — doble envío / reserva duplicada.
    if (
      await existeReservaDuplicada(
        cliente.id,
        datos.reservation_date,
        datos.reservation_time,
      )
    ) {
      return {
        ok: false,
        mensaje:
          'Ya tenemos una solicitud tuya para esa fecha y hora. Si necesitas cambiarla, contáctanos.',
      };
    }

    // Control de capacidad por franja (PRD §28).
    const ocupadas = await personasEnFranja(
      datos.reservation_date,
      datos.reservation_time,
    );
    if (ocupadas + datos.party_size > reglasReserva.capacidadPorFranja) {
      return {
        ok: false,
        errores: {
          reservation_time:
            'Ese horario ya está muy solicitado. Elige otro y con gusto te acomodamos.',
        },
      };
    }

    const reserva = await crearReserva({
      customer_id: cliente.id,
      reservation_date: datos.reservation_date,
      reservation_time: datos.reservation_time,
      party_size: datos.party_size,
      occasion: datos.occasion ?? null,
      special_requests: datos.special_requests ?? null,
    });

    return { ok: true, reservaId: reserva.id, modoDemo };
  } catch (error) {
    // PRD §52: no mostrar éxito sin confirmación real del servidor.
    console.error('[solicitarReserva]', error);
    return {
      ok: false,
      mensaje:
        'No pudimos registrar tu solicitud. Vuelve a intentarlo o escríbenos por WhatsApp.',
    };
  }
}

/** Franjas de un día, para que el wizard no ofrezca horarios inválidos. */
export async function obtenerFranjas(fechaISO: string): Promise<string[]> {
  const fecha = new Date(`${fechaISO}T12:00:00`);
  if (Number.isNaN(fecha.getTime())) return [];
  return franjasDisponibles(fecha);
}
