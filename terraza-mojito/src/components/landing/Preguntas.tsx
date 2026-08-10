import { reglasReserva } from '@/data/negocio';
import { DatoPendiente } from '@/components/ui/DatoPendiente';

/**
 * Preguntas frecuentes = manejo de objeciones.
 *
 * Cada pregunta corresponde a una duda que hace abandonar la reserva. Las
 * respuestas se derivan de reglas que el sistema realmente aplica —los plazos
 * salen de `reglasReserva`, no de un texto suelto—, así que no pueden
 * prometer algo que el motor luego rechace.
 *
 * Las políticas que dependen del negocio y que aún no se confirman se marcan
 * como pendientes en vez de responderse a la ligera: una respuesta inventada
 * aquí genera un reclamo en la puerta.
 */
const PREGUNTAS: { pregunta: string; respuesta: React.ReactNode }[] = [
  {
    pregunta: '¿Reservar tiene algún costo?',
    respuesta:
      'No. Apartar mesa es gratis y no pedimos tarjeta ni anticipo. Solo pagas lo que consumas.',
  },
  {
    pregunta: '¿Mi mesa queda apartada en cuanto envío el formulario?',
    respuesta:
      'Todavía no. Lo que envías es una solicitud: revisamos que haya lugar para tu grupo y te confirmamos. Hasta que recibas nuestra confirmación, la mesa no está apartada.',
  },
  {
    pregunta: '¿Con cuánta anticipación puedo reservar?',
    respuesta: `Desde ${reglasReserva.antelacionMinimaHoras} horas antes y hasta ${reglasReserva.diasMaximosAnticipacion} días por adelantado. Si es para hoy mismo y ya vas tarde, escríbenos por redes.`,
  },
  {
    pregunta: '¿Y si somos un grupo grande?',
    respuesta: `Puedes reservar hasta ${reglasReserva.personasMaximoAbsoluto} personas desde el sitio. A partir de ${reglasReserva.personasMaximoDirecto} revisamos el acomodo antes de confirmar, para no prometerte un espacio que no podamos darte.`,
  },
  {
    pregunta: '¿Puedo pedir algo especial?',
    respuesta:
      'Sí. Hay un campo de peticiones al reservar: mesa en la terraza, una celebración sorpresa, lo que necesites. No siempre podemos garantizarlo, pero siempre lo leemos.',
  },
  {
    pregunta: '¿Qué pasa si ya no puedo ir?',
    respuesta: (
      <>
        Avísanos con tiempo por nuestras redes y liberamos la mesa para alguien más.
        <DatoPendiente que="Política de cancelación" className="mt-3" />
      </>
    ),
  },
];

export function Preguntas() {
  return (
    <section className="py-24">
      <div className="marco">
        <div className="mb-12 max-w-2xl">
          <p className="dato mb-3 text-sm uppercase text-hoja">Antes de reservar</p>
          <h2 className="display text-[clamp(1.875rem,4.5vw,2.75rem)]">
            Lo que suelen preguntarnos
          </h2>
        </div>

        <div className="mx-auto max-w-3xl divide-y divide-borde border-y border-borde">
          {PREGUNTAS.map(({ pregunta, respuesta }) => (
            <details key={pregunta} className="group py-5">
              <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-lg font-bold text-noche marker:content-none">
                {pregunta}
                <span
                  aria-hidden
                  className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-lima-pale text-xl leading-none text-noche transition-transform group-open:rotate-45"
                >
                  +
                </span>
              </summary>
              <div className="mt-3 max-w-2xl text-carbon/85">{respuesta}</div>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}
