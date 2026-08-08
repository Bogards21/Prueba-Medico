'use client';

import { useEffect, useState } from 'react';
import { negocio } from '@/data/negocio';
import { estaAbiertoAhora, formatoAmPm } from '@/lib/horarios';

/**
 * Píldora "abierto ahora".
 *
 * Se calcula en el cliente después de montar: hacerlo en el servidor daría la
 * hora del servidor (UTC en Vercel), no la del visitante, y mostraría "abierto"
 * a deshoras. Antes de montar no se renderiza nada para evitar hydration
 * mismatch.
 */
export function EstadoApertura({ className = '' }: { className?: string }) {
  const [estado, setEstado] = useState<ReturnType<typeof estaAbiertoAhora> | null>(null);

  useEffect(() => {
    const calcular = () => setEstado(estaAbiertoAhora());
    calcular();
    const id = setInterval(calcular, 60_000);
    return () => clearInterval(id);
  }, []);

  if (!estado) return null;

  // Los horarios aún no están confirmados: no afirmar que está abierto.
  if (negocio.horarios.pendiente) {
    return (
      <p className={`dato text-sm text-carbon/70 ${className}`}>
        Consulta horarios por WhatsApp o redes
      </p>
    );
  }

  return (
    <p
      className={`inline-flex items-center gap-2 rounded-pill border px-4 py-2 text-sm ${
        estado.abierto
          ? 'border-hoja bg-menta text-noche'
          : 'border-borde bg-espuma text-carbon'
      } ${className}`}
    >
      <span
        aria-hidden
        className={`h-2.5 w-2.5 rounded-full ${estado.abierto ? 'bg-hoja' : 'bg-neutral-400'}`}
      />
      <span className="dato">
        {estado.abierto
          ? `Abierto ahora · cierra ${formatoAmPm(estado.cierraA!)}`
          : estado.abreA
            ? `Cerrado · abre ${formatoAmPm(estado.abreA)}`
            : 'Cerrado'}
      </span>
    </p>
  );
}
