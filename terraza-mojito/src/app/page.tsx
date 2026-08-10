import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { ComoFunciona } from '@/components/landing/ComoFunciona';
import { Receta } from '@/components/landing/Receta';
import { Beneficios } from '@/components/landing/Beneficios';
import { Ocasiones } from '@/components/landing/Ocasiones';
import { Galeria } from '@/components/landing/Galeria';
import { Resenas } from '@/components/landing/Resenas';
import { Menu } from '@/components/landing/Menu';
import { Preguntas } from '@/components/landing/Preguntas';
import { Conversion } from '@/components/landing/Conversion';
import { Ubicacion } from '@/components/landing/Ubicacion';
import { Footer } from '@/components/landing/Footer';
import { StickyCTA } from '@/components/landing/StickyCTA';

/**
 * Orden de la página, pensado como recorrido de venta:
 *
 *   Hero          promesa + CTA + reductores de riesgo
 *   ComoFunciona  quita la fricción de "¿qué pasa si envío esto?"
 *   Receta        el gancho emocional: por qué querrías venir
 *   Beneficios    qué te llevas
 *   Ocasiones     te ubica en un caso de uso concreto
 *   Galeria       cómo se ve
 *   Resenas       prueba social
 *   Menu          qué se sirve
 *   Preguntas     objeciones finales
 *   Conversion    CTA fuerte una vez resueltas las dudas
 *   Ubicacion     el último dato práctico, ya decidido
 *
 * Los CTA se repiten en hero, ocasiones, bloque de conversión, header y la
 * barra fija de móvil: nadie debería tener que buscar dónde reservar.
 */
export default function Inicio() {
  return (
    <>
      <Header />
      <main id="contenido">
        <Hero />
        <ComoFunciona />
        <Receta />
        <Beneficios />
        <Ocasiones />
        <Galeria />
        <Resenas />
        <Menu />
        <Preguntas />
        <Conversion />
        <Ubicacion />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
