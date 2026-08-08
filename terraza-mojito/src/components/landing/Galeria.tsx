import { ImageIcon } from 'lucide-react';

/**
 * Galería.
 *
 * Todavía no hay fotografía real del lugar, así que en vez de rellenar con
 * imágenes de banco —que el manual §6 descarta explícitamente— se muestran
 * marcos vacíos que declaran qué foto va en cada hueco. Sirve de brief para
 * la sesión fotográfica y evita publicar un lugar que no es el suyo.
 *
 * Al recibir las fotos: sustituir HUECOS por un arreglo de imágenes y cambiar
 * cada figure por <Image> con alt descriptivo real.
 */
const HUECOS = [
  { pide: 'Terraza al atardecer, plano abierto', span: 'sm:col-span-2 sm:row-span-2' },
  { pide: 'Mojito en primer plano con condensación', span: '' },
  { pide: 'Grupo compartiendo en mesa', span: '' },
  { pide: 'Detalle de hierbabuena y limón', span: '' },
  { pide: 'Barra o preparación', span: '' },
  { pide: 'Ambiente al caer la tarde', span: 'sm:col-span-2' },
];

export function Galeria() {
  return (
    <section id="galeria" className="bg-menta/25 py-24">
      <div className="marco">
        <div className="mb-12 max-w-2xl">
          <p className="dato mb-3 text-sm uppercase text-hoja">Galería</p>
          <h2 className="display text-[clamp(1.875rem,4.5vw,2.75rem)]">
            Así se ve una buena tarde
          </h2>
        </div>

        <div className="grid auto-rows-[180px] grid-cols-2 gap-4 sm:grid-cols-4">
          {HUECOS.map((hueco) => (
            <figure
              key={hueco.pide}
              className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-mojito/40 bg-espuma/60 p-5 text-center ${hueco.span}`}
            >
              <ImageIcon aria-hidden size={26} className="text-mojito" />
              <figcaption className="text-sm text-carbon/70">{hueco.pide}</figcaption>
            </figure>
          ))}
        </div>

        <p className="mt-6 text-sm text-carbon/60">
          Espacios reservados para fotografía real del lugar. Ver brief fotográfico
          en el manual de identidad, sección 6.
        </p>
      </div>
    </section>
  );
}
