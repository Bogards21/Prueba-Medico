# PRD — Landing Page + Módulo de Reservas
## Terraza Mojito (Metepec, Edo. de México)

| Campo | Valor |
|---|---|
| Versión | 0.1 — borrador |
| Fecha | 2026-08-08 |
| Estado | En definición — bloqueado parcialmente por datos del negocio |
| Alcance | **Solo frontend** |

> **Nota sobre datos pendientes.** Todo lo marcado como `[PENDIENTE]` requiere información
> que no pude obtener: la red de este entorno bloquea Google Maps y Facebook, así que los
> datos del negocio deben capturarse manualmente. Ningún dato de este documento está
> inventado — los campos sin confirmar están explícitamente vacíos.

---

## 1. Resumen

Terraza Mojito es un bar/rooftop en Metepec, Estado de México. Hoy su presencia digital
vive exclusivamente en redes sociales (Instagram, Facebook, TikTok), lo que implica dos
problemas: no controla el canal, y no tiene forma de capturar una reserva sin que alguien
conteste mensajes manualmente.

Este proyecto entrega una landing page propia, mobile-first, con un módulo de reservas
integrado. El objetivo no es replicar las redes sociales, sino ser el destino al que esas
redes apuntan desde su bio: el lugar donde el visitante resuelve *dónde están, cuándo
abren, cómo se ve, y aparta mesa* sin salir de la página.

### Fuentes verificadas

Confirmadas por búsqueda web:

- Instagram: [@terraza_mojitometepec](https://www.instagram.com/terraza_mojitometepec/) — bio: "Terraza Mojito - Rooftop"
- Instagram: [@terraza_mojito1](https://www.instagram.com/terraza_mojito1/)
- TikTok: [@terraza_mojitometepec](https://www.tiktok.com/@terraza_mojitometepec)
- Facebook: [Terraza Mojito Metepec](https://www.facebook.com/p/Terraza-Mojito-Metepec-61579700160729/)

El descriptor **"Rooftop"** viene del perfil de Instagram y es el ángulo de posicionamiento
principal de la landing: no es un bar más, es una terraza con vista.

---

## 2. Datos del negocio `[PENDIENTE]`

Estos campos alimentan el contenido, el `<head>`, el JSON-LD de SEO local y el footer.
Se llenan una sola vez en `src/data/negocio.ts` y de ahí los consume toda la app.

| Campo | Valor | Origen |
|---|---|---|
| Nombre legal / comercial | `[PENDIENTE]` | Google Maps |
| Dirección completa | `[PENDIENTE]` | Google Maps |
| Coordenadas (lat, lng) | `[PENDIENTE]` | Google Maps |
| Teléfono | `[PENDIENTE]` | Google Maps |
| WhatsApp (si difiere) | `[PENDIENTE]` | Negocio |
| Horarios por día | `[PENDIENTE]` | Google Maps |
| Rating / nº reseñas | `[PENDIENTE]` | Google Maps |
| Categoría | `[PENDIENTE]` (probable: bar / rooftop) | Google Maps |
| Rango de precios | `[PENDIENTE]` | Google Maps |
| Capacidad / nº de mesas | `[PENDIENTE]` | Negocio |
| Zonas (rooftop / planta baja / barra) | `[PENDIENTE]` | Negocio |
| Email de contacto | `[PENDIENTE]` | Negocio |

---

## 3. Objetivos

### De negocio

1. **Capturar reservas** sin depender de DMs de Instagram ni de que alguien esté al teléfono.
2. **Reducir fricción de descubrimiento**: horarios, ubicación y ambiente visibles en menos de 5 segundos.
3. **Dar un destino al link de la bio** que sea propio y medible.

### Métricas de éxito

| Métrica | Definición | Meta inicial |
|---|---|---|
| Tasa de conversión a reserva | Reservas enviadas / visitantes únicos | ≥ 4 % |
| Abandono del formulario | Inician el form pero no lo envían | ≤ 40 % |
| Tiempo a interacción | LCP en 4G móvil | < 2.5 s |
| Rebote en móvil | Sesiones de una sola vista | ≤ 55 % |

> Las metas son puntos de partida razonables para un negocio local sin histórico, no
> compromisos derivados de datos previos. Se recalibran tras el primer mes real.

---

## 4. Alcance

### Dentro de alcance

- Landing page completa, responsive, mobile-first
- Módulo de reservas (UI + validación + envío)
- Galería de fotos
- Sección de menú/carta (si hay material — ver `[PENDIENTE]`)
- Mapa y datos de contacto
- SEO local (metadatos + JSON-LD `Restaurant`/`BarOrPub`)
- Accesibilidad AA

### Fuera de alcance (esta fase)

- Backend propio, base de datos, panel de administración
- Autenticación de usuarios / cuentas
- Pagos o anticipos en línea
- Gestión de inventario de mesas en tiempo real
- Multi-idioma (se entrega solo en español)
- Blog o CMS

---

## 5. Decisión crítica: ¿a dónde va la reserva?

**Este es el punto que hay que cerrar antes de programar.** "Solo frontend" significa que
no hay servidor propio donde guardar una reserva. Hay tres caminos reales:

### Opción A — Mock / demo
El formulario valida y muestra confirmación, pero no envía nada a ningún lado.

- ✅ Cero dependencias, cero costo, sirve para aprobar el diseño
- ❌ Inútil en producción: la reserva se pierde

### Opción B — WhatsApp / mailto *(recomendada)*
Al enviar, se abre WhatsApp con un mensaje prellenado y estructurado dirigido al negocio.

- ✅ Cero backend, cero costo, funciona hoy mismo
- ✅ El negocio ya usa WhatsApp; no cambia su operación
- ✅ La confirmación es humana, que es como ya trabajan
- ❌ No hay registro estructurado ni control de disponibilidad
- ❌ Requiere que el visitante tenga WhatsApp (alto en México, pero no universal → se ofrece fallback a llamada telefónica)

### Opción C — Servicio externo (Supabase / Formspree)
El formulario escribe a un backend gestionado por terceros.

- ✅ Reservas quedan registradas y consultables
- ✅ Sigue sin requerir servidor propio
- ❌ Requiere cuenta, configuración y probablemente costo al crecer
- ❌ Necesita una vista de administración para ser útil (fuera de alcance actual)

**Recomendación: Opción B**, con el código estructurado para que migrar a C sea cambiar
una sola función (`enviarReserva()`), no reescribir el módulo.

> **Decisión pendiente del cliente.** El resto del PRD asume Opción B.

---

## 6. Estructura de la landing

Orden vertical, pensado para pulgar en móvil:

| # | Sección | Propósito | Contenido clave |
|---|---|---|---|
| 1 | **Hero** | Vender el ambiente en 3 segundos | Foto/video del rooftop al atardecer, logo, tagline, CTA "Reservar mesa" |
| 2 | **Barra de estado** | Resolver la duda inmediata | "Abierto ahora · cierra a las X" calculado en vivo desde los horarios |
| 3 | **Nosotros** | Diferenciación | Concepto rooftop, 2–3 párrafos cortos |
| 4 | **Galería** | Prueba visual | 6–12 fotos, lightbox, lazy loading |
| 5 | **Menú** | Intención de compra | Categorías (coctelería, cerveza, alimentos) `[PENDIENTE: material]` |
| 6 | **Reservas** | Conversión | Módulo completo (§7) |
| 7 | **Ubicación** | Cerrar la visita | Mapa embebido, dirección, botón "Cómo llegar" |
| 8 | **Contacto / Footer** | Confianza | Teléfono, redes, horarios completos |

**CTA persistente:** botón flotante "Reservar" visible en móvil tras pasar el hero.

---

## 7. Módulo de reservas — especificación

### 7.1 Campos

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| Nombre completo | texto | Sí | 2–60 caracteres, no solo espacios |
| Teléfono | tel | Sí | 10 dígitos (formato MX), se normaliza a `+52` |
| Nº de personas | selector | Sí | 1–15; >15 muestra aviso de "evento grande" con contacto directo |
| Fecha | date | Sí | Desde hoy hasta +60 días; días cerrados deshabilitados |
| Hora | selector | Sí | Solo horas dentro del horario de operación del día elegido |
| Zona preferida | radio | No | `[PENDIENTE: confirmar zonas]` |
| Ocasión | selector | No | Cumpleaños, aniversario, reunión, otro |
| Notas | textarea | No | Máx. 300 caracteres |

### 7.2 Reglas de negocio

1. **No se ofrecen horarios inválidos.** El selector de hora se deriva de los horarios
   reales del día elegido; si el negocio cierra a las 2:00, la última franja reservable es
   `[PENDIENTE: antelación mínima antes del cierre]`.
2. **Días cerrados deshabilitados** en el calendario, no rechazados después de elegirlos.
3. **Antelación mínima:** `[PENDIENTE]` (sugerencia: 2 horas).
4. **Grupos grandes:** más de 15 personas se desvía a contacto directo en lugar de
   procesarse como reserva normal.
5. **Sin promesa de confirmación automática.** El texto de éxito dice explícitamente que
   la reserva **está sujeta a confirmación** por el negocio. Nunca afirmar "mesa
   confirmada" cuando el frontend no puede garantizarlo.

### 7.3 Flujo

```
Usuario llena el formulario
        │
        ├─ Validación en vivo por campo (al salir del campo, no al teclear)
        │
        ▼
   Clic en "Reservar"
        │
        ├─ ¿Inválido? → foco al primer error + mensaje descriptivo
        │
        ▼
   Pantalla de resumen ("¿Todo correcto?")
        │
        ▼
   Confirmar → se arma el mensaje y se abre WhatsApp
        │
        ▼
   Pantalla de éxito: "Tu solicitud fue enviada. Te confirmamos por WhatsApp."
        + botón de respaldo: "Llamar directamente"
```

El paso de resumen existe porque el envío sale de la página: si el usuario se equivocó,
corregir después implica reescribir un mensaje de WhatsApp a mano.

### 7.4 Formato del mensaje

```
Hola, quiero reservar en Terraza Mojito.

Nombre: {nombre}
Personas: {personas}
Fecha: {fecha_larga}
Hora: {hora}
Zona: {zona}
Ocasión: {ocasion}
Notas: {notas}
```

### 7.5 Manejo de errores

| Situación | Comportamiento |
|---|---|
| WhatsApp no disponible en el dispositivo | Fallback automático a `wa.me` en navegador; si falla, se muestra el teléfono para llamar |
| Usuario elige fecha en día cerrado | Imposible: deshabilitado en el calendario |
| Campos inválidos al enviar | Foco al primero, mensaje bajo el campo, resumen accesible arriba del form |
| JavaScript desactivado | Se muestran teléfono y dirección como contenido estático (degradación elegante) |

---

## 8. Diseño

### 8.1 Dirección visual

Rooftop nocturno. La paleta debe evocar la hora azul y la luz cálida de terraza, no un
restaurante corporativo. Base oscura con acentos cálidos, tipografía con carácter en
títulos y alta legibilidad en cuerpo.

### 8.2 Paleta `[PENDIENTE: logo]`

La paleta definitiva se extrae del logo, que aún no recibo. Placeholders provisionales
para no bloquear el desarrollo:

| Token | Valor provisional | Uso |
|---|---|---|
| `--fondo` | `#0F1419` | Fondo principal |
| `--superficie` | `#1A2129` | Tarjetas, formulario |
| `--acento` | `#3FB68B` | CTA, enlaces (verde mojito) |
| `--acento-calido` | `#E8A33D` | Detalles, hover |
| `--texto` | `#F2F5F7` | Texto principal |
| `--texto-suave` | `#9AA7B2` | Secundario |

> Todos los pares texto/fondo deben verificarse a contraste **≥ 4.5:1** al sustituir por
> los colores reales del logo. El verde y el ámbar sobre fondo oscuro son los que más
> riesgo tienen de no pasar.

### 8.3 Responsive

- Mobile-first. Breakpoints: 480 / 768 / 1024 / 1440 px
- Área táctil mínima de 44×44 px en todos los controles
- El formulario nunca en dos columnas por debajo de 768 px

---

## 9. Stack técnico

| Capa | Elección | Razón |
|---|---|---|
| Framework | **React 18 + Vite** | Rápido, sin servidor, despliegue estático |
| Lenguaje | **TypeScript** | Los tipos de la reserva son el contrato del módulo |
| Estilos | **Tailwind CSS** | Consistencia con tokens, sin CSS huérfano |
| Formulario | **React Hook Form + Zod** | Validación declarativa, un solo esquema para tipos y reglas |
| Fechas | **date-fns** + locale `es` | Ligera; maneja horarios y formato en español |
| Iconos | **lucide-react** | — |
| Despliegue | **Vercel** (estático) | Preview por rama, dominio propio |

### Estructura propuesta

```
src/
├── data/
│   └── negocio.ts          ← fuente única de datos del negocio
├── lib/
│   ├── horarios.ts         ← "¿abierto ahora?", franjas válidas
│   ├── reserva.schema.ts   ← esquema Zod
│   └── enviarReserva.ts    ← ÚNICO punto a cambiar para migrar a backend
├── components/
│   ├── Hero.tsx
│   ├── EstadoApertura.tsx
│   ├── Galeria.tsx
│   ├── Menu.tsx
│   ├── Ubicacion.tsx
│   └── reservas/
│       ├── FormularioReserva.tsx
│       ├── ResumenReserva.tsx
│       └── ConfirmacionReserva.tsx
└── App.tsx
```

El aislamiento de `enviarReserva.ts` es deliberado: es lo que permite pasar de Opción B a
Opción C sin tocar la interfaz.

---

## 10. Requisitos no funcionales

### Accesibilidad (WCAG 2.1 AA)

- Navegación completa por teclado, foco visible
- Labels reales asociados a cada input (no placeholders como etiqueta)
- Errores anunciados vía `aria-live`
- Contraste ≥ 4.5:1 en texto, ≥ 3:1 en bordes de controles
- Galería con `alt` descriptivo real, no "imagen1.jpg"

### Rendimiento

- Lighthouse ≥ 90 en Performance y Accessibility
- Imágenes en WebP, `srcset` por breakpoint, lazy loading bajo el pliegue
- Video del hero: `poster` + autoplay silenciado, con fallback a imagen en conexiones lentas

### SEO

- `<title>` y meta description por sección
- Open Graph y Twitter Card (para cuando compartan el link en redes)
- JSON-LD tipo `BarOrPub` con dirección, horarios, teléfono y geo
- `sitemap.xml` y `robots.txt`

### Privacidad

El formulario recoge nombre y teléfono. Aunque no haya backend, el aviso de privacidad es
obligatorio en México (LFPDPPP). Se incluye enlace a aviso de privacidad en el formulario.
`[PENDIENTE: el negocio debe proporcionar su aviso de privacidad]`

---

## 11. Bloqueadores y decisiones abiertas

| # | Tema | Necesito | Bloquea |
|---|---|---|---|
| 1 | Datos de Google Maps | Dirección, teléfono, horarios, rating | Contenido, SEO, lógica de horarios |
| 2 | Logo | Archivo PNG/SVG | Paleta, hero, favicon |
| 3 | Destino de la reserva | Decisión A / B / C | Implementación del envío |
| 4 | Fotografías | 6–12 imágenes en buena resolución | Galería, hero |
| 5 | Menú / carta | PDF o lista de productos y precios | Sección menú |
| 6 | Zonas reservables | ¿Rooftop y planta baja son elegibles? | Campo "zona" |
| 7 | Antelación mínima | Horas mínimas antes de la reserva | Validación de hora |
| 8 | Aviso de privacidad | Texto legal | Cumplimiento LFPDPPP |
| 9 | Dominio | ¿Ya tienen uno? | Despliegue, SEO |
| 10 | Repositorio | Permiso para crear `Terraza-Mojito` en GitHub | Entrega del código |

---

## 12. Fases

| Fase | Entregable | Depende de |
|---|---|---|
| **0 — Definición** | Este PRD aprobado | Bloqueadores 1, 2, 3 |
| **1 — Maqueta** | Landing estática con contenido real, sin reservas | 1, 2, 4 |
| **2 — Reservas** | Módulo completo funcionando | 3, 6, 7, 8 |
| **3 — Pulido** | SEO, accesibilidad, rendimiento, despliegue | 9 |
| **4 — Futuro** | Backend, panel de reservas, confirmación automática | Fuera de alcance actual |

---

## Anexo — Datos a capturar

Para llenar los `[PENDIENTE]`, copiar de Google Maps y del negocio:

```
--- GOOGLE MAPS ---
Nombre exacto:
Dirección completa:
Teléfono:
Horarios (lunes a domingo):
Rating / nº de reseñas:
Categoría:
Rango de precios:
Sitio web:

--- NEGOCIO ---
Capacidad / nº de mesas:
Zonas reservables:
¿Quién confirma las reservas?:
Antelación mínima:
¿Tienen menú digital?:
Eventos / música en vivo:
Dominio web (si existe):
```
