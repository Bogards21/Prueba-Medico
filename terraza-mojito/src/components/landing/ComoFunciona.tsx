import { CalendarCheck, MessageCircle, PartyPopper } from 'lucide-react';
import { reglasReserva } from '@/data/negocio';

/**
 * "Cómo funciona" — bloque de reducción de fricción.
 *
 * La objeción más cara de esta landing no es el precio: es la incertidumbre
 * de "mando la solicitud y no sé qué pasa". Aquí sí aplica una secuencia
 * numerada, porque el contenido ES una secuencia y el orden le importa a
 * quien duda si su mesa queda apartada.
 */
const PASOS = [
  {
    icono: CalendarCheck,
    titulo: 'Eliges día, hora y cuántos son',
    texto: 'Toma menos de un minuto. No pedimos tarjeta ni anticipo.',
  },
  {
    icono: MessageCircle,
    titulo: 'Revisamos y te confirmamos',
    texto: 'Te avisamos por WhatsApp o correo. Si no hay lugar, te proponemos otra hora.',
  },
  {
    icono: PartyPopper,
    titulo: 'Llegas y tu mesa te espera',
    texto: 'Sin filas ni malentendidos. Solo llegar y sentarte.',
  },
];

export function ComoFunciona() {
  return (
    <section id="como-funciona" className="py-24">
      <div className="marco">
        <div className="mb-14 max-w-2xl">
          <p className="dato mb-3 text-sm uppercase text-hoja">Cómo funciona</p>
          <h2 className="display text-[clamp(1.875rem,4.5vw,2.75rem)]">
            Apartar mesa toma un minuto
          </h2>
          <p className="mt-4 text-lg text-carbon/80">
            Reservar es gratis. Solo confirmamos que haya lugar para tu grupo.
          </p>
        </div>

        <ol className="grid gap-6 md:grid-cols-3">
          {PASOS.map(({ icono: Icono, titulo, texto }, i) => (
            <li key={titulo} className="relative">
              {/* Línea de continuidad entre pasos, solo en escritorio */}
              {i < PASOS.length - 1 && (
                <span
                  aria-hidden
                  className="absolute left-[3.25rem] top-6 hidden h-0.5 w-[calc(100%-2rem)] bg-borde md:block"
                />
              )}
              <div className="relative">
                <span className="relative z-10 mb-5 flex h-12 w-12 items-center justify-center rounded-full bg-noche text-espuma">
                  <Icono aria-hidden size={22} />
                </span>
                <p className="dato mb-2 text-xs uppercase text-hoja">Paso {i + 1}</p>
                <h3 className="text-xl font-extrabold text-noche">{titulo}</h3>
                <p className="mt-2 text-carbon/80">{texto}</p>
              </div>
            </li>
          ))}
        </ol>

        <p className="mt-10 rounded-md border border-borde bg-lima-pale/40 px-5 py-4 text-carbon/85">
          Puedes reservar desde {reglasReserva.antelacionMinimaHoras} horas antes y hasta{' '}
          {reglasReserva.diasMaximosAnticipacion} días por adelantado.
        </p>
      </div>
    </section>
  );
}
