# Terraza Mojito

Sitio de reservas y panel de gestión para Terraza Mojito (Metepec, Estado de México).

Next.js 15 (App Router) · TypeScript · Tailwind · Supabase · desplegable en Vercel.

---

## Qué incluye

| Ruta | Qué es |
|---|---|
| `/` | Landing pública |
| `/reservar` | Solicitud de reserva en 5 pasos |
| `/privacidad` | Aviso de privacidad (borrador, ver advertencias abajo) |
| `/admin/login` | Acceso del equipo |
| `/admin` | Panel del día: KPIs y cola de solicitudes pendientes |
| `/admin/reservas` | Listado con filtros por estado, fecha y búsqueda |
| `/admin/reservas/[id]` | Detalle, cambio de estado e historial |
| `/admin/clientes` | CRM: fichas, métricas y notas internas |
| `/admin/reportes` | Métricas del periodo (solo rol Admin) |

---

## Arranque local

```bash
npm install
cp .env.example .env.local     # opcional para una primera revisión
npm run dev                    # http://localhost:3000
```

Sin `.env.local` la app arranca en **modo demo**: funciona completa, pero guarda
los datos en memoria y los pierde al reiniciar. La interfaz lo anuncia con un
aviso amarillo — no es un despliegue válido para producción.

En modo demo y fuera de producción, el panel acepta `admin` / `demo`. Ese acceso
se desactiva solo en cuanto `NODE_ENV=production`.

---

## Puesta en producción

### 1. Base de datos

1. Crea un proyecto en [supabase.com](https://supabase.com).
2. Abre el **SQL Editor** y ejecuta `supabase/migrations/0001_esquema_inicial.sql`.
3. Copia la URL del proyecto y las llaves desde *Project Settings → API*.

El esquema activa RLS en todas las tablas y **no** define políticas permisivas
para la llave anónima: la aplicación lee y escribe con la `service_role` desde el
servidor. Si alguien extrae la llave anónima del bundle, no obtiene datos de
clientes.

### 2. Variables de entorno

Copia `.env.example` y llena:

| Variable | Para qué |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | URL del proyecto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Llave pública |
| `SUPABASE_SERVICE_ROLE_KEY` | Llave de servidor. **Nunca** con prefijo `NEXT_PUBLIC_` |
| `AUTH_SECRET` | Firma la cookie de sesión. Genérala con `openssl rand -base64 32` |
| `ADMIN_USER` / `ADMIN_PASSWORD` | Cuenta de administrador |
| `STAFF_USER` / `STAFF_PASSWORD` | Cuenta de staff (opcional) |

Sin `AUTH_SECRET` y `ADMIN_PASSWORD`, el panel queda inaccesible a propósito.

### 3. Despliegue

Importa el repositorio en Vercel, carga las variables de entorno y despliega.
No hace falta configuración extra.

---

## Reglas de negocio implementadas

- Toda solicitud nace en `pending`. La pantalla de éxito dice "Solicitud
  enviada", nunca "reserva confirmada".
- Rechazar exige motivo, validado en la aplicación y en la base de datos.
- Cada cambio de estado queda en `reservation_status_history` con estado
  anterior, nuevo, usuario y fecha.
- Estados terminales (rechazada, cancelada, completada, no show) no se reabren.
- Duplicados: teléfono y correo se normalizan; la misma persona no puede tener
  dos solicitudes vivas para el mismo horario (índice parcial en la base).
- Disponibilidad, antelación mínima y capacidad por franja se revalidan **en el
  servidor** al enviar, no solo al pintar el calendario.
- Consentimiento de privacidad y consentimiento de marketing son casillas
  separadas y ninguna viene premarcada.
- Las notas internas del CRM nunca se exponen al cliente.
- El rol Staff no ve reportes; se valida en el servidor, no ocultando el enlace.

---

## Pendientes antes de publicar

Esto **no** está resuelto y bloquea la salida a producción:

1. **Datos del negocio.** Dirección, teléfono, horarios reales, coordenadas y
   carta siguen sin confirmar. Están marcados como pendientes en
   `src/data/negocio.ts` y la interfaz muestra un aviso donde falta el dato, en
   lugar de inventarlo. Al llenarlos ahí aparecen en toda la app.
2. **Horarios de operación.** Los de `availability_rules` son provisionales y
   solo sirven para que el calendario sea navegable. Cámbialos por los reales.
3. **Aviso de privacidad.** El texto describe con exactitud qué datos recolecta
   el sistema, pero falta la identidad legal del responsable y debe revisarlo un
   abogado.
4. **Fotografía.** La galería muestra marcos vacíos que declaran qué foto va en
   cada hueco. Sirven de brief para la sesión; no se usó banco de imágenes
   porque el manual lo descarta.
5. **Lettering del logotipo.** El manual pide conservar el lettering original
   vectorizado. No se recibió el archivo, así que el nombre se compone con
   Fredoka en `src/components/ui/Logo.tsx`. Sustituir por el SVG maestro cuando
   llegue.
6. **Notificaciones.** El PRD las deja fuera del MVP. Hoy el negocio responde por
   WhatsApp desde el detalle de la reserva.

---

## Decisiones que conviene conocer

**El botón primario usa Hoja Profunda (`#1F6821`), no Verde Mojito (`#309830`).**
Blanco sobre Verde Mojito mide 3.71:1 y reprueba el criterio AA que pide el PRD.
Sobre Hoja Profunda mide 6.86:1. El Verde Mojito se conserva en fondos y
elementos gráficos, donde el contraste no aplica.

**Las fuentes se cargan por `<link>`, no con `next/font/google`.** `next/font`
descarga los archivos durante el build, lo que rompe cualquier build sin salida
a `fonts.googleapis.com`. Si prefieres auto-hospedarlas para ganar unos ms de
LCP, se cambia en `src/app/layout.tsx`.

**La autenticación usa variables de entorno, no una tabla de usuarios.** Cubre al
equipo pequeño que describe el PRD. Si el negocio necesita altas y bajas de
usuarios, recuperación de contraseña o 2FA, migra a Supabase Auth: el resto del
código solo depende de `sesionActual()` y del tipo `Rol` en `src/lib/auth.ts`.

---

## Comandos

```bash
npm run dev        # desarrollo
npm run build      # build de producción
npm start          # servir el build
npm run typecheck  # TypeScript sin emitir
```
