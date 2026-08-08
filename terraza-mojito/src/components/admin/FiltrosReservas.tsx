'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { Search, X } from 'lucide-react';
import { ESTADOS_RESERVA, ETIQUETA_ESTADO } from '@/lib/tipos';

/**
 * Filtros de la lista.
 * El estado vive en la URL para que un filtro concreto se pueda compartir y
 * sobreviva a recargar la página.
 */
export function FiltrosReservas({
  estado,
  fecha,
  busqueda,
}: {
  estado: string;
  fecha: string;
  busqueda: string;
}) {
  const router = useRouter();
  const [q, setQ] = useState(busqueda);

  function navegar(cambios: Record<string, string>) {
    const params = new URLSearchParams();
    const valores = { estado, fecha, q, ...cambios };
    if (valores.estado && valores.estado !== 'todas') params.set('estado', valores.estado);
    if (valores.fecha) params.set('fecha', valores.fecha);
    if (valores.q) params.set('q', valores.q);
    const cadena = params.toString();
    router.push(cadena ? `/admin/reservas?${cadena}` : '/admin/reservas');
  }

  const hayFiltros = estado !== 'todas' || Boolean(fecha) || Boolean(busqueda);

  return (
    <div className="tarjeta p-5">
      <div className="grid gap-4 sm:grid-cols-[1fr_auto_auto]">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            navegar({ q });
          }}
          role="search"
        >
          <label htmlFor="q" className="etiqueta">
            Buscar
          </label>
          <div className="flex gap-2">
            <input
              id="q"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Nombre, teléfono o correo"
              className="campo"
            />
            <button type="submit" className="btn-primario shrink-0 !px-4">
              <Search aria-hidden size={18} />
              <span className="sr-only">Buscar</span>
            </button>
          </div>
        </form>

        <div>
          <label htmlFor="estado" className="etiqueta">
            Estado
          </label>
          <select
            id="estado"
            value={estado}
            onChange={(e) => navegar({ estado: e.target.value })}
            className="campo"
          >
            <option value="todas">Todas</option>
            {ESTADOS_RESERVA.map((e) => (
              <option key={e} value={e}>
                {ETIQUETA_ESTADO[e]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="fecha" className="etiqueta">
            Fecha
          </label>
          <input
            id="fecha"
            type="date"
            value={fecha}
            onChange={(e) => navegar({ fecha: e.target.value })}
            className="campo"
          />
        </div>
      </div>

      {hayFiltros && (
        <button
          type="button"
          onClick={() => {
            setQ('');
            router.push('/admin/reservas');
          }}
          className="btn-fantasma mt-4 text-sm"
        >
          <X aria-hidden size={15} />
          Quitar filtros
        </button>
      )}
    </div>
  );
}
