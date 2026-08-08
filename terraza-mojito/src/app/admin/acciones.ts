'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import {
  cerrarSesion,
  iniciarSesion,
  sesionActual,
  verificarCredenciales,
  type Sesion,
} from '@/lib/auth';
import { agregarNota, cambiarEstado } from '@/lib/repo';
import { ESTADOS_RESERVA, type EstadoReserva } from '@/lib/tipos';

/** Toda acción del panel pasa por aquí antes de tocar datos. */
async function exigirSesion(): Promise<Sesion> {
  const sesion = await sesionActual();
  if (!sesion) redirect('/admin/login');
  return sesion;
}

export async function accionIniciarSesion(
  _estadoPrevio: { error?: string; usuario?: string } | null,
  datos: FormData,
): Promise<{ error?: string; usuario?: string }> {
  const usuario = String(datos.get('usuario') ?? '');
  const contrasena = String(datos.get('contrasena') ?? '');

  const sesion = verificarCredenciales(usuario, contrasena);
  if (!sesion) {
    // Mensaje genérico: no revelar si el usuario existe.
    // Se devuelve el usuario tecleado para no obligar a reescribirlo; la
    // contraseña nunca vuelve al cliente.
    return { error: 'Usuario o contraseña incorrectos.', usuario };
  }

  await iniciarSesion(sesion);
  redirect('/admin');
}

export async function accionCerrarSesion(): Promise<void> {
  await cerrarSesion();
  redirect('/admin/login');
}

/**
 * Cambio de estado de una reserva.
 * PRD RN-02/RN-03: confirmar y rechazar son acciones explícitas del negocio.
 */
export async function accionCambiarEstado(
  reservaId: string,
  nuevo: string,
  motivo?: string,
): Promise<{ ok: boolean; error?: string }> {
  const sesion = await exigirSesion();

  if (!ESTADOS_RESERVA.includes(nuevo as EstadoReserva)) {
    return { ok: false, error: 'Estado no válido.' };
  }
  if (nuevo === 'rejected' && !motivo?.trim()) {
    return { ok: false, error: 'Indica el motivo del rechazo.' };
  }

  try {
    await cambiarEstado(reservaId, nuevo as EstadoReserva, sesion.usuario, motivo);
    revalidatePath('/admin');
    revalidatePath('/admin/reservas');
    revalidatePath(`/admin/reservas/${reservaId}`);
    return { ok: true };
  } catch (error) {
    console.error('[accionCambiarEstado]', error);
    return { ok: false, error: 'No se pudo actualizar la reserva.' };
  }
}

export async function accionAgregarNota(
  clienteId: string,
  nota: string,
): Promise<{ ok: boolean; error?: string }> {
  const sesion = await exigirSesion();

  const texto = nota.trim();
  if (!texto) return { ok: false, error: 'La nota está vacía.' };
  if (texto.length > 500) return { ok: false, error: 'Máximo 500 caracteres.' };

  try {
    await agregarNota(clienteId, texto, sesion.usuario);
    revalidatePath(`/admin/clientes/${clienteId}`);
    return { ok: true };
  } catch (error) {
    console.error('[accionAgregarNota]', error);
    return { ok: false, error: 'No se pudo guardar la nota.' };
  }
}
