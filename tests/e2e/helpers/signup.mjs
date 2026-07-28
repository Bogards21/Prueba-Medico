/** Alta completa de un paciente: cuenta, verificación y consentimientos. */
export async function signUp(page, base) {
  const correo = `e2e${Date.now()}${Math.floor(Math.random() * 1000)}@ejemplo.mx`;
  const clave = 'el perro come croquetas';

  await page.goto(`${base}/registro`, { waitUntil: 'networkidle' });
  await page.fill('#email', correo);
  await page.fill('#password', clave);
  await page.getByRole('button', { name: 'Crear mi cuenta' }).click();
  await page.waitForSelector('text=Creamos tu cuenta', { timeout: 20000 });

  await page.getByRole('link', { name: 'Confirmar mi correo' }).click();
  await page.getByRole('button', { name: 'Confirmar mi correo' }).click();
  await page.waitForSelector('text=Tu correo quedó confirmado', { timeout: 20000 });

  await page.goto(`${base}/onboarding/consentimientos`, { waitUntil: 'networkidle' });
  for (const nombre of [
    'Términos de uso',
    'Aviso de privacidad',
    'Tratamiento de tus datos de salud',
  ]) {
    await page.getByText(nombre, { exact: false }).first().click();
  }
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await page.waitForURL((u) => !u.pathname.includes('onboarding'), { timeout: 20000 });

  return { correo, clave };
}
