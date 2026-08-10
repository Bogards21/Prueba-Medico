// lucide-react v1 retiró los iconos de marca (Instagram, Facebook…),
// así que las redes se señalan con AtSign en lugar de logos de terceros.
import { MapPin, Phone, Clock, AtSign } from 'lucide-react';
import { negocio, NOMBRE_DIA, type DiaSemana } from '@/data/negocio';
import { formatoAmPm } from '@/lib/horarios';
import { DatoPendiente } from '@/components/ui/DatoPendiente';

/** Orden de lunes a domingo para lectura, no el 0=domingo de JS. */
const ORDEN: DiaSemana[] = [1, 2, 3, 4, 5, 6, 0];

export function Ubicacion() {
  const { direccion, telefono, horarios, redes, coordenadas } = negocio;

  return (
    <section id="ubicacion" className="py-24">
      <div className="marco">
        <div className="mb-12 max-w-2xl">
          <p className="dato mb-3 text-sm uppercase text-hoja">Ubicación</p>
          <h2 className="display text-[clamp(1.875rem,4.5vw,2.75rem)]">
            Nos vemos en la terraza
          </h2>
        </div>

        <div className="grid gap-6 lg:grid-cols-2">
          {/* Datos de contacto */}
          <div className="tarjeta space-y-7 p-8">
            <div className="flex gap-4">
              <MapPin aria-hidden size={22} className="mt-1 shrink-0 text-hoja" />
              <div>
                <h3 className="dato text-sm uppercase text-noche">Dirección</h3>
                {direccion.pendiente ? (
                  <DatoPendiente que="Dirección" className="mt-2" />
                ) : (
                  <p className="mt-1 text-lg">{direccion.valor}</p>
                )}
                <p className="mt-1 text-carbon/70">{negocio.ciudad.valor}</p>
              </div>
            </div>

            <div className="flex gap-4">
              <Phone aria-hidden size={22} className="mt-1 shrink-0 text-hoja" />
              <div>
                <h3 className="dato text-sm uppercase text-noche">Teléfono</h3>
                {telefono.pendiente ? (
                  <DatoPendiente que="Teléfono" className="mt-2" />
                ) : (
                  <a
                    href={`tel:${telefono.valor}`}
                    className="mt-1 block text-lg underline decoration-mojito underline-offset-4"
                  >
                    {telefono.valor}
                  </a>
                )}
              </div>
            </div>

            <div className="flex gap-4">
              <Clock aria-hidden size={22} className="mt-1 shrink-0 text-hoja" />
              <div className="min-w-0 flex-1">
                <h3 className="dato text-sm uppercase text-noche">Horarios</h3>
                {horarios.pendiente && (
                  <DatoPendiente que="Horarios reales" className="mt-2" />
                )}
                <dl className="mt-3 space-y-1">
                  {ORDEN.map((dia) => {
                    const h = horarios.valor.find((x) => x.dia === dia);
                    const cerrado = !h?.abre || !h?.cierra;
                    return (
                      <div key={dia} className="flex justify-between gap-4 text-[15px]">
                        <dt className="text-carbon/70">{NOMBRE_DIA[dia]}</dt>
                        <dd className={cerrado ? 'text-carbon/45' : 'font-semibold'}>
                          {cerrado
                            ? 'Cerrado'
                            : `${formatoAmPm(h!.abre!)} – ${formatoAmPm(h!.cierra!)}`}
                        </dd>
                      </div>
                    );
                  })}
                </dl>
              </div>
            </div>

            <div className="flex gap-4 border-t border-borde pt-6">
              <AtSign aria-hidden size={22} className="mt-1 shrink-0 text-hoja" />
              <div>
                <h3 className="dato text-sm uppercase text-noche">Síguenos</h3>
                <ul className="mt-2 flex flex-wrap gap-x-5 gap-y-1">
                  {Object.entries(redes.valor).map(([nombre, url]) => (
                    <li key={nombre}>
                      <a
                        href={url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="capitalize underline decoration-mojito underline-offset-4"
                      >
                        {nombre}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          {/* Mapa */}
          {coordenadas.pendiente || !coordenadas.valor ? (
            <div className="tarjeta flex min-h-[22rem] flex-col items-center justify-center gap-4 bg-lima-pale/40 p-8 text-center">
              <MapPin aria-hidden size={34} className="text-mojito" />
              <p className="max-w-xs text-carbon/75">
                El mapa se activa cuando se confirmen las coordenadas del lugar en
                Google Maps.
              </p>
              <DatoPendiente que="Coordenadas" />
            </div>
          ) : (
            <div className="tarjeta flex flex-col overflow-hidden">
              {/*
                OpenStreetMap en lugar de Google Maps: no requiere clave de API
                ni carga scripts de terceros que rastreen al visitante.
                loading=lazy para no penalizar el LCP de la página.
              */}
              <iframe
                title={`Mapa de ubicación de ${negocio.nombre.valor}`}
                loading="lazy"
                className="min-h-[20rem] w-full flex-1 border-0"
                src={`https://www.openstreetmap.org/export/embed.html?bbox=${
                  coordenadas.valor.lng - 0.006
                }%2C${coordenadas.valor.lat - 0.004}%2C${coordenadas.valor.lng + 0.006}%2C${
                  coordenadas.valor.lat + 0.004
                }&layer=mapnik&marker=${coordenadas.valor.lat}%2C${coordenadas.valor.lng}`}
              />
              <div className="border-t border-borde p-5">
                <a
                  href={`https://www.google.com/maps/dir/?api=1&destination=${coordenadas.valor.lat},${coordenadas.valor.lng}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-primario w-full text-sm"
                >
                  Cómo llegar
                </a>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
