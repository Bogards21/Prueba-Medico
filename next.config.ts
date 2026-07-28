import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  /**
   * PGlite carga su binario WASM resolviendo una `new URL(...)` y pasándosela
   * a `fs`. Si el bundler lo empaqueta, esa resolución se rompe
   * ("The path argument must be of type string... Received an instance of URL").
   * Dejándolo como externo, Node lo carga desde node_modules y funciona.
   *
   * Solo afecta al desarrollo local: en producción se usa `DATABASE_URL`
   * con postgres-js y PGlite ni siquiera se importa.
   */
  serverExternalPackages: ['@electric-sql/pglite'],
};

export default nextConfig;
