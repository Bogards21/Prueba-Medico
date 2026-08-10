import Link from 'next/link';
import { negocio, precioMXN } from '@/data/negocio';
import { DatoPendiente } from '@/components/ui/DatoPendiente';

/**
 * Carta.
 *
 * El manual §8 pide categorías en Verde Noche y precios en Verde Mojito, y
 * prohíbe usar el logotipo como marca de agua tras el texto.
 *
 * Si no hay carta cargada, se listan las familias previstas y se marca el
 * contenido como pendiente en vez de mostrar platillos y precios ficticios.
 */
const FAMILIAS = ['Coctelería', 'Mojitos de la casa', 'Cerveza', 'Sin alcohol', 'Para compartir'];

export function Menu() {
  const { menu } = negocio;
  const hayCarta = menu.valor.length > 0;

  return (
    <section id="menu" className="py-24">
      <div className="marco">
        <div className="mb-12 max-w-2xl">
          <p className="dato mb-3 text-sm uppercase text-hoja">Menú</p>
          <h2 className="display text-[clamp(1.875rem,4.5vw,2.75rem)]">Lo que se sirve</h2>
          <p className="mt-4 text-lg text-carbon/80">
            {hayCarta
              ? 'Una muestra de la carta. La completa se entrega en mesa.'
              : 'La carta completa se entrega en mesa. Estas son las familias que vas a encontrar.'}
          </p>
        </div>

        {hayCarta ? (
          <>
            <div className="grid gap-x-12 gap-y-10 md:grid-cols-2">
              {menu.valor.map((categoria) => (
                <section key={categoria.nombre}>
                  <h3 className="display border-b-2 border-lima-pale pb-2 text-xl text-noche">
                    {categoria.nombre}
                  </h3>
                  <ul className="mt-4 space-y-4">
                    {categoria.productos.map((p) => (
                      <li key={p.nombre} className="flex items-baseline justify-between gap-4">
                        <span className="min-w-0">
                          <span className="block font-bold text-noche">{p.nombre}</span>
                          <span className="block text-[15px] text-carbon/70">
                            {p.descripcion}
                          </span>
                        </span>
                        <span className="dato shrink-0 text-mojito">{precioMXN(p.precio)}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              ))}
            </div>

            <div className="mt-12 flex flex-wrap items-center gap-4">
              <Link href="/reservar" className="btn-primario">
                Reserva tu mesa
              </Link>
              <p className="text-sm text-carbon/60">Precios en pesos mexicanos.</p>
            </div>
          </>
        ) : (
          <div className="grid gap-12 lg:grid-cols-[0.9fr_1.1fr]">
            <div>
              <DatoPendiente que="Carta y precios" />
            </div>
            <ul className="grid gap-3 sm:grid-cols-2">
              {FAMILIAS.map((familia) => (
                <li
                  key={familia}
                  className="flex items-center rounded-md border border-borde bg-lima-pale/40 px-5 py-4 text-lg font-bold text-noche"
                >
                  {familia}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </section>
  );
}
