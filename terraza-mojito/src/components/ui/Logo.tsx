import Image from 'next/image';

/**
 * Firma de marca.
 *
 * ─── Para usar el logotipo original ──────────────────────────────────────
 * 1. Coloca el archivo en `public/logo.png` (o .svg).
 * 2. Pon USAR_ARCHIVO_ORIGINAL en true.
 * Con eso se muestra el activo real y deja de dibujarse la aproximación.
 * ─────────────────────────────────────────────────────────────────────────
 *
 * Mientras tanto se compone: isotipo vectorial + lettering en serif.
 *
 * NOTA SOBRE LA TIPOGRAFÍA: el manual describe el lettering como "redondeado
 * personalizado" y fija Fredoka para títulos, pero el logotipo real que envió
 * el cliente usa un SERIF de alto contraste con "EST. 2024" debajo. Aquí manda
 * el activo real, no la descripción del manual, así que la firma va en serif
 * aunque el resto de la web siga usando Fredoka para los títulos.
 */
const USAR_ARCHIVO_ORIGINAL = false;
const RUTA_ARCHIVO_ORIGINAL = '/logo.png';

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
  const negativa = variante === 'negativa';

  if (USAR_ARCHIVO_ORIGINAL && !soloIsotipo) {
    const alto = { sm: 40, md: 56, lg: 190 }[tamano];
    return (
      <Image
        src={RUTA_ARCHIVO_ORIGINAL}
        alt="Terraza Mojito"
        width={alto}
        height={alto}
        priority={tamano === 'lg'}
        className={`h-auto w-auto ${negativa ? 'brightness-0 invert' : ''}`}
        style={{ maxHeight: alto }}
      />
    );
  }

  // Manual §5: por debajo de 40 px va la versión simplificada del isotipo.
  const marca = dims < 40 ? '/isotipo-simple.svg' : '/isotipo.svg';

  const escalaTexto = { sm: 'text-[15px]', md: 'text-lg', lg: 'text-4xl' }[tamano];
  const escalaEst = { sm: 'text-[7px]', md: 'text-[9px]', lg: 'text-[15px]' }[tamano];

  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src={marca}
        alt=""
        width={dims}
        height={dims}
        priority={tamano === 'lg'}
        className={negativa ? 'brightness-0 invert' : undefined}
      />
      <span className={negativa ? 'text-espuma' : 'text-noche'}>
        <span
          className={`block font-marca font-bold leading-[0.95] tracking-[0.02em] ${escalaTexto}`}
        >
          <span className="block">TERRAZA</span>
          <span className="block">MOJITO</span>
        </span>
        <span
          className={`mt-0.5 block font-marca uppercase tracking-[0.28em] ${escalaEst} ${
            negativa ? 'text-menta' : 'text-hoja'
          }`}
        >
          Est. 2024
        </span>
      </span>
    </span>
  );
}
