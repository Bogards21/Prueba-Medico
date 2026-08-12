import Image from 'next/image';

/**
 * Firma de marca. Usa los archivos originales que entregó el cliente.
 *
 * Tres casos, porque un solo archivo no sirve para todo:
 *
 * - `lg` en color → logotipo completo (`logo.png`), símbolo y lettering juntos.
 *   Es la versión principal y va en el hero.
 *
 * - `sm`/`md` en color → solo el símbolo (`isotipo-original.png`, recortado del
 *   original) acompañado del nombre en texto. El logotipo completo a 34 px
 *   dejaría el lettering ilegible, que es justo lo que el manual §5 pide evitar.
 *
 * - `negativa` → isotipo simplificado en blanco. Invertir la ilustración a
 *   color sobre fondo oscuro la convierte en una mancha sin detalle, así que
 *   sobre Verde Noche se usa la silueta, como marca el manual.
 *
 * El nombre en texto va en serif para coincidir con el lettering del original,
 * no en Fredoka.
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
  const negativa = variante === 'negativa';

  // Logotipo completo: el archivo ya trae el lettering, no se le añade texto.
  if (!negativa && tamano === 'lg' && !soloIsotipo) {
    return (
      <Image
        src="/logo.png"
        alt="Terraza Mojito"
        width={257}
        height={324}
        priority
        sizes="(max-width: 1024px) 60vw, 30vw"
        className="h-auto w-full max-w-[19rem] object-contain"
      />
    );
  }

  const dims = { sm: 36, md: 48, lg: 128 }[tamano];
  const marca = negativa ? '/isotipo-simple.svg' : '/isotipo-original.png';

  const escalaTexto = { sm: 'text-[15px]', md: 'text-lg', lg: 'text-4xl' }[tamano];
  const escalaEst = { sm: 'text-[7px]', md: 'text-[9px]', lg: 'text-[15px]' }[tamano];

  return (
    <span className="inline-flex items-center gap-2.5">
      <Image
        src={marca}
        alt={soloIsotipo ? 'Terraza Mojito' : ''}
        width={dims}
        height={dims}
        priority={tamano === 'lg'}
        className={negativa ? 'brightness-0 invert' : undefined}
      />
      {!soloIsotipo && (
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
      )}
    </span>
  );
}
