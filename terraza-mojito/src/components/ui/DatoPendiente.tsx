import { Info } from 'lucide-react';

/**
 * Marcador de dato faltante.
 *
 * El PRD §14 y §60 prohíben inventar datos del negocio. Cuando falta uno se
 * muestra esto en lugar de un placeholder que parezca real, para que nadie
 * publique por error una dirección o un teléfono ficticio.
 */
export function DatoPendiente({
  que,
  className = '',
}: {
  que: string;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-sm border border-dashed border-amber-500 bg-amber-50 px-2.5 py-1 text-sm text-amber-900 ${className}`}
    >
      <Info aria-hidden size={14} className="shrink-0" />
      <span>
        <span className="sr-only">Dato pendiente: </span>
        {que} por confirmar
      </span>
    </span>
  );
}
