/**
 * Verificación end-to-end de medicamentos y recordatorios
 * (RF-08, RF-09, CA-06).
 *
 * Crea su propia cuenta.
 *
 *   npm run dev      # en otra terminal
 *   npm run test:e2e:medicamentos
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

// 1. Estado vacío.
await page.goto(`${BASE}/medicamentos`, { waitUntil: 'networkidle' });
check('estado vacío educativo',
  (await page.textContent('body')).includes('Aún no has añadido ningún medicamento'));
// RB-09 — sin tomas marcadas no se reporta 0 % de adherencia.
check('RB-09: sin tomas no reporta 0 % de adherencia',
  (await page.textContent('body')).includes('Todavía no hay tomas marcadas'));

// 2. Validación del alta.
await page.goto(`${BASE}/medicamentos/nuevo`, { waitUntil: 'networkidle' });
await page.getByRole('button', { name: 'Guardar medicamento' }).click();
await page.waitForSelector('text=/Escribe el nombre del medicamento/', { timeout: 20000 });
check('exige el nombre del medicamento', true);

// La plataforma deja claro que no indica dosis (§RF-08 Restricciones).
check('advierte que no indica ni modifica dosis',
  (await page.textContent('body')).includes('no indica ni modifica dosis'));

// 3. Alta con dos horarios diarios.
await page.fill('#name', 'Metformina');
await page.fill('#presentation', 'Tabletas de 850 mg');
await page.fill('#doseText', '1 tableta');
await page.fill('input[aria-label="Horario 1"]', '08:00');
await page.getByRole('button', { name: 'Añadir otro horario' }).click();
await page.fill('input[aria-label="Horario 2"]', '20:00');
await captura('11-medicamento-nuevo');
await page.getByRole('button', { name: 'Guardar medicamento' }).click();
await page.waitForURL(/\/medicamentos$/, { timeout: 20000 });
check('guarda el medicamento y vuelve al listado', true);

const listado = await page.textContent('body');
check('el listado muestra el medicamento', listado.includes('Metformina'));
check('el listado muestra los dos horarios',
  listado.includes('08:00') && listado.includes('20:00'));
check('el listado muestra la periodicidad', listado.includes('Todos los días'));

// 4. Tomas de hoy (CA-06). Dos horarios diarios → dos tomas.
const tomasHoy = await page.locator('section[aria-labelledby="hoy-titulo"] li').count();
check('CA-06: genera las tomas del día según los horarios', tomasHoy === 2);

// RF-09 — sin marcar, la toma está pendiente.
check('RF-09: la toma nace pendiente, no cumplida',
  (await page.getByRole('button', { name: 'Ya la tomé' }).count()) === 2);
await captura('12-medicamentos-hoy');

// 5. Marcar una toma.
await page.getByRole('button', { name: 'Ya la tomé' }).first().click();
await page.waitForSelector('text=Tomada', { timeout: 20000 });
check('marca una toma como cumplida', true);

await page.getByRole('button', { name: 'No la tomé' }).first().click();
await page.waitForSelector('text=Omitida', { timeout: 20000 });
check('marca una toma como omitida', true);

// Adherencia: 1 de 2 = 50 %.
await page.reload({ waitUntil: 'networkidle' });
check('RF-08: calcula la adherencia autorreportada',
  (await page.textContent('body')).includes('50%'));

// 6. Pausar no borra el medicamento (RF-08, §13.4).
await page.getByRole('button', { name: 'Pausar recordatorios' }).click();
await page.waitForSelector('text=Recordatorios pausados', { timeout: 20000 });
const pausado = await page.textContent('body');
check('RF-08: pausar conserva el medicamento', pausado.includes('Metformina'));
check('§13.4: pausado deja de generar tomas',
  (await page.locator('section[aria-labelledby="hoy-titulo"] li').count()) === 0);

await page.getByRole('button', { name: 'Reanudar recordatorios' }).click();
await page.waitForSelector('text=Recordatorios pausados', { state: 'detached', timeout: 20000 });
check('reanudar vuelve a generar las tomas',
  (await page.locator('section[aria-labelledby="hoy-titulo"] li').count()) === 2);

// Las marcas anteriores sobreviven a la pausa: RB-05, no se borra historial.
check('las tomas ya marcadas conservan su estado tras pausar y reanudar',
  (await page.getByText('Tomada').count()) === 1 &&
    (await page.getByText('Omitida').count()) === 1);

// 7. El dashboard avisa de las tomas pendientes (RF-10).
// Se deshace una marca para que vuelva a estar pendiente.
await page.getByRole('button', { name: 'Deshacer' }).first().click();
await page.waitForSelector('text=Ya la tomé', { timeout: 20000 });

await page.goto(BASE, { waitUntil: 'networkidle' });
check('el dashboard muestra las tomas pendientes de hoy',
  (await page.textContent('body')).includes('Te faltan tomas hoy'));
await captura('13-dashboard-con-tomas');

await browser.close();
console.log(fallos.length === 0 ? '\nTODO VERDE' : `\nFALLOS: ${fallos.join(', ')}`);
process.exit(fallos.length === 0 ? 0 : 1);
