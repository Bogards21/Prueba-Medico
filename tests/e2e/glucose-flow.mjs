/**
 * Verificación end-to-end del flujo de registro de glucosa (§12.2 del PRD).
 *
 * Crea su propia cuenta, así que no necesita una base vacía.
 *
 *   npm run dev      # en otra terminal
 *   npm run test:e2e
 *
 * Si Chromium no está en la ruta por defecto de Playwright, indícala con
 * CHROMIUM_PATH.
 */

import { chromium } from 'playwright';
import { signUp } from './helpers/signup.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = process.env.SCREENSHOT_DIR ?? null;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
const page = await browser.newPage({ viewport: { width: 900, height: 1100 } });

const fallos = [];
const check = (nombre, cond) => {
  console.log(`${cond ? 'PASA' : 'FALLA'}  ${nombre}`);
  if (!cond) fallos.push(nombre);
};
const captura = (n) => (OUT ? page.screenshot({ path: `${OUT}/${n}.png`, fullPage: true }) : null);

// Cuenta nueva por corrida: el estado vacío queda garantizado sin depender
// de que la base de desarrollo esté limpia.
await signUp(page, BASE);

// 1. Estado vacío (§18.2 "estados vacíos educativos", RB-09).
await page.goto(BASE, { waitUntil: 'networkidle' });
check(
  'dashboard muestra estado vacío educativo',
  await page.getByText('Aún no has registrado ninguna medición').isVisible(),
);
check('RB-09: sin datos NO muestra 0', (await page.getByText('Sin datos').count()) === 3);
await captura('01-dashboard-vacio');

// 2. Registro normal (CA-03).
await page.goto(`${BASE}/registrar/glucosa`, { waitUntil: 'networkidle' });
await page.fill('#valor', '112');
await page.getByRole('radio', { name: 'En ayuno' }).check();
await captura('02-formulario');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 15000 });
check('guarda un valor normal sin pedir confirmación', true);

// 3. CA-04: un valor inusual exige confirmación explícita.
await page.fill('#valor', '480');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('[role="alertdialog"]', { timeout: 15000 });
check('CA-04: valor inusual exige confirmación', await page.getByText('Confirma el valor').isVisible());
await captura('03-confirmacion-ca04');

await page.getByRole('button', { name: 'Sí, el valor es correcto' }).click();
await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 15000 });
check('CA-04: tras confirmar, guarda', true);

// 4. Un valor imposible sí se rechaza (RF-04).
await page.fill('#valor', '3000');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=/fuera del rango que un medidor/', { timeout: 15000 });
check(
  'rechaza un valor imposible',
  await page.getByText(/fuera del rango que un medidor/).isVisible(),
);

// 5. Dashboard con datos.
await page.fill('#valor', '98');
await page.getByRole('radio', { name: 'Después de comer' }).check();
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 15000 });

await page.goto(BASE, { waitUntil: 'networkidle' });
const cuerpo = await page.textContent('body');
check('el dashboard lista los registros guardados', cuerpo.includes('112'));
check('RB-11: muestra el origen del dato', cuerpo.includes('Registro manual'));
check('ya no muestra "Sin datos"', !cuerpo.includes('Sin datos'));
check('RB-01: el límite clínico está visible', cuerpo.includes('No sustituye una consulta'));
await captura('04-dashboard-con-datos');

await browser.close();
console.log(fallos.length === 0 ? '\nTODO VERDE' : `\nFALLOS: ${fallos.join(', ')}`);
process.exit(fallos.length === 0 ? 0 : 1);
