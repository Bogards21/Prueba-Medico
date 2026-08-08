import Link from 'next/link';

/** PRD §13 — bloque de conversión. */
export function Conversion() {
  return (
    <section className="sobre-oscuro curva-superior curva-inferior bg-hoja py-24 text-espuma">
      <div className="marco text-center">
        <h2 className="display mx-auto max-w-3xl text-[clamp(2rem,6vw,3.5rem)] text-espuma">
          Tu mesa. Tu gente. Tu terraza.
        </h2>
        <p className="mx-auto mt-5 max-w-xl text-lg text-menta">
          Mándanos tu solicitud y te confirmamos la mesa.
        </p>
        <Link href="/reservar" className="btn-claro mt-9 text-base">
          Reservar ahora
        </Link>
      </div>
    </section>
  );
}
