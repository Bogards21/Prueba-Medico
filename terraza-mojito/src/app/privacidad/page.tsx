import type { Metadata } from 'next';
import Link from 'next/link';
import { Logo } from '@/components/ui/Logo';
import { DatoPendiente } from '@/components/ui/DatoPendiente';
import { negocio } from '@/data/negocio';

export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description:
    'Cómo Terraza Mojito trata los datos personales que recibe a través de su sitio de reservas.',
};

/**
 * Aviso de privacidad conforme a la LFPDPPP (México), artículos 15 y 16.
 *
 * ATENCIÓN: este documento está redactado sobre los datos que el sistema
 * realmente recolecta, pero la identidad del responsable y su domicilio siguen
 * pendientes. Debe revisarlo un abogado antes de publicarlo: aquí no se
 * inventa razón social ni domicilio fiscal.
 */
export default function Privacidad() {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="border-b border-borde">
        <div className="marco flex h-20 items-center">
          <Link href="/" aria-label="Terraza Mojito, inicio">
            <Logo tamano="sm" />
          </Link>
        </div>
      </header>

      <main id="contenido" className="marco flex-1 py-14">
        <article className="mx-auto max-w-2xl">
          <h1 className="display text-4xl">Aviso de privacidad</h1>
          <p className="mt-3 text-carbon/70">
            Última actualización: pendiente de publicación.
          </p>

          <div className="mt-6 rounded-md border-2 border-amber-400 bg-amber-50 p-5 text-amber-900">
            <p className="font-bold">Borrador sin validar</p>
            <p className="mt-1 text-[15px]">
              Este texto describe con exactitud los datos que el sistema recolecta, pero
              falta la identidad legal del responsable y debe revisarlo un abogado antes
              de publicarse.
            </p>
          </div>

          <div className="mt-10 space-y-9 text-[17px] leading-relaxed text-carbon/90">
            <section>
              <h2 className="display mb-3 text-2xl">Quién es responsable de tus datos</h2>
              <p>
                {negocio.nombre.valor}, con domicilio en {negocio.ciudad.valor}, es
                responsable del tratamiento de tus datos personales.
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <DatoPendiente que="Razón social" />
                <DatoPendiente que="Domicilio fiscal" />
                <DatoPendiente que="Correo de contacto de privacidad" />
              </div>
            </section>

            <section>
              <h2 className="display mb-3 text-2xl">Qué datos recolectamos</h2>
              <p>Cuando solicitas una mesa te pedimos:</p>
              <ul className="mt-3 list-disc space-y-1 pl-6">
                <li>Nombre y apellidos</li>
                <li>Teléfono</li>
                <li>Correo electrónico</li>
                <li>Fecha, hora y número de personas de tu solicitud</li>
                <li>Ocasión y peticiones especiales, si decides indicarlas</li>
              </ul>
              <p className="mt-3">
                No recolectamos datos personales sensibles ni datos financieros o
                patrimoniales.
              </p>
            </section>

            <section>
              <h2 className="display mb-3 text-2xl">Para qué los usamos</h2>
              <p>Finalidades necesarias para darte el servicio:</p>
              <ul className="mt-3 list-disc space-y-1 pl-6">
                <li>Gestionar, confirmar o rechazar tu solicitud de reserva</li>
                <li>Contactarte por cambios relacionados con tu reserva</li>
                <li>Llevar el historial de tus visitas para atenderte mejor</li>
              </ul>
              <p className="mt-4">
                Finalidad adicional, que <strong>solo aplicamos si la autorizas</strong>{' '}
                marcando la casilla correspondiente: enviarte promociones y novedades. Tu
                reserva funciona igual si no la autorizas.
              </p>
            </section>

            <section>
              <h2 className="display mb-3 text-2xl">Con quién los compartimos</h2>
              <p>
                No vendemos ni compartimos tus datos con terceros para fines comerciales.
                Nos apoyamos en proveedores tecnológicos que alojan el sitio y la base de
                datos, y que los tratan únicamente por nuestra instrucción.
              </p>
            </section>

            <section>
              <h2 className="display mb-3 text-2xl">Cuánto tiempo los conservamos</h2>
              <p>
                Conservamos tu historial de reservas mientras sigas siendo cliente y por
                el plazo que exija la normativa aplicable. Si pides la eliminación de tus
                datos, la atendemos salvo que debamos conservarlos por obligación legal.
              </p>
            </section>

            <section>
              <h2 className="display mb-3 text-2xl">Tus derechos ARCO</h2>
              <p>
                Puedes solicitar el <strong>acceso</strong>, la <strong>rectificación</strong>,
                la <strong>cancelación</strong> de tus datos u <strong>oponerte</strong> a
                su tratamiento, así como revocar tu consentimiento en cualquier momento.
                Para ejercerlos, escríbenos al correo de contacto de privacidad.
              </p>
              <DatoPendiente que="Procedimiento y plazos de respuesta ARCO" className="mt-3" />
            </section>

            <section>
              <h2 className="display mb-3 text-2xl">Cambios a este aviso</h2>
              <p>
                Si modificamos este aviso, publicaremos la versión actualizada en esta
                misma página con su fecha de actualización.
              </p>
            </section>
          </div>

          <Link href="/" className="btn-secundario mt-12">
            Volver al inicio
          </Link>
        </article>
      </main>
    </div>
  );
}
