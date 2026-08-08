import { ESTILO_ESTADO, ETIQUETA_ESTADO, type EstadoReserva } from '@/lib/tipos';

/**
 * Distintivo de estado.
 * PRD §41: el estado nunca se comunica solo por color — lleva icono y texto,
 * de modo que funcione en daltonismo y en impresión a blanco y negro.
 */
export function Estado({ estado }: { estado: EstadoReserva }) {
  const { clase, icono } = ESTILO_ESTADO[estado];
  return (
    <span
      className={`dato inline-flex items-center gap-1.5 whitespace-nowrap rounded-pill border px-3 py-1 text-xs uppercase ${clase}`}
    >
      <span aria-hidden>{icono}</span>
      {ETIQUETA_ESTADO[estado]}
    </span>
  );
}
