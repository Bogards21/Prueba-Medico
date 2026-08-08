import { GlassWater, Sun, TreePalm, PartyPopper } from 'lucide-react';

/** PRD §11 — diferenciadores. */
const TARJETAS = [
  {
    icono: GlassWater,
    titulo: 'Mojitos frescos',
    texto: 'Ingredientes y sabores que acompañan el momento.',
  },
  {
    icono: Sun,
    titulo: 'Ambiente relajado',
    texto: 'Un espacio diseñado para compartir.',
  },
  {
    icono: TreePalm,
    titulo: 'Terraza',
    texto: 'Una experiencia al aire libre.',
  },
  {
    icono: PartyPopper,
    titulo: 'Celebra aquí',
    texto: 'Reservaciones para reuniones y ocasiones especiales.',
  },
];

export function Beneficios() {
  return (
    <section className="py-24">
      <div className="marco">
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {TARJETAS.map(({ icono: Icono, titulo, texto }) => (
            <article
              key={titulo}
              className="tarjeta group p-7 transition-shadow duration-200 hover:shadow-card"
            >
              <span className="mb-5 inline-flex h-14 w-14 items-center justify-center rounded-md bg-lima-pale text-noche transition-colors group-hover:bg-menta">
                <Icono aria-hidden size={26} strokeWidth={2} />
              </span>
              <h3 className="text-xl font-extrabold text-noche">{titulo}</h3>
              <p className="mt-2 text-carbon/80">{texto}</p>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
