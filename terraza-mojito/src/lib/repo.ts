import 'server-only';
import { randomUUID } from 'crypto';
import { clienteServicio, estaConfigurado } from './supabase';
import {
  type Cliente,
  type EstadoReserva,
  type KPIsDashboard,
  type NotaCliente,
  type Reserva,
  type ReservaConCliente,
  type ResumenCliente,
} from './tipos';
import { normalizarEmail, normalizarTelefono } from './reserva.schema';

/**
 * Repositorio de datos.
 *
 * Dos implementaciones tras la misma interfaz:
 *  - Supabase, cuando hay credenciales. Es la de producción.
 *  - Memoria, cuando no las hay. Sirve para revisar la UI en local; los datos
 *    se pierden al reiniciar el servidor y NO funciona en Vercel (cada
 *    invocación serverless arranca con su propia memoria).
 *
 * `modoDemo` se expone para que la UI lo anuncie en pantalla en vez de
 * aparentar que guardó algo.
 */
export const modoDemo = !estaConfigurado;

// ---------------------------------------------------------------------------
// Almacén en memoria (solo desarrollo)
// ---------------------------------------------------------------------------

interface Almacen {
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

// Se cuelga de globalThis para sobrevivir al hot-reload de Next en desarrollo.
const g = globalThis as unknown as { __tmStore?: Almacen };
const store: Almacen = (g.__tmStore ??= {
  clientes: [],
  reservas: [],
  notas: [],
  historial: [],
});

const ahora = () => new Date().toISOString();

// ---------------------------------------------------------------------------
// Clientes
// ---------------------------------------------------------------------------

export interface DatosCliente {
  first_name: string;
  last_name: string;
  phone: string;
  email: string;
  marketing_consent: boolean;
  privacy_accepted: boolean;
  source?: string;
}

/**
 * PRD §44 — prevención de duplicados.
 * Se normaliza teléfono y correo, se busca coincidencia y se reutiliza el
 * registro existente. No se fusionan perfiles ambiguos automáticamente.
 */
export async function encontrarOCrearCliente(datos: DatosCliente): Promise<Cliente> {
  const phone = normalizarTelefono(datos.phone);
  const email = normalizarEmail(datos.email);

  const sb = clienteServicio();
  if (sb) {
    const { data: existentes, error } = await sb
      .from('customers')
      .select('*')
      .or(`phone.eq.${phone},email.eq.${email}`)
      .limit(1);
    if (error) throw new Error(`No se pudo consultar clientes: ${error.message}`);

    if (existentes && existentes.length > 0) {
      const c = existentes[0] as Cliente;
      // Se completan huecos sin sobreescribir lo que el cliente ya dio antes.
      const parche: Partial<Cliente> = { updated_at: ahora() };
      if (!c.email && email) parche.email = email;
      if (!c.phone && phone) parche.phone = phone;
      if (datos.marketing_consent) parche.marketing_consent = true;
      const { data: actualizado } = await sb
        .from('customers')
        .update(parche)
        .eq('id', c.id)
        .select('*')
        .single();
      return (actualizado ?? c) as Cliente;
    }

    const { data: creado, error: errCrear } = await sb
      .from('customers')
      .insert({
        first_name: datos.first_name,
        last_name: datos.last_name,
        phone,
        email,
        marketing_consent: datos.marketing_consent,
        privacy_accepted_at: datos.privacy_accepted ? ahora() : null,
        source: datos.source ?? 'landing',
      })
      .select('*')
      .single();
    if (errCrear) throw new Error(`No se pudo crear el cliente: ${errCrear.message}`);
    return creado as Cliente;
  }

  // --- memoria ---
  const existente = store.clientes.find((c) => c.phone === phone || c.email === email);
  if (existente) {
    if (datos.marketing_consent) existente.marketing_consent = true;
    existente.updated_at = ahora();
    return existente;
  }
  const nuevo: Cliente = {
    id: randomUUID(),
    first_name: datos.first_name,
    last_name: datos.last_name,
    phone,
    email,
    marketing_consent: datos.marketing_consent,
    privacy_accepted_at: datos.privacy_accepted ? ahora() : null,
    source: datos.source ?? 'landing',
    created_at: ahora(),
    updated_at: ahora(),
  };
  store.clientes.push(nuevo);
  return nuevo;
}

// ---------------------------------------------------------------------------
// Reservas
// ---------------------------------------------------------------------------

export interface DatosNuevaReserva {
  customer_id: string;
  reservation_date: string;
  reservation_time: string;
  party_size: number;
  occasion: string | null;
  special_requests: string | null;
}

/** PRD RN-01: toda solicitud nace en `pending`. Sin excepciones. */
export async function crearReserva(datos: DatosNuevaReserva): Promise<Reserva> {
  const sb = clienteServicio();
  if (sb) {
    const { data, error } = await sb
      .from('reservations')
      .insert({ ...datos, status: 'pending' satisfies EstadoReserva })
      .select('*')
      .single();
    if (error) throw new Error(`No se pudo crear la reserva: ${error.message}`);
    await sb.from('reservation_status_history').insert({
      reservation_id: (data as Reserva).id,
      previous_status: null,
      new_status: 'pending',
      changed_by: 'sistema',
    });
    return data as Reserva;
  }

  const nueva: Reserva = {
    id: randomUUID(),
    ...datos,
    status: 'pending',
    rejection_reason: null,
    created_at: ahora(),
    updated_at: ahora(),
    confirmed_at: null,
    cancelled_at: null,
    completed_at: null,
  };
  store.reservas.push(nueva);
  store.historial.push({
    id: randomUUID(),
    reservation_id: nueva.id,
    previous_status: null,
    new_status: 'pending',
    changed_by: 'sistema',
    created_at: ahora(),
  });
  return nueva;
}

/**
 * PRD §51 — reserva duplicada.
 * Misma persona, misma fecha y misma hora dentro de los últimos minutos.
 */
export async function existeReservaDuplicada(
  customer_id: string,
  reservation_date: string,
  reservation_time: string,
): Promise<boolean> {
  const sb = clienteServicio();
  if (sb) {
    const { data } = await sb
      .from('reservations')
      .select('id')
      .eq('customer_id', customer_id)
      .eq('reservation_date', reservation_date)
      .eq('reservation_time', reservation_time)
      .in('status', ['pending', 'confirmed'])
      .limit(1);
    return Boolean(data && data.length > 0);
  }
  return store.reservas.some(
    (r) =>
      r.customer_id === customer_id &&
      r.reservation_date === reservation_date &&
      r.reservation_time === reservation_time &&
      (r.status === 'pending' || r.status === 'confirmed'),
  );
}

/** Personas ya comprometidas en una franja, para el control de capacidad. */
export async function personasEnFranja(
  reservation_date: string,
  reservation_time: string,
): Promise<number> {
  const sb = clienteServicio();
  if (sb) {
    const { data } = await sb
      .from('reservations')
      .select('party_size')
      .eq('reservation_date', reservation_date)
      .eq('reservation_time', reservation_time)
      .in('status', ['pending', 'confirmed']);
    return (data ?? []).reduce((s, r) => s + (r as { party_size: number }).party_size, 0);
  }
  return store.reservas
    .filter(
      (r) =>
        r.reservation_date === reservation_date &&
        r.reservation_time === reservation_time &&
        (r.status === 'pending' || r.status === 'confirmed'),
    )
    .reduce((s, r) => s + r.party_size, 0);
}

export interface FiltrosReservas {
  fecha?: string;
  estado?: EstadoReserva | 'todas';
  busqueda?: string;
  desde?: string;
  hasta?: string;
}

export async function listarReservas(
  filtros: FiltrosReservas = {},
): Promise<ReservaConCliente[]> {
  const sb = clienteServicio();
  if (sb) {
    let q = sb
      .from('reservations')
      .select('*, cliente:customers(*)')
      .order('reservation_date', { ascending: true })
      .order('reservation_time', { ascending: true });

    if (filtros.fecha) q = q.eq('reservation_date', filtros.fecha);
    if (filtros.desde) q = q.gte('reservation_date', filtros.desde);
    if (filtros.hasta) q = q.lte('reservation_date', filtros.hasta);
    if (filtros.estado && filtros.estado !== 'todas') q = q.eq('status', filtros.estado);

    const { data, error } = await q;
    if (error) throw new Error(`No se pudieron listar las reservas: ${error.message}`);
    let filas = (data ?? []) as unknown as ReservaConCliente[];
    if (filtros.busqueda) filas = filtrarPorBusqueda(filas, filtros.busqueda);
    return filas;
  }

  let filas: ReservaConCliente[] = store.reservas
    .map((r) => {
      const cliente = store.clientes.find((c) => c.id === r.customer_id);
      return cliente ? { ...r, cliente } : null;
    })
    .filter((r): r is ReservaConCliente => r !== null);

  if (filtros.fecha) filas = filas.filter((r) => r.reservation_date === filtros.fecha);
  if (filtros.desde) filas = filas.filter((r) => r.reservation_date >= filtros.desde!);
  if (filtros.hasta) filas = filas.filter((r) => r.reservation_date <= filtros.hasta!);
  if (filtros.estado && filtros.estado !== 'todas') {
    filas = filas.filter((r) => r.status === filtros.estado);
  }
  if (filtros.busqueda) filas = filtrarPorBusqueda(filas, filtros.busqueda);

  return filas.sort((a, b) =>
    (a.reservation_date + a.reservation_time).localeCompare(
      b.reservation_date + b.reservation_time,
    ),
  );
}

function filtrarPorBusqueda(filas: ReservaConCliente[], termino: string): ReservaConCliente[] {
  const t = termino.trim().toLowerCase();
  const soloDigitos = t.replace(/\D/g, '');
  return filas.filter((r) => {
    const nombre = `${r.cliente.first_name} ${r.cliente.last_name}`.toLowerCase();
    return (
      nombre.includes(t) ||
      r.cliente.email.includes(t) ||
      (soloDigitos.length > 0 && r.cliente.phone.includes(soloDigitos))
    );
  });
}

export async function obtenerReserva(id: string): Promise<ReservaConCliente | null> {
  const sb = clienteServicio();
  if (sb) {
    const { data } = await sb
      .from('reservations')
      .select('*, cliente:customers(*)')
      .eq('id', id)
      .maybeSingle();
    return (data as unknown as ReservaConCliente) ?? null;
  }
  const r = store.reservas.find((x) => x.id === id);
  if (!r) return null;
  const cliente = store.clientes.find((c) => c.id === r.customer_id);
  return cliente ? { ...r, cliente } : null;
}

/**
 * PRD RN-07: todo cambio de estado queda registrado con estado anterior,
 * nuevo, usuario y timestamp.
 */
export async function cambiarEstado(
  id: string,
  nuevo: EstadoReserva,
  usuario: string,
  motivoRechazo?: string,
): Promise<Reserva> {
  const marcaTiempo: Partial<Reserva> = { status: nuevo, updated_at: ahora() };
  if (nuevo === 'confirmed') marcaTiempo.confirmed_at = ahora();
  if (nuevo === 'cancelled') marcaTiempo.cancelled_at = ahora();
  if (nuevo === 'completed') marcaTiempo.completed_at = ahora();
  if (nuevo === 'rejected') marcaTiempo.rejection_reason = motivoRechazo ?? null;

  const sb = clienteServicio();
  if (sb) {
    const { data: previa } = await sb
      .from('reservations')
      .select('status')
      .eq('id', id)
      .single();

    const { data, error } = await sb
      .from('reservations')
      .update(marcaTiempo)
      .eq('id', id)
      .select('*')
      .single();
    if (error) throw new Error(`No se pudo actualizar la reserva: ${error.message}`);

    await sb.from('reservation_status_history').insert({
      reservation_id: id,
      previous_status: (previa as { status: EstadoReserva } | null)?.status ?? null,
      new_status: nuevo,
      changed_by: usuario,
    });
    return data as Reserva;
  }

  const r = store.reservas.find((x) => x.id === id);
  if (!r) throw new Error('Reserva no encontrada');
  const anterior = r.status;
  Object.assign(r, marcaTiempo);
  store.historial.push({
    id: randomUUID(),
    reservation_id: id,
    previous_status: anterior,
    new_status: nuevo,
    changed_by: usuario,
    created_at: ahora(),
  });
  return r;
}

export async function historialDeReserva(id: string) {
  const sb = clienteServicio();
  if (sb) {
    const { data } = await sb
      .from('reservation_status_history')
      .select('*')
      .eq('reservation_id', id)
      .order('created_at', { ascending: true });
    return data ?? [];
  }
  return store.historial
    .filter((h) => h.reservation_id === id)
    .sort((a, b) => a.created_at.localeCompare(b.created_at));
}

// ---------------------------------------------------------------------------
// CRM
// ---------------------------------------------------------------------------

export async function listarClientes(busqueda?: string): Promise<ResumenCliente[]> {
  const sb = clienteServicio();

  let clientes: Cliente[];
  let reservas: Reserva[];

  if (sb) {
    const { data: c } = await sb.from('customers').select('*').order('created_at', { ascending: false });
    const { data: r } = await sb.from('reservations').select('*');
    clientes = (c ?? []) as Cliente[];
    reservas = (r ?? []) as Reserva[];
  } else {
    clientes = [...store.clientes].sort((a, b) => b.created_at.localeCompare(a.created_at));
    reservas = store.reservas;
  }

  if (busqueda) {
    const t = busqueda.trim().toLowerCase();
    const d = t.replace(/\D/g, '');
    clientes = clientes.filter(
      (c) =>
        `${c.first_name} ${c.last_name}`.toLowerCase().includes(t) ||
        c.email.includes(t) ||
        (d.length > 0 && c.phone.includes(d)) ||
        c.id.includes(t),
    );
  }

  const hoy = new Date().toISOString().slice(0, 10);

  return clientes.map((cliente) => {
    const suyas = reservas.filter((r) => r.customer_id === cliente.id);
    const completadas = suyas.filter((r) => r.status === 'completed');
    const futuras = suyas
      .filter((r) => r.reservation_date >= hoy && (r.status === 'pending' || r.status === 'confirmed'))
      .sort((a, b) =>
        (a.reservation_date + a.reservation_time).localeCompare(
          b.reservation_date + b.reservation_time,
        ),
      );
    const ultima = completadas
      .map((r) => r.reservation_date)
      .sort()
      .pop();

    return {
      cliente,
      total: suyas.length,
      completadas: completadas.length,
      canceladas: suyas.filter((r) => r.status === 'cancelled').length,
      noShows: suyas.filter((r) => r.status === 'no_show').length,
      ultimaVisita: ultima ?? null,
      proximaReserva: futuras[0] ?? null,
    };
  });
}

export async function obtenerResumenCliente(id: string): Promise<ResumenCliente | null> {
  const todos = await listarClientes();
  return todos.find((r) => r.cliente.id === id) ?? null;
}

export async function reservasDeCliente(id: string): Promise<Reserva[]> {
  const sb = clienteServicio();
  if (sb) {
    const { data } = await sb
      .from('reservations')
      .select('*')
      .eq('customer_id', id)
      .order('reservation_date', { ascending: false });
    return (data ?? []) as Reserva[];
  }
  return store.reservas
    .filter((r) => r.customer_id === id)
    .sort((a, b) => b.reservation_date.localeCompare(a.reservation_date));
}

/** PRD RN-06: las notas internas nunca se exponen al cliente. */
export async function listarNotas(customer_id: string): Promise<NotaCliente[]> {
  const sb = clienteServicio();
  if (sb) {
    const { data } = await sb
      .from('customer_notes')
      .select('*')
      .eq('customer_id', customer_id)
      .order('created_at', { ascending: false });
    return (data ?? []) as NotaCliente[];
  }
  return store.notas
    .filter((n) => n.customer_id === customer_id)
    .sort((a, b) => b.created_at.localeCompare(a.created_at));
}

export async function agregarNota(
  customer_id: string,
  note: string,
  author: string,
): Promise<NotaCliente> {
  const sb = clienteServicio();
  if (sb) {
    const { data, error } = await sb
      .from('customer_notes')
      .insert({ customer_id, note, author })
      .select('*')
      .single();
    if (error) throw new Error(`No se pudo guardar la nota: ${error.message}`);
    return data as NotaCliente;
  }
  const nueva: NotaCliente = {
    id: randomUUID(),
    customer_id,
    note,
    author,
    created_at: ahora(),
  };
  store.notas.push(nueva);
  return nueva;
}

// ---------------------------------------------------------------------------
// Dashboard
// ---------------------------------------------------------------------------

export async function kpisDashboard(): Promise<KPIsDashboard> {
  const hoy = new Date().toISOString().slice(0, 10);
  const todas = await listarReservas();
  const deHoy = todas.filter((r) => r.reservation_date === hoy);

  const hace30 = new Date();
  hace30.setDate(hace30.getDate() - 30);
  const corte = hace30.toISOString();

  const clientes = await listarClientes();

  return {
    reservasHoy: deHoy.length,
    pendientes: todas.filter((r) => r.status === 'pending').length,
    confirmadas: deHoy.filter((r) => r.status === 'confirmed').length,
    personasEsperadas: deHoy
      .filter((r) => r.status === 'confirmed')
      .reduce((s, r) => s + r.party_size, 0),
    clientesNuevos: clientes.filter((c) => c.cliente.created_at >= corte).length,
  };
}

export async function proximasReservas(limite = 8): Promise<ReservaConCliente[]> {
  const hoy = new Date().toISOString().slice(0, 10);
  const todas = await listarReservas({ desde: hoy });
  return todas
    .filter((r) => r.status === 'pending' || r.status === 'confirmed')
    .slice(0, limite);
}

/** PRD §33 — reportes MVP. */
export async function reportes(desde: string, hasta: string) {
  const filas = await listarReservas({ desde, hasta });
  const porEstado = (e: EstadoReserva) => filas.filter((r) => r.status === e).length;

  const porDia = new Map<string, number>();
  const porHora = new Map<string, number>();
  for (const r of filas) {
    porDia.set(r.reservation_date, (porDia.get(r.reservation_date) ?? 0) + 1);
    porHora.set(r.reservation_time, (porHora.get(r.reservation_time) ?? 0) + 1);
  }

  const clientes = await listarClientes();
  const idsEnRango = new Set(filas.map((r) => r.customer_id));

  return {
    solicitudes: filas.length,
    confirmadas: porEstado('confirmed'),
    rechazadas: porEstado('rejected'),
    canceladas: porEstado('cancelled'),
    completadas: porEstado('completed'),
    noShows: porEstado('no_show'),
    personas: filas.reduce((s, r) => s + r.party_size, 0),
    clientesNuevos: clientes.filter(
      (c) => idsEnRango.has(c.cliente.id) && c.total === 1,
    ).length,
    clientesRecurrentes: clientes.filter(
      (c) => idsEnRango.has(c.cliente.id) && c.total > 1,
    ).length,
    diasTop: [...porDia.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
    horasTop: [...porHora.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5),
  };
}
