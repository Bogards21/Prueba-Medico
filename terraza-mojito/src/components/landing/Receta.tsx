/**
 * Sección "Experiencia" — elemento firma de la página.
 *
 * En vez de tres tarjetas numeradas genéricas, la propuesta se presenta como
 * la receta del mojito. La estructura (ingredientes + cantidades + pasos) sí
 * codifica algo real del sujeto y usa el territorio verbal que el manual §2
 * fija para la marca: menta, limón, terraza, amigos, mezcla, celebración.
 */

const INGREDIENTES = [
  { cantidad: '12', unidad: 'hojas', nombre: 'de hierbabuena', nota: 'Machacadas, nunca molidas.' },
  { cantidad: '2', unidad: 'limones', nombre: 'recién partidos', nota: 'El ácido despierta todo lo demás.' },
  { cantidad: '1', unidad: 'terraza', nombre: 'al aire libre', nota: 'De preferencia al atardecer.' },
  { cantidad: '4', unidad: 'amigos', nombre: 'sin prisa', nota: 'Se admite improvisar el número.' },
];

const PASOS = [
  'Llegas. La tarde todavía tiene luz.',
  'Se sirve la primera ronda. Alguien cuenta algo.',
  'Nadie revisa la hora.',
];

export function Receta() {
  return (
    <section
      id="experiencia"
      className="sobre-oscuro curva-superior curva-inferior bg-noche py-24 text-espuma"
    >
      <div className="marco">
        <div className="max-w-2xl">
          <p className="dato mb-4 text-sm uppercase text-lima">La receta</p>
          <h2 className="display text-[clamp(2rem,5vw,3.25rem)] text-espuma">
            Menta. Limón. Terraza. Amigos.
          </h2>
          <p className="mt-5 text-lg text-menta">
            No vendemos únicamente mojitos. Vendemos la pausa fresca del día.
          </p>
        </div>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1.15fr_0.85fr]">
          {/* Ingredientes */}
          <ul className="space-y-0 border-t border-hoja">
            {INGREDIENTES.map((ing) => (
              <li
                key={ing.nombre}
                className="flex items-baseline gap-5 border-b border-hoja py-6"
              >
                <span className="display w-16 shrink-0 text-right text-4xl text-lima">
                  {ing.cantidad}
                </span>
                <span className="min-w-0">
                  <span className="block text-xl font-bold text-espuma">
                    {ing.unidad} <span className="font-normal text-menta">{ing.nombre}</span>
                  </span>
                  <span className="mt-1 block text-menta/70">{ing.nota}</span>
                </span>
              </li>
            ))}
          </ul>

          {/* Preparación */}
          <div className="rounded-lg bg-hoja/40 p-8">
            <h3 className="dato text-sm uppercase text-lima">Preparación</h3>
            <ol className="mt-6 space-y-6">
              {PASOS.map((paso, i) => (
                <li key={paso} className="flex gap-4">
                  <span
                    aria-hidden
                    className="dato mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-lima text-sm text-noche"
                  >
                    {i + 1}
                  </span>
                  <span className="text-lg text-espuma">{paso}</span>
                </li>
              ))}
            </ol>
            <p className="mt-8 border-t border-hoja pt-6 text-menta">
              Rinde: una tarde entera.
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
