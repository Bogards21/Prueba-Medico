import Link from 'next/link';
import { negocio } from '@/data/negocio';
import { Logo } from '@/components/ui/Logo';

export function Footer() {
  const anio = new Date().getFullYear();

  return (
    <footer className="sobre-oscuro bg-noche pb-10 pt-16 text-menta">
      <div className="marco">
        <div className="flex flex-col gap-10 border-b border-hoja pb-10 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <Logo variante="negativa" tamano="md" />
            <p className="mt-4 max-w-xs text-menta/80">{negocio.tagline.valor}</p>
          </div>

          <nav aria-label="Pie de página">
            <ul className="flex flex-col gap-2 sm:items-end">
              <li>
                <Link href="/reservar" className="hover:text-espuma">
                  Reserva tu mesa
                </Link>
              </li>
              <li>
                <a href="/#menu" className="hover:text-espuma">
                  Conoce el menú
                </a>
              </li>
              <li>
                <a href="/#ubicacion" className="hover:text-espuma">
                  Cómo llegar
                </a>
              </li>
              <li>
                <Link href="/privacidad" className="hover:text-espuma">
                  Aviso de privacidad
                </Link>
              </li>
            </ul>
          </nav>
        </div>

        <div className="flex flex-col gap-3 pt-8 text-sm text-menta/60 sm:flex-row sm:items-center sm:justify-between">
          <p>
            © {anio} {negocio.nombre.valor} · {negocio.ciudad.valor}
          </p>
          <ul className="flex gap-5">
            {Object.entries(negocio.redes.valor).map(([nombre, url]) => (
              <li key={nombre}>
                <a
                  href={url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="capitalize hover:text-espuma"
                >
                  {nombre}
                </a>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </footer>
  );
}
