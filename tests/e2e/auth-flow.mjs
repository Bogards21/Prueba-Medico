/**
 * Verificación end-to-end del alta y el acceso (§12.1 del PRD).
 *
 * Requiere el servidor corriendo y una base de desarrollo vacía:
 *
 *   rm -rf .pgdata && npm run dev      # en otra terminal
 *   npm run test:e2e:auth
 */

import { chromium } from 'playwright';

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

const CORREO = `carlos${Date.now()}@ejemplo.mx`;
const CLAVE = 'el perro come croquetas';

// 1. Sin sesión, el dashboard no es accesible.
await page.goto(BASE, { waitUntil: 'networkidle' });
check('sin sesión redirige a iniciar sesión', page.url().includes('/entrar'));

// 2. La política de contraseñas se aplica (RF-01).
await page.goto(`${BASE}/registro`, { waitUntil: 'networkidle' });
await page.fill('#email', CORREO);
await page.fill('#password', 'corta1');
await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
await page.waitForSelector('text=/al menos 10 caracteres/', { timeout: 15000 });
check('rechaza una contraseña demasiado corta', true);

// La contraseña no puede contener el correo.
await page.fill('#password', `${CORREO}xx`);
await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
await page.waitForSelector('text=/no debe contener tu correo/', { timeout: 15000 });
check('rechaza una contraseña que contiene el correo', true);

// 3. Alta correcta: cuenta pendiente de verificación (CA-01).
await page.fill('#password', CLAVE);
await captura('05-registro');
await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
await page.waitForSelector('text=Creamos tu cuenta', { timeout: 20000 });
check('CA-01: crea la cuenta y anuncia la confirmación', true);

await page.getByRole('link', { name: 'Confirmar mi correo' }).click();
await page.waitForSelector('text=Confirma tu correo', { timeout: 15000 });
await page.getByRole('button', { name: 'Confirmar mi correo' }).click();
await page.waitForSelector('text=Tu correo quedó confirmado', { timeout: 15000 });
check('CA-01: el enlace de confirmación verifica la cuenta', true);

// 4. Consentimientos (CA-02, RF-02).
await page.goto(`${BASE}/onboarding/consentimientos`, { waitUntil: 'networkidle' });
const casillas = page.locator('input[type="checkbox"]');
const total = await casillas.count();
let marcadas = 0;
for (let i = 0; i < total; i++) if (await casillas.nth(i).isChecked()) marcadas++;
check('RF-02: ningún consentimiento viene preseleccionado', marcadas === 0);
check('muestra la versión de cada documento', (await page.getByText(/Versión \d{4}-/).count()) > 0);
await captura('06-consentimientos');

// Sin los obligatorios no se puede continuar.
await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
await page.waitForSelector('text=/necesitas aceptar/', { timeout: 15000 });
check('RF-02: los obligatorios no se pueden omitir', true);

// Sin ningún consentimiento tampoco se llega al dashboard.
await page.goto(BASE, { waitUntil: 'networkidle' });
check(
  'CA-02: sin consentimientos no se accede al dashboard',
  page.url().includes('/onboarding/consentimientos'),
);

// Aceptar solo los obligatorios.
for (const nombre of ['Términos de uso', 'Aviso de privacidad', 'Tratamiento de tus datos de salud']) {
  await page.getByText(nombre, { exact: false }).first().click();
}
await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
await page.waitForURL((u) => !u.pathname.includes('onboarding'), { timeout: 20000 });
check('CA-02: con los obligatorios aceptados entra al dashboard', new URL(page.url()).pathname === '/');

// 5. La sesión se puede cerrar y reabrir.
await page.getByRole('button', { name: 'Salir' }).click();
await page.waitForURL(/\/entrar/, { timeout: 15000 });
check('cerrar sesión devuelve a la pantalla de acceso', true);

await page.goto(BASE, { waitUntil: 'networkidle' });
check('tras salir, el dashboard vuelve a estar protegido', page.url().includes('/entrar'));

// 6. Mensaje genérico ante credenciales incorrectas (§17.2).
await page.fill('#email', CORREO);
await page.fill('#password', 'una clave que no es');
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForSelector('text=/Correo o contraseña incorrectos/', { timeout: 15000 });
check('no revela si el correo existe', true);

// 7. Acceso correcto.
await page.fill('#password', CLAVE);
await page.getByRole('button', { name: 'Entrar' }).click();
await page.waitForURL((u) => new URL(u).pathname === '/', { timeout: 20000 });
check('inicia sesión con las credenciales correctas', true);

// 8. Los datos son del usuario de la sesión, no de una cuenta compartida.
await page.goto(`${BASE}/registrar/glucosa`, { waitUntil: 'networkidle' });
await page.fill('#valor', '105');
await page.getByRole('button', { name: 'Guardar registro' }).click();
await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 20000 });
await page.goto(BASE, { waitUntil: 'networkidle' });
check('el registro aparece en el dashboard del usuario', (await page.textContent('body')).includes('105'));
await captura('07-dashboard-autenticado');

await browser.close();
console.log(fallos.length === 0 ? '\nTODO VERDE' : `\nFALLOS: ${fallos.join(', ')}`);
process.exit(fallos.length === 0 ? 0 : 1);
