/**
 * Verificación end-to-end de perfil, peso y presión arterial
 * (RF-03, RF-05, RF-06).
 *
 * Crea su propia cuenta.
 *
 *   npm run dev      # en otra terminal
 *   npm run test:e2e:mediciones
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

await signUp(page, BASE);

// 1. El perfil se guarda y se puede editar (RF-03).
await page.goto(`${BASE}/perfil`, { waitUntil: 'networkidle' });
check('el perfil conserva lo capturado en el onboarding',
  (await page.inputValue('#firstName')) === 'Carlos');

await page.fill('#heightCm', '172');
await page.getByRole('button', { name: 'Guardar cambios' }).click();
await page.waitForSelector('text=Guardamos tus cambios', { timeout: 20000 });
check('RF-03: el usuario puede actualizar su información', true);

// Un año de diagnóstico anterior al nacimiento es incoherente.
await page.fill('#diagnosisYear', '1950');
await page.getByRole('button', { name: 'Guardar cambios' }).click();
await page.waitForSelector('text=/anterior a tu nacimiento/', { timeout: 20000 });
check('rechaza un diagnóstico anterior al nacimiento', true);

await page.fill('#diagnosisYear', '2014');
await page.getByRole('button', { name: 'Guardar cambios' }).click();
await page.waitForSelector('text=Guardamos tus cambios', { timeout: 20000 });

// 2. El hub de registro ofrece las tres variables.
await page.goto(`${BASE}/registrar`, { waitUntil: 'networkidle' });
const hub = await page.textContent('body');
check('el hub ofrece glucosa, peso y presión',
  hub.includes('Glucosa') && hub.includes('Peso') && hub.includes('Presión arterial'));
await captura('08-registrar-hub');

// 3. Peso (RF-05).
await page.goto(`${BASE}/registrar/peso`, { waitUntil: 'networkidle' });
await page.fill('#valor', '900');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=/fuera del rango que una báscula/', { timeout: 20000 });
check('rechaza un peso imposible', true);

await page.fill('#valor', '84.5');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 20000 });
check('guarda un peso válido', true);

await page.fill('#valor', '82');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 20000 });

// 4. Presión arterial (RF-06).
await page.goto(`${BASE}/registrar/presion`, { waitUntil: 'networkidle' });
await page.fill('#systolic', '80');
await page.fill('#diastolic', '120');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=/debe ser mayor que la baja/', { timeout: 20000 });
check('exige que la sistólica sea mayor que la diastólica', true);

await page.fill('#systolic', '195');
await page.fill('#diastolic', '118');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('[role="alertdialog"]', { timeout: 20000 });
check('RF-06: cifras atípicas piden confirmación',
  await page.getByText('Confirma el valor').isVisible());
await captura('09-presion-confirmacion');

await page.getByRole('button', { name: 'Voy a corregirlo' }).click();
await page.fill('#systolic', '124');
await page.fill('#diastolic', '79');
await page.fill('#pulse', '68');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 20000 });
check('guarda una presión normal sin pedir confirmación', true);

// 5. El dashboard refleja las tres variables.
await page.goto(BASE, { waitUntil: 'networkidle' });
const cuerpo = await page.textContent('body');
check('el dashboard muestra el último peso', cuerpo.includes('82'));
// RF-05: cambio respecto a la medición anterior (82 - 84.5 = -2.5).
check('el dashboard muestra el cambio de peso', cuerpo.includes('-2.5'));
check('el dashboard muestra la última presión', cuerpo.includes('124/79'));
await captura('10-dashboard-completo');

await browser.close();
console.log(fallos.length === 0 ? '\nTODO VERDE' : `\nFALLOS: ${fallos.join(', ')}`);
process.exit(fallos.length === 0 ? 0 : 1);
