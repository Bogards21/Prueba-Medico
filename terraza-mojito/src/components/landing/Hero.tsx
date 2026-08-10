import Image from 'next/image';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { EstadoApertura } from './EstadoApertura';

/**
 * Hero.
 *
 * Fondo blanco, no fotografía oscura a sangre: el manual fija 55% Blanco
 * Espuma y descarta explícitamente la lectura de "antro nocturno".
 * La mancha orgánica en Lima Pálida sustituye a la foto mientras no haya
 * material fotográfico real.
 */
export function Hero() {
  return (
    <section className="relative overflow-hidden pb-20 pt-8 sm:pt-14">
      {/* Mancha orgánica de fondo */}
      <div aria-hidden className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -right-24 -top-32 h-[38rem] w-[38rem] rounded-full bg-lima-pale/70 blur-[2px]" />
        <div className="absolute -left-40 top-40 h-96 w-96 rounded-full bg-menta/40" />
      </div>

      <div className="marco grid items-center gap-12 lg:grid-cols-[1.05fr_0.95fr]">
        <div className="animate-fade-up">
          <p className="dato mb-5 text-sm uppercase text-hoja">
            Metepec · Estado de México
          </p>

          <h1 className="display text-[clamp(2.75rem,8vw,4.5rem)] text-noche">
            Frescura que
            <br />
            se comparte.
          </h1>

          <p className="mt-6 max-w-lg text-xl text-carbon/85">
            Mojitos frescos y terraza al aire libre en Metepec. Aparta tu mesa en un
            minuto y llega a lo único que importa: pasarla bien.
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link href="/reservar" className="btn-primario text-base">
              Reserva tu mesa
            </Link>
            <a href="#como-funciona" className="btn-secundario text-base">
              Cómo funciona
            </a>
          </div>

          {/*
            Reductores de riesgo justo bajo el CTA: son las tres objeciones que
            frenan el clic —que cueste, que pidan tarjeta, que sea complicado—
            y las tres son ciertas del sistema tal como está construido.
          */}
          <ul className="mt-6 flex flex-wrap gap-x-6 gap-y-2 text-[15px] text-carbon/70">
            {['Reservar es gratis', 'Sin tarjeta ni anticipo', 'Te confirmamos personalmente'].map(
              (punto) => (
                <li key={punto} className="flex items-center gap-2">
                  <Check aria-hidden size={16} className="shrink-0 text-hoja" />
                  {punto}
                </li>
              ),
            )}
          </ul>

          <EstadoApertura className="mt-8" />
        </div>

        {/* Isotipo grande con hojas flotando */}
        <div className="relative mx-auto w-full max-w-md lg:max-w-none">
          <div className="relative aspect-square">
            <div
              aria-hidden
              className="absolute inset-[8%] rounded-full bg-espuma shadow-card"
            />
            <Image
              src="/isotipo.svg"
              alt="Vaso de mojito con hojas de hierbabuena, hielo y rodaja de limón"
              fill
              priority
              sizes="(max-width: 1024px) 90vw, 44vw"
              className="animate-float object-contain p-[12%]"
            />
          </div>
        </div>
      </div>
    </section>
  );
}
