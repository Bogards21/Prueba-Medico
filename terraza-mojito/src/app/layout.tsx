import type { Metadata, Viewport } from 'next';
import { CONTENIDO_DEMO, negocio } from '@/data/negocio';
import './globals.css';

/*
 * Las fuentes se cargan por <link> en lugar de next/font/google a propósito:
 * next/font descarga los archivos en tiempo de build, lo que rompe cualquier
 * build sin salida a fonts.googleapis.com. Con <link> el build es offline y el
 * navegador resuelve las fuentes. Si más adelante quieres auto-hospedarlas para
 * ganar unos ms de LCP, cámbialo por next/font/google en este archivo.
 */
const FUENTES =
  'https://fonts.googleapis.com/css2?family=Fredoka:wght@500;600;700&family=Nunito+Sans:wght@400;600;700;800&family=DM+Sans:wght@500;700&family=Playfair+Display:wght@700;800&display=swap';

const descripcion =
  'Mojitos frescos, terraza y buena compañía en Metepec. Reserva tu mesa en Terraza Mojito.';

export const metadata: Metadata = {
  title: {
    default: 'Terraza Mojito — Frescura que se comparte',
    template: '%s · Terraza Mojito',
  },
  description: descripcion,
  applicationName: 'Terraza Mojito',
  icons: { icon: '/favicon.svg' },
  openGraph: {
    title: 'Terraza Mojito — Frescura que se comparte',
    description: descripcion,
    locale: 'es_MX',
    type: 'website',
    siteName: 'Terraza Mojito',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Terraza Mojito — Frescura que se comparte',
    description: descripcion,
  },
  // La vista previa no se indexa: no queremos que un buscador levante un
  // negocio con datos de ejemplo. Al apagar CONTENIDO_DEMO vuelve a indexarse.
  robots: CONTENIDO_DEMO
    ? { index: false, follow: false }
    : { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: '#0A2F0F',
  width: 'device-width',
  initialScale: 1,
};

/**
 * JSON-LD de negocio local. Solo se emiten los campos realmente confirmados:
 * publicar una dirección o un teléfono inventado en datos estructurados sería
 * peor que omitirlos (PRD §14: "No inventar estos datos").
 */
function datosEstructurados() {
  // En vista previa NO se emiten datos estructurados: entregarle a Google una
  // dirección, un teléfono y unas coordenadas inventadas es publicar un
  // registro falso del negocio, y queda indexado aunque después se corrija.
  if (CONTENIDO_DEMO) return null;

  const base: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'BarOrPub',
    name: negocio.nombre.valor,
    slogan: negocio.tagline.valor,
    description: descripcion,
    sameAs: Object.values(negocio.redes.valor),
  };
  if (!negocio.direccion.pendiente) {
    base.address = {
      '@type': 'PostalAddress',
      streetAddress: negocio.direccion.valor,
      addressLocality: 'Metepec',
      addressRegion: 'Estado de México',
      addressCountry: 'MX',
    };
  }
  if (!negocio.telefono.pendiente) base.telephone = negocio.telefono.valor;
  if (!negocio.coordenadas.pendiente && negocio.coordenadas.valor) {
    base.geo = {
      '@type': 'GeoCoordinates',
      latitude: negocio.coordenadas.valor.lat,
      longitude: negocio.coordenadas.valor.lng,
    };
  }
  return base;
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-MX">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="stylesheet" href={FUENTES} />
        {(() => {
          const jsonLd = datosEstructurados();
          if (!jsonLd) return null;
          return (
            <script
              type="application/ld+json"
              dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
            />
          );
        })()}
      </head>
      <body>
        <a
          href="#contenido"
          className="btn-primario sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100]"
        >
          Saltar al contenido
        </a>
        {children}
      </body>
    </html>
  );
}
