import Image from 'next/image';

/**
 * Firma de marca.
 *
 * ADVERTENCIA: el manual §5 pide conservar el lettering original vectorizado y
 * prohíbe reconstruirlo con una fuente. Aquí el nombre se compone con Fredoka
 * porque no se recibió el archivo vectorial del lettering. En cuanto llegue el
 * SVG maestro, sustituir este bloque de texto por el asset.
 */
export function Logo({
  variante = 'color',
  tamano = 'md',
  soloIsotipo = false,
}: {
  variante?: 'color' | 'negativa';
  tamano?: 'sm' | 'md' | 'lg';
  soloIsotipo?: boolean;
}) {
  const dims = { sm: 34, md: 46, lg: 128 }[tamano];
  const texto = { sm: 'text-base', md: 'text-xl', lg: 'text-5xl' }[tamano];
  const color = variante === 'negativa' ? 'text-espuma' : 'text-noche';

  // Manual §5: por debajo de 40 px va la versión simplificada, no el isotipo
  // completo — a ese tamaño las venas de la hoja y los gajos se vuelven ruido.
  const marca = dims < 40 ? '/isotipo-simple.svg' : '/isotipo.svg';

  return (
    <span className="inline-flex items-center gap-3">
      <Image
        src={marca}
        alt=""
        width={dims}
        height={dims}
        priority={tamano === 'lg'}
        className={variante === 'negativa' ? 'brightness-0 invert' : undefined}
      />
      {!soloIsotipo && (
        <span className={`display leading-[0.88] ${texto} ${color}`}>
          <span className="block">TERRAZA</span>
          <span className="block">MOJITO</span>
        </span>
      )}
    </span>
  );
}
