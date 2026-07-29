/**
 * Verificación end-to-end del panel administrativo (RF-16, §15, §17.1, §17.2).
 *
 * Usa cuatro cuentas para poder comprobar que cada rol ve exactamente su
 * ámbito y nada más.
 *
 *   npm run dev      # en otra terminal
 *   npm run test:e2e:panel
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

async function cuenta(rol) {
  const ctx = await browser.newContext({ viewport: { width: 1000, height: 1200 } });
  const page = await ctx.newPage();
  const { correo } = await signUp(page, BASE);
  if (rol) asignarRol(correo, rol);
  return { page, correo };
}

const { page: admin, correo: correoAdmin } = await cuenta('admin');
const { page: clinico } = await cuenta('clinical_reviewer');
const { page: soporte } = await cuenta('support');
const { page: paciente, correo: correoPaciente } = await cuenta(null);

/* 1. Acceso al panel (§15). */

await paciente.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
check('§15: un paciente no accede al panel', new URL(paciente.url()).pathname === '/');

await paciente.goto(`${BASE}/admin/usuarios`, { waitUntil: 'networkidle' });
check('§15: un paciente no accede a usuarios', new URL(paciente.url()).pathname === '/');

await paciente.goto(`${BASE}/admin/auditoria`, { waitUntil: 'networkidle' });
check('§15: un paciente no accede a la auditoría', new URL(paciente.url()).pathname === '/');

await admin.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
check('el administrador entra al panel', new URL(admin.url()).pathname === '/admin');
if (OUT) await admin.screenshot({ path: `${OUT}/20-panel.png`, fullPage: true });

/* 2. Métricas agregadas (§5, §17.2). */

const panel = await admin.textContent('main');
check('§5.2: muestra métricas de activación', panel.includes('Cuentas creadas'));
check('§5.3: muestra métricas de uso', panel.includes('Reportes generados'));
check('§17.2: aclara que son recuentos agregados',
  panel.includes('no muestra mediciones ni datos de personas concretas'));

/* 3. Cada rol ve solo sus secciones. */

check('el administrador ve usuarios y auditoría',
  panel.includes('Usuarios') && panel.includes('Auditoría'));
// RB-06 — el administrador ve el RECUENTO de reglas activas (es un agregado)
// pero no el enlace para gestionarlas.
check('el administrador ve el recuento de reglas activas',
  panel.includes('Reglas clínicas activas'));
check('RB-06: el administrador NO puede gestionar reglas clínicas',
  !/Definir, aprobar y activar reglas/.test(panel));

await clinico.goto(`${BASE}/admin`, { waitUntil: 'networkidle' });
const panelClinico = await clinico.textContent('main');
check('el responsable clínico ve reglas y contenido',
  /Definir, aprobar y activar reglas/.test(panelClinico) &&
    /material educativo/.test(panelClinico));
check('el responsable clínico NO ve gestión de usuarios',
  !/Roles y estado de las cuentas/.test(panelClinico));

await clinico.goto(`${BASE}/admin/usuarios`, { waitUntil: 'networkidle' });
check('§15: el responsable clínico no accede a usuarios',
  new URL(clinico.url()).pathname === '/');

/* 4. Auditoría acotada por ámbito (§15 "Limitado", §17.2). */

await admin.goto(`${BASE}/admin/auditoria`, { waitUntil: 'networkidle' });
const auditoriaAdmin = await admin.textContent('main');
check('el administrador ve todos los eventos',
  auditoriaAdmin.includes('Ves todos los eventos registrados'));
check('la auditoría del administrador incluye eventos de cuentas',
  auditoriaAdmin.includes('users'));
if (OUT) await admin.screenshot({ path: `${OUT}/21-auditoria.png`, fullPage: true });

await soporte.goto(`${BASE}/admin/auditoria`, { waitUntil: 'networkidle' });
const auditoriaSoporte = await soporte.textContent('main');
check('soporte tiene un ámbito acotado a cuentas',
  auditoriaSoporte.includes('eventos de cuentas'));
check('§17.2: soporte NO ve eventos clínicos',
  !auditoriaSoporte.includes('clinical_rules') && !auditoriaSoporte.includes('alert_events'));

await clinico.goto(`${BASE}/admin/auditoria`, { waitUntil: 'networkidle' });
const auditoriaClinico = await clinico.textContent('main');
check('el responsable clínico tiene un ámbito acotado a lo clínico',
  auditoriaClinico.includes('eventos clínicos'));
check('§17.2: el responsable clínico NO ve eventos de cuentas',
  !auditoriaClinico.includes('users'));

/* 5. Gestión de usuarios. */

await admin.goto(`${BASE}/admin/usuarios`, { waitUntil: 'networkidle' });
check('el listado muestra las cuentas',
  (await admin.textContent('main')).includes(correoPaciente));

// Nadie actúa sobre su propia cuenta: se explica en pantalla.
const tarjetaPropia = admin.locator('main ul > li', { hasText: correoAdmin });
check('no permite actuar sobre la propia cuenta',
  (await tarjetaPropia.textContent()).includes('No puedes cambiar tu propio rol'));

// Cambiar el rol de otra cuenta.
const tarjetaPaciente = admin.locator('main ul > li', { hasText: correoPaciente });
await tarjetaPaciente.locator('select').selectOption('analyst');
await tarjetaPaciente.getByRole('button', { name: 'Cambiar rol' }).click();
await tarjetaPaciente.getByText('Analista').first().waitFor({ timeout: 20000 });
check('el administrador cambia el rol de otra cuenta', true);

// Suspender: la cuenta deja de poder entrar.
await tarjetaPaciente.getByRole('button', { name: 'Suspender cuenta' }).click();
await tarjetaPaciente.getByText('Suspendida').first().waitFor({ timeout: 20000 });
check('el administrador suspende una cuenta', true);

await paciente.goto(`${BASE}/`, { waitUntil: 'networkidle' });
check('§17.1: la cuenta suspendida pierde el acceso',
  paciente.url().includes('/entrar'));

// El cambio quedó auditado (RF-16).
await admin.goto(`${BASE}/admin/auditoria`, { waitUntil: 'networkidle' });
const trasCambios = await admin.textContent('main');
check('RF-16: el cambio de rol queda auditado', trasCambios.includes('user_role_changed'));
check('RF-16: la suspensión queda auditada', trasCambios.includes('account_suspended'));

// Reactivar devuelve el acceso.
await admin.goto(`${BASE}/admin/usuarios`, { waitUntil: 'networkidle' });
const tarjetaReactivar = admin.locator('main ul > li', { hasText: correoPaciente });
await tarjetaReactivar.getByRole('button', { name: 'Reactivar cuenta' }).click();
await tarjetaReactivar.getByText('Activa').first().waitFor({ timeout: 20000 });
check('el administrador reactiva una cuenta', true);

await browser.close();
console.log(fallos.length === 0 ? '\nTODO VERDE' : `\nFALLOS: ${fallos.join(', ')}`);
process.exit(fallos.length === 0 ? 0 : 1);
