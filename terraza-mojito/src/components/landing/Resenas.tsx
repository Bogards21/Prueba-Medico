import { Quote, Star } from 'lucide-react';
import { negocio } from '@/data/negocio';

/**
 * Prueba social.
 *
 * En una landing de venta este es el bloque que más pesa, y por eso mismo es
 * el que no se puede rellenar con texto plausible. Mientras no haya reseñas
 * reales cargadas en `negocio.resenas`, se muestra un marco vacío que declara
 * qué va aquí, igual que en la galería. Nada de testimonios de relleno.
 */
export function Resenas() {
  const { resenas, rating } = negocio;
  const hayResenas = !resenas.pendiente && resenas.valor.length > 0;

  return (
    <section className="bg-lima-pale/30 py-24">
      <div className="marco">
        <div className="mb-12 max-w-2xl">
          <p className="dato mb-3 text-sm uppercase text-hoja">Lo que dicen</p>
          <h2 className="display text-[clamp(1.875rem,4.5vw,2.75rem)]">
            Quien ya vino, lo cuenta mejor
          </h2>

          {!rating.pendiente && rating.valor && (
            <p className="mt-4 flex items-center gap-2 text-lg text-carbon/85">
              <Star aria-hidden size={20} className="fill-current text-hoja" />
              <span className="dato text-noche">{rating.valor.valor}</span>
              <span>en {rating.valor.resenas} reseñas de Google</span>
            </p>
          )}
        </div>

        {hayResenas ? (
          <ul className="grid gap-5 md:grid-cols-3">
            {resenas.valor.map((r) => (
              <li key={r.autor} className="tarjeta flex flex-col p-7">
                <Quote aria-hidden size={26} className="mb-4 text-mojito" />
                <blockquote className="flex-1 text-lg text-carbon/90">{r.texto}</blockquote>
                <footer className="mt-5 border-t border-borde pt-4 text-sm">
                  <span className="block font-bold text-noche">{r.autor}</span>
                  <span className="text-carbon/60">{r.fuente}</span>
                </footer>
              </li>
            ))}
          </ul>
        ) : (
          <div className="rounded-lg border-2 border-dashed border-mojito/40 bg-espuma/60 p-10 text-center">
            <Quote aria-hidden size={30} className="mx-auto mb-4 text-mojito" />
            <p className="mx-auto max-w-lg text-carbon/80">
              Aquí van tres reseñas reales de clientes, copiadas de Google o de redes
              con su autorización.
            </p>
            <p className="mx-auto mt-3 max-w-lg text-sm text-carbon/60">
              No se publican testimonios inventados: además de engañar al visitante,
              las reseñas falsas son sancionables. Se cargan en{' '}
              <code className="font-mono">src/data/negocio.ts</code>.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
