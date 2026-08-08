import { Header } from '@/components/landing/Header';
import { Hero } from '@/components/landing/Hero';
import { Receta } from '@/components/landing/Receta';
import { Beneficios } from '@/components/landing/Beneficios';
import { Galeria } from '@/components/landing/Galeria';
import { Menu } from '@/components/landing/Menu';
import { Conversion } from '@/components/landing/Conversion';
import { Ubicacion } from '@/components/landing/Ubicacion';
import { Footer } from '@/components/landing/Footer';
import { StickyCTA } from '@/components/landing/StickyCTA';

export default function Inicio() {
  return (
    <>
      <Header />
      <main id="contenido">
        <Hero />
        <Receta />
        <Beneficios />
        <Galeria />
        <Menu />
        <Conversion />
        <Ubicacion />
      </main>
      <Footer />
      <StickyCTA />
    </>
  );
}
