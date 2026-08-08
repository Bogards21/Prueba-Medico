export const PASOS = ['Fecha', 'Hora', 'Personas', 'Tus datos', 'Confirmar'] as const;

/** Indicador de progreso. PRD §15: el usuario siempre sabe dónde está. */
export function Pasos({ actual }: { actual: number }) {
  return (
    <nav aria-label="Progreso de la reserva" className="mb-10">
      <p className="dato mb-3 text-sm text-hoja">
        Paso {actual + 1} de {PASOS.length} · {PASOS[actual]}
      </p>
      <ol className="flex gap-1.5">
        {PASOS.map((paso, i) => (
          <li key={paso} className="flex-1">
            <span
              aria-current={i === actual ? 'step' : undefined}
              className={`block h-1.5 rounded-pill transition-colors ${
                i <= actual ? 'bg-hoja' : 'bg-borde'
              }`}
            >
              <span className="sr-only">
                {paso}
                {i < actual ? ' (completado)' : i === actual ? ' (paso actual)' : ''}
              </span>
            </span>
          </li>
        ))}
      </ol>
    </nav>
  );
}
