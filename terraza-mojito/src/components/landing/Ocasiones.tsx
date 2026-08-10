import Link from 'next/link';
import { Cake, Heart, Users, Sparkles } from 'lucide-react';

/**
 * Ocasiones.
 *
 * Bloque de venta por segmento: la reserva de grupo vale mucho más que la de
 * dos personas, y quien organiza un cumpleaños necesita verse reflejado para
 * saber que este lugar le sirve. Las ocasiones son las mismas que ofrece el
 * formulario de reserva, así que lo que se promete aquí se puede cumplir allá.
 */
const OCASIONES = [
  {
    icono: Cake,
    titulo: 'Cumpleaños',
    texto: 'Avísanos y preparamos la mesa para el festejado.',
  },
  {
    icono: Heart,
    titulo: 'Aniversarios',
    texto: 'Una tarde tranquila, sin prisas y al aire libre.',
  },
  {
    icono: Users,
    titulo: 'Reuniones',
    texto: 'Grupos grandes con acomodo revisado antes de confirmar.',
  },
  {
    icono: Sparkles,
    titulo: 'Solo porque sí',
    texto: 'La mejor razón para venir no necesita motivo.',
  },
];

export function Ocasiones() {
  return (
    <section className="bg-menta/25 py-24">
      <div className="marco">
        <div className="mb-12 max-w-2xl">
          <p className="dato mb-3 text-sm uppercase text-hoja">Ocasiones</p>
          <h2 className="display text-[clamp(1.875rem,4.5vw,2.75rem)]">
            ¿Qué están celebrando?
          </h2>
          <p className="mt-4 text-lg text-carbon/80">
            Dinos la ocasión al reservar y la tomamos en cuenta al acomodarte.
          </p>
        </div>

        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {OCASIONES.map(({ icono: Icono, titulo, texto }) => (
            <li key={titulo} className="tarjeta p-6">
              <Icono aria-hidden size={24} className="mb-4 text-hoja" />
              <h3 className="text-lg font-extrabold text-noche">{titulo}</h3>
              <p className="mt-2 text-carbon/80">{texto}</p>
            </li>
          ))}
        </ul>

        <div className="mt-10">
          <Link href="/reservar" className="btn-primario">
            Apartar mesa
          </Link>
        </div>
      </div>
    </section>
  );
}
