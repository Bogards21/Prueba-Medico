/**
 * Verificación end-to-end del reporte para la consulta (RF-15, CA-07).
 *
 * Crea su propia cuenta y captura datos antes de generar el reporte.
 *
 *   npm run dev      # en otra terminal
 *   npm run test:e2e:reportes
 */

import { chromium } from 'playwright';
import { signUp } from './helpers/signup.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = process.env.SCREENSHOT_DIR ?? null;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 900, height: 1200 } });

const fallos = [];
const check = (nombre, cond) => {
  console.log(`${cond ? 'PASA' : 'FALLA'}  ${nombre}`);
  if (!cond) fallos.push(nombre);
};
const captura = (n) => (OUT ? page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }) : null);

await signUp(page, BASE);

// Datos de partida: dos glucosas y un peso.
for (const valor of ['112', '140']) {
  await page.goto(`${BASE}/registrar/glucosa`, { waitUntil: 'networkidle' });
  await page.fill('#valor', valor);
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 20000 });
}
await page.goto(`${BASE}/registrar/peso`, { waitUntil: 'networkidle' });
await page.fill('#valor', '84.5');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 20000 });

// 1. La pantalla ofrece las secciones del catálogo.
await page.goto(`${BASE}/reportes`, { waitUntil: 'networkidle' });
const cuerpo = await page.textContent('body');
check(
  'ofrece las secciones del PRD',
  ['Glucosa', 'Peso', 'Presión arterial', 'Medicamentos', 'Seguimiento de tomas'].every((t) =>
    cuerpo.includes(t),
  ),
);
check('explica que solo se incluye lo marcado',
  cuerpo.includes('Solo se incluirá lo que marques'));
await captura('14-reportes');

// 2. RB-03 — sin secciones no hay reporte.
const casillas = page.locator('input[type="checkbox"]');
const total = await casillas.count();
for (let i = 0; i < total; i++) {
  if (await casillas.nth(i).isChecked()) await casillas.nth(i).uncheck();
}
await page.getByRole('button', { name: 'Ver vista previa' }).click();
await page.waitForSelector('text=/al menos una sección/i', { timeout: 20000 });
check('RB-03: exige elegir al menos una sección', true);

// 3. Periodo inválido.
await casillas.nth(0).check(); // Glucosa
await page.fill('#periodEnd', '2027-12-31');
await page.getByRole('button', { name: 'Ver vista previa' }).click();
await page.waitForSelector('text=/no puede terminar en el futuro/i', { timeout: 20000 });
check('rechaza un periodo que termina en el futuro', true);

// 4. Vista previa correcta (RF-15).
const hoy = new Date().toISOString().slice(0, 10);
await page.fill('#periodEnd', hoy);
await page.getByRole('button', { name: 'Ver vista previa' }).click();
// Se espera la SECCIÓN, no el texto: "Vista previa" también aparece en el
// botón "Ver vista previa" y la espera pasaría de largo.
await page.waitForSelector('section[aria-labelledby="vista-titulo"]', { timeout: 30000 });

const previa = await page.textContent('section[aria-labelledby="vista-titulo"]');
check('RF-15: la vista previa incluye la aclaración de alcance',
  previa.includes('no sustituye') || previa.includes('No es un diagnóstico'));
check('la vista previa resume la glucosa capturada', previa.includes('126'));
check('RF-15: avisa de que no se comparte automáticamente',
  (await page.textContent('body')).includes('esta plataforma no lo envía a nadie'));

// RB-03 — lo no marcado no aparece.
check('lo que no se marcó no aparece en la vista previa', !previa.includes('84.5'));
await captura('15-reporte-vista-previa');

// 5. Generar y descargar el PDF (CA-07).
const descarga = page.waitForEvent('download', { timeout: 30000 });
await page.getByRole('button', { name: 'Generar y descargar PDF' }).click();
const archivo = await descarga;

const ruta = await archivo.path();
const { readFileSync } = await import('node:fs');
const bytes = readFileSync(ruta);

check('CA-07: descarga un PDF', bytes.subarray(0, 5).toString() === '%PDF-');
check('el PDF no está vacío', bytes.length > 1000);
check('el nombre del archivo es descriptivo',
  archivo.suggestedFilename().startsWith('resumen-seguimiento'));

// 6. RF-15 — "registro de generación": el reporte queda listado.
await page.goto(`${BASE}/reportes`, { waitUntil: 'networkidle' });
const listado = await page.textContent('body');
check('RF-15: registra la generación del reporte',
  listado.includes('Reportes que ya generaste'));
check('el reporte listado se puede volver a descargar',
  (await page.getByRole('link', { name: 'Descargar PDF' }).count()) >= 1);

await browser.close();
console.log(fallos.length === 0 ? '\nTODO VERDE' : `\nFALLOS: ${fallos.join(', ')}`);
process.exit(fallos.length === 0 ? 0 : 1);
