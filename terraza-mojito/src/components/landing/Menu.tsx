import { DatoPendiente } from '@/components/ui/DatoPendiente';

/**
 * Sección de menú.
 *
 * No se recibió carta ni precios. El PRD §14 prohíbe inventarlos, así que la
 * sección declara las categorías previstas y marca el contenido como
 * pendiente en lugar de mostrar platillos y precios ficticios.
 *
 * Al recibir la carta: sustituir CATEGORIAS por los productos reales con
 * precios; el manual §8 pide categorías en Verde Noche y precios en Verde
 * Mojito, y prohíbe usar el logotipo como marca de agua tras el texto.
 */
const CATEGORIAS = ['Coctelería', 'Mojitos de la casa', 'Cerveza', 'Sin alcohol', 'Para compartir'];

export function Menu() {
  return (
    <section id="menu" className="py-24">
      <div className="marco">
        <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
          <div>
            <p className="dato mb-3 text-sm uppercase text-hoja">Menú</p>
            <h2 className="display text-[clamp(1.875rem,4.5vw,2.75rem)]">
              Lo que se sirve
            </h2>
            <p className="mt-5 text-lg text-carbon/80">
              La carta completa se entrega en mesa. Estas son las familias que
              vas a encontrar.
            </p>
            <DatoPendiente que="Carta y precios" className="mt-6" />
          </div>

          <ul className="grid gap-3 sm:grid-cols-2">
            {CATEGORIAS.map((categoria) => (
              <li
                key={categoria}
                className="flex items-center rounded-md border border-borde bg-lima-pale/40 px-5 py-4 text-lg font-bold text-noche"
              >
                {categoria}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
