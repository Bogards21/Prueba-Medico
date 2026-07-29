/**
 * Verificación end-to-end del contenido educativo y su flujo editorial
 * (RF-12, CA-09, RB-07, §15).
 *
 * Usa DOS cuentas —un editor y un responsable clínico— porque la separación
 * de permisos es justo lo que hay que demostrar: el editor no puede aprobar
 * su propio contenido.
 *
 *   npm run dev      # en otra terminal
 *   npm run test:e2e:contenido
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

/* ── Cuenta 1: editor ── */
const ctxEditor = await browser.newContext({ viewport: { width: 900, height: 1200 } });
const editor = await ctxEditor.newPage();
const { correo: correoEditor } = await signUp(editor, BASE);
asignarRol(correoEditor, 'editor');

/* ── Cuenta 2: responsable clínico ── */
const ctxClinico = await browser.newContext({ viewport: { width: 900, height: 1200 } });
const clinico = await ctxClinico.newPage();
const { correo: correoClinico } = await signUp(clinico, BASE);
asignarRol(correoClinico, 'clinical_reviewer');

/* ── Cuenta 3: paciente ── */
const ctxPaciente = await browser.newContext({ viewport: { width: 900, height: 1200 } });
const paciente = await ctxPaciente.newPage();
await signUp(paciente, BASE);

// 1. El paciente no entra al panel (§15, mínimo privilegio).
await paciente.goto(`${BASE}/admin/contenido`, { waitUntil: 'networkidle' });
check('§15: un paciente no accede al panel de contenido',
  new URL(paciente.url()).pathname === '/');

// 2. El paciente no ve nada publicado todavía.
await paciente.goto(`${BASE}/aprender`, { waitUntil: 'networkidle' });
check('estado vacío educativo en Aprender',
  (await paciente.textContent('body')).includes('Todavía no hay material publicado'));

// 3. El editor crea un borrador.
await editor.goto(`${BASE}/admin/contenido/nuevo`, { waitUntil: 'networkidle' });
await editor.fill('#title', 'Qué significa tu glucosa en ayuno');
await editor.fill('#summary', 'Una explicación breve y en lenguaje sencillo.');
await editor.fill('#author', 'Guía de práctica clínica, edición 2026');
await editor.fill('#body', 'La glucosa en ayuno se mide antes de comer.\n\nHabla con tu profesional de salud sobre tus cifras.');
await editor.getByRole('button', { name: 'Crear borrador' }).click();
await editor.waitForURL(/\/admin\/contenido$/, { timeout: 20000 });
check('el editor crea un borrador', (await editor.textContent('body')).includes('Borrador'));

// RF-12 — el contenido nace sin aprobación clínica.
check('el borrador nace sin aprobación clínica',
  (await editor.textContent('body')).includes('Sin aprobación clínica registrada'));

// 4. RB-07 — el editor no puede aprobar ni publicar.
const botonesEditor = await editor.locator('button').allTextContents();
check('RB-07: el editor no ve la acción de aprobar', !botonesEditor.includes('Aprobar'));
check('el editor no puede publicar un borrador', !botonesEditor.includes('Publicar'));

await editor.getByRole('button', { name: 'Enviar a revisión' }).click();
await editor.waitForSelector('text=En revisión clínica', { timeout: 20000 });
check('el editor envía a revisión', true);

// Ni siquiera en revisión aparece "Aprobar" para el editor.
check('RB-07: en revisión, el editor sigue sin poder aprobar',
  !(await editor.locator('button').allTextContents()).includes('Aprobar'));

// 5. El responsable clínico aprueba.
await clinico.goto(`${BASE}/admin/contenido`, { waitUntil: 'networkidle' });
if (OUT) await clinico.screenshot({ path: `${OUT}/16-admin-contenido.png`, fullPage: true });
await clinico.getByRole('button', { name: 'Aprobar' }).click();
await clinico.waitForSelector('text=Aprobado, sin publicar', { timeout: 20000 });
check('§15: el responsable clínico aprueba', true);
check('RF-12: queda registrada la fecha de revisión clínica',
  (await clinico.textContent('body')).includes('Revisión clínica del'));

// Aprobado pero sin publicar: el paciente todavía no lo ve.
await paciente.goto(`${BASE}/aprender`, { waitUntil: 'networkidle' });
check('aprobado no es publicado: el paciente aún no lo ve',
  (await paciente.textContent('body')).includes('Todavía no hay material publicado'));

// 6. Publicar.
await clinico.getByRole('button', { name: 'Publicar' }).click();
await clinico.waitForSelector('text=Publicado', { timeout: 20000 });
check('se publica el contenido aprobado', true);

await paciente.goto(`${BASE}/aprender`, { waitUntil: 'networkidle' });
check('el paciente ya ve el contenido publicado',
  (await paciente.textContent('body')).includes('Qué significa tu glucosa en ayuno'));

await paciente.getByRole('link', { name: /Qué significa tu glucosa/ }).click();
await paciente.waitForSelector('text=Autor o fuente', { timeout: 20000 });
const articulo = await paciente.textContent('body');
check('RF-12: el artículo muestra autor o fuente',
  articulo.includes('Guía de práctica clínica'));
check('RF-12: el artículo muestra la fecha de revisión', articulo.includes('Revisado por un profesional'));
check('RF-12: el artículo muestra la versión', articulo.includes('Versión'));
if (OUT) await paciente.screenshot({ path: `${OUT}/17-aprender-articulo.png`, fullPage: true });

// 7. CA-09 — editar lo publicado lo devuelve a revisión y lo oculta.
await editor.goto(`${BASE}/admin/contenido`, { waitUntil: 'networkidle' });
await editor.getByRole('link', { name: 'Editar' }).first().click();
await editor.waitForSelector('#title', { timeout: 20000 });
check('CA-09: avisa de que se perderá la aprobación antes de guardar',
  (await editor.textContent('body')).includes('volverá a revisión'));

await editor.fill('#body', 'Texto reescrito por completo después de la aprobación.');
await editor.getByRole('button', { name: 'Guardar cambios' }).click();
await editor.waitForURL(/\/admin\/contenido$/, { timeout: 20000 });

const trasEditar = await editor.textContent('body');
check('CA-09: editar lo publicado lo devuelve a revisión',
  trasEditar.includes('En revisión clínica'));
check('CA-09: se invalida la aprobación anterior',
  trasEditar.includes('Sin aprobación clínica registrada'));
check('RF-12: la versión se incrementa', trasEditar.includes('versión 2'));

// Y el paciente deja de verlo: RB-07, sin aprobación no hay publicación.
await paciente.goto(`${BASE}/aprender`, { waitUntil: 'networkidle' });
check('RB-07: el texto reescrito desaparece hasta una nueva aprobación',
  (await paciente.textContent('body')).includes('Todavía no hay material publicado'));

await browser.close();
console.log(fallos.length === 0 ? '\nTODO VERDE' : `\nFALLOS: ${fallos.join(', ')}`);
process.exit(fallos.length === 0 ? 0 : 1);
