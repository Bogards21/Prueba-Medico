import { CONTENIDO_DEMO } from '@/data/negocio';

/**
 * Franja de cortesía para la presentación al cliente.
 *
 * Mientras la página muestre datos inventados, hay que decirlo. Sin esto,
 * alguien puede compartir el enlace y un comensal marcar un teléfono que no
 * existe. Desaparece sola al poner CONTENIDO_DEMO en false.
 */
export function AvisoDemo() {
  if (!CONTENIDO_DEMO) return null;

  return (
    <p className="bg-noche px-5 py-2 text-center text-sm text-menta">
      Vista previa · Dirección, teléfono, precios y reseñas son datos de ejemplo
    </p>
  );
}
