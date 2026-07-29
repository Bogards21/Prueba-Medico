/**
 * Verificación end-to-end del gobierno de las reglas clínicas
 * (RF-13, §15, §22, RB-02, CA-05).
 *
 * Es la prueba que cierra el círculo: recorre desde la creación de una regla
 * hasta que el paciente ve —o deja de ver— su mensaje al registrar una
 * medición. El motor se construyó al principio del proyecto y hasta ahora
 * nunca había tenido una regla aprobada con la que trabajar.
 *
 *   npm run dev      # en otra terminal
 *   npm run test:e2e:reglas
 */

import { execFileSync } from 'node:child_process';
import { chromium } from 'playwright';
import { signUp } from './helpers/signup.mjs';

const BASE = process.env.BASE_URL ?? 'http://localhost:3000';
const OUT = process.env.SCREENSHOT_DIR ?? null;

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

const fallos = [];
const check = (nombre, cond) => {
  console.log(`${cond ? 'PASA' : 'FALLA'}  ${nombre}`);
  if (!cond) fallos.push(nombre);
};

const asignarRol = (correo, rol) =>
  execFileSync('node', ['scripts/set-role.mjs', correo, rol], { encoding: 'utf8' });

/**
 * La base es compartida entre corridas, así que todo se acota a la tarjeta de
 * la regla creada por ESTA corrida. El listado va por fecha de creación
 * descendente, de modo que es la primera.
 */
const tarjeta = (page) => page.locator('main ul > li').first();

/** Registra una glucosa y devuelve el texto del panel de resultado. */
async function registrarGlucosa(page, valor) {
  await page.goto(`${BASE}/registrar/glucosa`, { waitUntil: 'networkidle' });
  await page.fill('#valor', String(valor));
  await page.getByRole('button', { name: 'Guardar registro' }).click();
  await page.waitForSelector('text=Listo, guardamos tu registro', { timeout: 20000 });
  // `form` a secas casaría con el formulario de "Salir" de la cabecera.
  return page.textContent('main');
}

/* ── Responsable clínico ── */
const ctxClinico = await browser.newContext({ viewport: { width: 900, height: 1200 } });
const clinico = await ctxClinico.newPage();
const { correo: correoClinico } = await signUp(clinico, BASE);
asignarRol(correoClinico, 'clinical_reviewer');

/* ── Administrador general ── */
const ctxAdmin = await browser.newContext({ viewport: { width: 900, height: 1200 } });
const admin = await ctxAdmin.newPage();
const { correo: correoAdmin } = await signUp(admin, BASE);
asignarRol(correoAdmin, 'admin');

/* ── Paciente ── */
const ctxPaciente = await browser.newContext({ viewport: { width: 900, height: 1200 } });
const paciente = await ctxPaciente.newPage();
await signUp(paciente, BASE);

// 1. RB-06 — ni el administrador general entra a las reglas clínicas.
await admin.goto(`${BASE}/admin/reglas`, { waitUntil: 'networkidle' });
check('RB-06: el administrador general NO gestiona reglas clínicas',
  new URL(admin.url()).pathname === '/');

await paciente.goto(`${BASE}/admin/reglas`, { waitUntil: 'networkidle' });
check('§15: un paciente tampoco accede', new URL(paciente.url()).pathname === '/');

// 2. Sin reglas, registrar una glucosa alta no muestra ningún mensaje clínico.
const sinReglas = await registrarGlucosa(paciente, 350);
check('sin reglas activas no se muestra ningún mensaje clínico',
  !sinReglas.includes('Acción sugerida') && !sinReglas.includes('Advertencia'));

// 3. §22.9 — el mensaje no puede indicar cambios de medicación.
await clinico.goto(`${BASE}/admin/reglas/nueva`, { waitUntil: 'networkidle' });
await clinico.fill('#name', 'Glucosa muy alta');
await clinico.fill('#threshold', '300');
await clinico.fill('#messageEs', 'Sube la dosis de tu medicamento hasta que baje.');
await clinico.getByRole('button', { name: 'Crear borrador' }).click();
await clinico.waitForSelector('text=/no puede indicar ni modificar tratamientos/i', { timeout: 20000 });
check('§22.9: rechaza un mensaje que indica cambiar la dosis', true);

// 4. Borrador válido.
await clinico.selectOption('#severity', 'seek_care');
await clinico.fill(
  '#messageEs',
  'Este valor es más alto de lo esperado. Comunícate con tu profesional de salud para revisarlo.',
);
await clinico.fill('#protocolReference', 'Protocolo interno 2026, sección 4');
await clinico.getByRole('button', { name: 'Crear borrador' }).click();
await clinico.waitForURL(/\/admin\/reglas$/, { timeout: 20000 });

const trasCrear = await tarjeta(clinico).textContent();
check('la regla nace en borrador', trasCrear.includes('Borrador'));
check('RB-02: nace sin aprobación registrada',
  trasCrear.includes('Sin aprobación registrada'));
if (OUT) await clinico.screenshot({ path: `${OUT}/18-reglas.png`, fullPage: true });

// 5. §22.15 — no se puede activar sin aprobar.
await tarjeta(clinico).getByRole('button', { name: 'Activar' }).click();
await clinico.waitForSelector('text=/Apruébala antes de activarla/i', { timeout: 20000 });
check('§22.15: no se puede activar una regla sin aprobación', true);

// La regla sigue sin evaluarse.
const aunBorrador = await registrarGlucosa(paciente, 350);
check('una regla en borrador no dispara nada',
  !aunBorrador.includes('Acción sugerida'));

// 6. Aprobar y activar.
await clinico.goto(`${BASE}/admin/reglas`, { waitUntil: 'networkidle' });
await tarjeta(clinico).getByRole('button', { name: 'Aprobar' }).click();
await tarjeta(clinico).getByText(/Aprobada el/).waitFor({ timeout: 20000 });
check('RF-13: queda registrada la aprobación con su fecha', true);

// Aprobada pero no activa: sigue sin evaluarse.
const aprobadaSinActivar = await registrarGlucosa(paciente, 350);
check('aprobada pero no activa: todavía no dispara',
  !aprobadaSinActivar.includes('Acción sugerida'));

await clinico.goto(`${BASE}/admin/reglas`, { waitUntil: 'networkidle' });
await tarjeta(clinico).getByRole('button', { name: 'Activar' }).click();
await tarjeta(clinico).getByText('Activa: se está evaluando').waitFor({ timeout: 20000 });
check('la regla aprobada se puede activar', true);

// 7. CA-05 — la regla activa dispara con el mensaje aprobado y su nivel.
const conRegla = await registrarGlucosa(paciente, 350);
check('CA-05: la regla activa dispara al registrar la medición',
  conRegla.includes('Comunícate con tu profesional de salud'));
// RB-10 — el mensaje declara su nivel.
check('RB-10: el mensaje se muestra con su nivel', conRegla.includes('Acción sugerida'));
if (OUT) await paciente.screenshot({ path: `${OUT}/19-alerta-paciente.png`, fullPage: true });

// CA-05 y §22.6 — el evento queda registrado, con la versión de la regla y
// una copia literal del mensaje mostrado.
{
  const { execFileSync } = await import('node:child_process');
  const salida = execFileSync(
    'psql',
    ['-h', '127.0.0.1', '-p', '5432', '-U', 'postgres', '-d', 'prueba_medico', '-tAc',
     "select count(*) from alert_events where message_shown like '%Comunícate con tu profesional%'"],
    { encoding: 'utf8', env: { ...process.env, PGPASSWORD: 'postgres' } },
  ).trim();
  check('CA-05: el evento de alerta queda registrado', Number(salida) >= 1);
}

// Un valor por debajo del umbral no dispara.
const bajoUmbral = await registrarGlucosa(paciente, 110);
check('un valor por debajo del umbral no dispara',
  !bajoUmbral.includes('Comunícate con tu profesional de salud'));

// 8. §22.5 — desactivar detiene la evaluación.
await clinico.goto(`${BASE}/admin/reglas`, { waitUntil: 'networkidle' });
await tarjeta(clinico).getByRole('button', { name: 'Desactivar' }).click();
await tarjeta(clinico).getByText('Desactivada').waitFor({ timeout: 20000 });

const desactivada = await registrarGlucosa(paciente, 350);
check('§22.5: al desactivarla deja de dispararse',
  !desactivada.includes('Comunícate con tu profesional de salud'));

// 9. Editar una regla aprobada revoca la aprobación.
await clinico.goto(`${BASE}/admin/reglas`, { waitUntil: 'networkidle' });
await tarjeta(clinico).getByRole('button', { name: 'Activar' }).click();
await tarjeta(clinico).getByText('Activa: se está evaluando').waitFor({ timeout: 20000 });

await tarjeta(clinico).getByRole('link', { name: 'Editar' }).click();
await clinico.waitForSelector('#threshold', { timeout: 20000 });
check('avisa de que se perderá la aprobación antes de guardar',
  (await clinico.textContent('body')).includes('volverá a borrador'));

await clinico.fill('#threshold', '150');
await clinico.getByRole('button', { name: 'Guardar cambios' }).click();
await clinico.waitForURL(/\/admin\/reglas$/, { timeout: 20000 });

const trasEditar = await tarjeta(clinico).textContent();
check('editar devuelve la regla a borrador', trasEditar.includes('Borrador'));
check('editar revoca la aprobación', trasEditar.includes('Sin aprobación registrada'));
check('RF-13: la versión se incrementa', trasEditar.includes('versión 2'));

// Y deja de evaluarse, aunque el nuevo umbral sería más fácil de superar.
const trasEdicion = await registrarGlucosa(paciente, 350);
check('RB-02: el umbral editado no se evalúa hasta una nueva aprobación',
  !trasEdicion.includes('Comunícate con tu profesional de salud'));

await browser.close();
console.log(fallos.length === 0 ? '\nTODO VERDE' : `\nFALLOS: ${fallos.join(', ')}`);
process.exit(fallos.length === 0 ? 0 : 1);
