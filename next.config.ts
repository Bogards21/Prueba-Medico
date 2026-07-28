import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * pdfkit lee sus métricas de fuente (`.afm`) desde su propio directorio en
   * node_modules. Empaquetarlo reescribe esas rutas y falla con ENOENT sobre
   * `/ROOT/node_modules/pdfkit/js/data/Helvetica.afm`.
   */
  serverExternalPackages: ['@node-rs/argon2', 'pdfkit'],
};

export default nextConfig;
