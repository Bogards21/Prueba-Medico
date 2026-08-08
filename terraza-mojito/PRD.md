# PRD — Landing Page + Módulo de Reservas
## Terraza Mojito (Metepec, Edo. de México)

| Campo | Valor |
|---|---|
| Versión | 0.2 — borrador |
| Fecha | 2026-08-08 |
| Estado | Marca definida · datos del negocio pendientes |
| Alcance | **Solo frontend** |
| Insumos recibidos | Manual de Identidad Gráfica v1.0, logotipo (3 variantes raster) |

> **Cambio importante respecto a v0.1.** El borrador anterior proponía una landing oscura
> con estética de rooftop nocturno. **Eso era incorrecto** y queda descartado: el manual de
> identidad especifica una proporción de 55 % blanco y prohíbe explícitamente que la marca
> se lea como "antro nocturno genérico". La dirección visual de este documento es clara,
> fresca y diurna.

> **Datos pendientes.** Lo marcado como `[PENDIENTE]` requiere información que no pude
> obtener: la red de este entorno bloquea Google Maps y Facebook. Ningún dato está
> inventado — los campos sin confirmar están explícitamente vacíos.

---

## 1. Resumen

Terraza Mojito es un bar/terraza en Metepec, Estado de México. Su presencia digital vive
hoy solo en redes sociales, lo que implica dos problemas: no controla el canal, y no puede
capturar una reserva sin que alguien conteste mensajes a mano.

Este proyecto entrega una landing page propia, mobile-first, con módulo de reservas. El
objetivo no es replicar las redes, sino ser el destino al que apuntan desde su bio: donde
el visitante resuelve *dónde están, cuándo abren, cómo se ve, y aparta mesa* sin salir.

### Posicionamiento (del manual §1)

> Un rincón fresco y relajado donde el sabor tropical convierte cualquier encuentro en un
> buen momento.

La marca debe sentirse **fresca, alegre, natural, social y auténtica**. No industrial, no
antro nocturno, no lujo rígido. Su diferenciador emocional, según el manual, es que *no
vende únicamente mojitos: vende la pausa fresca del día*.

**Tagline:** *Frescura que se comparte.*

### Fuentes verificadas

Confirmadas por búsqueda web:

- Instagram: [@terraza_mojitometepec](https://www.instagram.com/terraza_mojitometepec/) — bio: "Terraza Mojito - Rooftop"
- Instagram: [@terraza_mojito1](https://www.instagram.com/terraza_mojito1/)
- TikTok: [@terraza_mojitometepec](https://www.tiktok.com/@terraza_mojitometepec)
- Facebook: [Terraza Mojito Metepec](https://www.facebook.com/p/Terraza-Mojito-Metepec-61579700160729/)

---

## 2. Datos del negocio `[PENDIENTE]`

Alimentan el contenido, el `<head>`, el JSON-LD de SEO local y el footer. Se declaran una
sola vez en `src/data/negocio.ts`.

| Campo | Valor | Origen |
|---|---|---|
| Nombre legal / comercial | `[PENDIENTE]` | Google Maps |
| Dirección completa | `[PENDIENTE]` | Google Maps |
| Coordenadas (lat, lng) | `[PENDIENTE]` | Google Maps |
| Teléfono | `[PENDIENTE]` | Google Maps |
| WhatsApp (si difiere) | `[PENDIENTE]` | Negocio |
| Horarios por día | `[PENDIENTE]` | Google Maps |
| Rating / nº reseñas | `[PENDIENTE]` | Google Maps |
| Categoría | `[PENDIENTE]` | Google Maps |
| Rango de precios | `[PENDIENTE]` | Google Maps |
| Capacidad / nº de mesas | `[PENDIENTE]` | Negocio |
| Zonas reservables | `[PENDIENTE]` | Negocio |
| Email de contacto | `[PENDIENTE]` | Negocio |

---

## 3. Objetivos y métricas

### De negocio

1. **Capturar reservas** sin depender de DMs ni de que alguien esté al teléfono.
2. **Reducir fricción de descubrimiento**: horarios, ubicación y ambiente en menos de 5 s.
3. **Dar un destino propio y medible** al link de la bio.

### Métricas

| Métrica | Definición | Meta inicial |
|---|---|---|
| Conversión a reserva | Reservas enviadas / visitantes únicos | ≥ 4 % |
| Abandono del formulario | Inician pero no envían | ≤ 40 % |
| LCP en 4G móvil | Largest Contentful Paint | < 2.5 s |
| Rebote en móvil | Sesiones de una sola vista | ≤ 55 % |

> Puntos de partida razonables para un negocio local sin histórico, no compromisos
> derivados de datos previos. Se recalibran tras el primer mes real.

---

## 4. Alcance

**Dentro:** landing responsive mobile-first · módulo de reservas · galería · menú · mapa y
contacto · SEO local (metadatos + JSON-LD) · accesibilidad AA.

**Fuera:** backend propio · base de datos · panel de administración · autenticación ·
pagos en línea · disponibilidad de mesas en tiempo real · multi-idioma · blog/CMS.

---

## 5. Decisión crítica: ¿a dónde va la reserva?

**Hay que cerrar esto antes de programar.** "Solo frontend" significa que no hay servidor
propio donde guardar una reserva. Tres caminos reales:

### Opción A — Mock / demo
Valida y muestra confirmación, pero no envía nada.
- ✅ Cero dependencias y costo; sirve para aprobar diseño
- ❌ Inútil en producción: la reserva se pierde

### Opción B — WhatsApp / mailto *(recomendada)*
Al enviar se abre WhatsApp con un mensaje prellenado y estructurado.
- ✅ Cero backend, cero costo, funciona hoy
- ✅ El negocio ya usa WhatsApp; no cambia su operación
- ✅ Encaja con el tono de marca: anfitrión, no corporativo
- ❌ Sin registro estructurado ni control de disponibilidad
- ❌ Requiere WhatsApp en el dispositivo → fallback a llamada

### Opción C — Servicio externo (Supabase / Formspree)
- ✅ Reservas registradas y consultables
- ❌ Requiere cuenta, configuración y probablemente costo
- ❌ Necesita vista de administración para ser útil (fuera de alcance)

**Recomendación: Opción B**, con el código estructurado para que migrar a C sea cambiar
una sola función (`enviarReserva()`), no reescribir el módulo.

> **Decisión pendiente del cliente.** El resto del documento asume Opción B.

---

## 6. Estructura de la landing

Orden vertical, pensado para pulgar en móvil:

| # | Sección | Propósito | Contenido clave |
|---|---|---|---|
| 1 | **Hero** | Vender el ambiente en 3 s | Foto de terraza con luz natural, logo, tagline, CTA "Reserva tu mesa" |
| 2 | **Estado** | Resolver la duda inmediata | "Abierto ahora · cierra a las X", calculado en vivo |
| 3 | **Nosotros** | Diferenciación | Concepto terraza, 2–3 párrafos cortos, tono sensorial |
| 4 | **Galería** | Prueba visual | 6–12 fotos, lightbox, lazy loading |
| 5 | **Menú** | Intención de compra | Categorías (coctelería, cerveza, alimentos) `[PENDIENTE: material]` |
| 6 | **Reservas** | Conversión | Módulo completo (§7) |
| 7 | **Ubicación** | Cerrar la visita | Mapa, dirección, botón "Cómo llegar" |
| 8 | **Footer** | Confianza | Teléfono, redes, horarios completos, aviso de privacidad |

**CTA persistente:** botón flotante "Reserva tu mesa" visible en móvil tras pasar el hero.

### Copy de CTAs

Tomado del repertorio aprobado en el manual §7, sin inventar frases nuevas:

- Principal: **Reserva tu mesa**
- Menú: **Conoce el menú**
- Secundarios: *Arma el plan* · *Celebra con nosotros* · *Nos vemos en la terraza*

---

## 7. Módulo de reservas

### 7.1 Campos

| Campo | Tipo | Requerido | Validación |
|---|---|---|---|
| Nombre completo | texto | Sí | 2–60 caracteres, no solo espacios |
| Teléfono | tel | Sí | 10 dígitos (MX), se normaliza a `+52` |
| Nº de personas | selector | Sí | 1–15; >15 → aviso de "evento grande" con contacto directo |
| Fecha | date | Sí | Hoy a +60 días; días cerrados deshabilitados |
| Hora | selector | Sí | Solo franjas dentro del horario del día elegido |
| Zona preferida | radio | No | `[PENDIENTE: confirmar zonas]` |
| Ocasión | selector | No | Cumpleaños, aniversario, reunión, otro |
| Notas | textarea | No | Máx. 300 caracteres |

### 7.2 Reglas de negocio

1. **No se ofrecen horarios inválidos.** El selector de hora se deriva de los horarios
   reales del día; la última franja reservable es `[PENDIENTE: antelación antes del cierre]`.
2. **Días cerrados deshabilitados** en el calendario, no rechazados después de elegirlos.
3. **Antelación mínima:** `[PENDIENTE]` (sugerencia: 2 horas).
4. **Grupos > 15 personas** se desvían a contacto directo.
5. **Sin promesa de confirmación automática.** El mensaje de éxito dice explícitamente que
   la reserva **está sujeta a confirmación**. Nunca afirmar "mesa confirmada" cuando el
   frontend no puede garantizarlo.

### 7.3 Flujo

```
Usuario llena el formulario
        │
        ├─ Validación en vivo por campo (al salir del campo, no al teclear)
        ▼
   Clic en "Reserva tu mesa"
        │
        ├─ ¿Inválido? → foco al primer error + mensaje descriptivo
        ▼
   Pantalla de resumen ("¿Todo correcto?")
        ▼
   Confirmar → se arma el mensaje y se abre WhatsApp
        ▼
   Éxito: "Tu solicitud fue enviada. Te confirmamos por WhatsApp."
        + botón de respaldo: "Llamar directamente"
```

El paso de resumen existe porque el envío sale de la página: si el usuario se equivocó,
corregir después implica reescribir un mensaje de WhatsApp a mano.

### 7.4 Mensaje generado

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

### 7.5 Errores

| Situación | Comportamiento |
|---|---|
| WhatsApp no disponible | Fallback a `wa.me` en navegador; si falla, se muestra el teléfono |
| Fecha en día cerrado | Imposible: deshabilitado en el calendario |
| Campos inválidos | Foco al primero, mensaje bajo el campo, resumen en `aria-live` |
| JavaScript desactivado | Teléfono y dirección como contenido estático |

---

## 8. Diseño

Todo lo de esta sección deriva del **Manual de Identidad Gráfica v1.0**. Los tokens
implementados están en [`design-tokens.css`](./design-tokens.css).

### 8.1 Dirección visual

Fresca, diurna, artesanal. Blanco dominante con verdes de marca, formas redondeadas y
contornos orgánicos. La atmósfera es **atardecer y luz natural**, no noche: el manual pide
explícitamente evitar "escenas nocturnas indistinguibles".

**Proporción cromática de la página** (manual §4):

| Color | Proporción | Dónde |
|---|---|---|
| Blanco Espuma | 55 % | Fondo general, respiración |
| Verde Noche | 25 % | Titulares, texto, footer, secciones invertidas |
| Verde Mojito | 15 % | Ilustración, patrón, superficies decorativas |
| Verde Lima / Menta Suave | 5 % | Acentos puntuales |

### 8.2 Paleta y contraste verificado

Ratios calculados con el algoritmo WCAG 2.1, no estimados:

| Texto | Fondo | Ratio | Normal (4.5) | Grande/UI (3.0) |
|---|---|---:|:---:|:---:|
| Verde Noche `#0A2F0F` | Blanco | **14.72:1** | ✅ | ✅ |
| Carbón Botánico `#162018` | Blanco | **16.75:1** | ✅ | ✅ |
| Hoja Profunda `#1F6821` | Blanco | **6.86:1** | ✅ | ✅ |
| Verde Mojito `#309830` | Blanco | 3.71:1 | ❌ | ✅ |
| Blanco | Verde Noche | **14.72:1** | ✅ | ✅ |
| Blanco | Hoja Profunda `#1F6821` | **6.86:1** | ✅ | ✅ |
| Blanco | Verde Mojito | 3.71:1 | ❌ | ✅ |
| Verde Noche | Menta Suave `#A0E09B` | **9.56:1** | ✅ | ✅ |
| Verde Noche | Lima Pálida `#DDF3B5` | **12.31:1** | ✅ | ✅ |
| Verde Noche | Verde Lima `#43B33C` | **5.43:1** | ✅ | ✅ |
| Blanco | Verde Lima | 2.71:1 | ❌ | ❌ |

#### Conflicto detectado con el manual

El manual asigna **Verde Mojito `#309830` a las llamadas a la acción** (§4). Medido, un
botón Verde Mojito con texto blanco da **3.71:1**, por debajo del 4.5:1 que exige AA para
texto normal — y el propio manual pide texto de botón a 14–16 px, que no califica como
texto grande. Con texto Verde Noche encima tampoco alcanza (3.97:1).

**Resolución adoptada:** el botón primario usa **Hoja Profunda `#1F6821`** — color que ya
pertenece a la paleta secundaria del manual — con texto blanco: **6.86:1**. Verde Mojito
se conserva como color protagonista en superficie decorativa, ilustración y patrón, donde
no carga texto pequeño. El hover del botón va a Verde Noche.

Esto respeta la intención del manual (verde protagonista, familia cromática intacta) sin
entregar un botón que reprueba accesibilidad. **Requiere visto bueno del cliente.**

Reglas derivadas:
- Verde Lima nunca lleva texto blanco (2.71:1) ni se usa como borde funcional sobre blanco.
- Sobre Verde Mojito y Verde Lima, el texto siempre va en Verde Noche o Carbón Botánico.
- Menta Suave y Lima Pálida solo como fondos claros, siempre con texto oscuro.

### 8.3 Tipografía

Las tres familias están en Google Fonts. Se cargan con `font-display: swap` y subconjunto
latino; los pesos se limitan a los que realmente se usan para no penalizar el LCP.

| Nivel | Fuente | Peso | Tamaño | Uso |
|---|---|---|---|---|
| H1 | Fredoka | Bold | 36–64 px, interlineado 1.05 | Hero, títulos de campaña |
| H2 | Nunito Sans | ExtraBold | 28–40 px, interlineado 1.1 | Encabezados de sección |
| H3 | Nunito Sans | Bold | 22–28 px, interlineado 1.2 | Subtítulos, categorías de menú |
| Texto | Nunito Sans | Regular | 17 px, interlineado 1.5 | Descripciones |
| Datos | DM Sans | Bold | 14–16 px, tracking 3 % | Horarios, precios, botones |

Fallbacks operativos si las familias no cargan: `Arial Rounded MT Bold` para display,
`Arial` para el resto.

> El lettering del logotipo **no se reconstruye con fuentes**. Se usa siempre el asset.

### 8.4 Uso del logotipo en web

| Aplicación | Versión | Tamaño |
|---|---|---|
| Header | TM-L02 horizontal | ≥ 150 px de ancho |
| Hero | TM-L01 vertical a color | — |
| Footer sobre Verde Noche | TM-L05 negativa blanca | ≥ 150 px |
| Favicon | TM-L06 simplificada | 32, 48, 180, 512 px |
| Open Graph | TM-L01 sobre Blanco Espuma | 1200 × 630 px |

Área de seguridad: **1X** alrededor de la firma, donde X = altura de la "O" de `MOJITO`.
Sobre fotografía: **1.5X**. Ningún elemento invade esa zona.

### 8.5 Lenguaje visual

- **Formas:** bordes redondeados, contornos orgánicos, círculos que evocan rodaja de limón.
- **Patrón:** rodaja + hoja + cubo de hielo, al 8–15 % de opacidad sobre Menta Suave o
  Verde Noche. Separadores de sección y fondo del bloque de reservas. Nunca detrás de texto.
- **Iconos:** trazo redondeado de grosor uniforme, relleno plano. `lucide-react` cumple.
  Se necesitan: ubicación, horario, teléfono, personas, calendario, reservación, música.
- **Fotografía:** luz natural, condensación visible, ingredientes frescos, mesas de
  terraza, atardecer, encuadres cercanos, presencia humana espontánea. Temperatura
  ligeramente cálida, verdes naturales no fluorescentes, espacio negativo para texto.
  **Evitar:** flash frontal, filtros verde intenso, banco de imágenes posado, escenas
  nocturnas indistinguibles.

### 8.6 Responsive

- Mobile-first. Breakpoints: 480 / 768 / 1024 / 1440 px
- Área táctil mínima 44 × 44 px
- El formulario nunca en dos columnas por debajo de 768 px

---

## 9. Stack técnico

| Capa | Elección | Razón |
|---|---|---|
| Framework | **React 18 + Vite** | Rápido, sin servidor, despliegue estático |
| Lenguaje | **TypeScript** | Los tipos de la reserva son el contrato del módulo |
| Estilos | **Tailwind CSS** | Tokens del manual como `theme.extend` |
| Formulario | **React Hook Form + Zod** | Un solo esquema para tipos y reglas |
| Fechas | **date-fns** + locale `es` | Ligera; horarios y formato en español |
| Iconos | **lucide-react** | Trazo redondeado, coherente con el manual |
| Despliegue | **Vercel** (estático) | Preview por rama, dominio propio |

### Estructura

```
src/
├── data/
│   └── negocio.ts          ← fuente única de datos del negocio
├── styles/
│   └── tokens.css          ← paleta y tipografía del manual
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

El aislamiento de `enviarReserva.ts` es deliberado: permite pasar de Opción B a C sin
tocar la interfaz.

---

## 10. Requisitos no funcionales

### Accesibilidad (WCAG 2.1 AA)

- Navegación completa por teclado, foco visible (nunca `outline: none` sin reemplazo)
- Labels reales asociados a cada input; los placeholders no sustituyen etiquetas
- Errores anunciados vía `aria-live`
- Contraste conforme a la tabla §8.2
- Galería con `alt` descriptivo real
- El manual lo refuerza: *"no depender exclusivamente del color para comunicar
  promociones, disponibilidad o estados"* — los estados del formulario llevan icono y
  texto además del color

### Rendimiento

- Lighthouse ≥ 90 en Performance y Accessibility
- Imágenes en WebP, `srcset` por breakpoint, lazy loading bajo el pliegue
- Fuentes: solo los pesos usados, `font-display: swap`, precarga de la de H1
- Si se usa el logo animado, respetar `prefers-reduced-motion` (ya en los tokens)

### SEO

- `<title>` y meta description
- Open Graph y Twitter Card con TM-L01 sobre Blanco Espuma
- JSON-LD tipo `BarOrPub` con dirección, horarios, teléfono y geo
- `sitemap.xml` y `robots.txt`

### Privacidad

El formulario recoge nombre y teléfono: dato personal bajo la **LFPDPPP**. Aunque no haya
backend, el aviso de privacidad es obligatorio y debe enlazarse desde el formulario.
`[PENDIENTE: el negocio debe proporcionar su aviso]`

---

## 11. Bloqueadores y decisiones abiertas

| # | Tema | Necesito | Bloquea |
|---|---|---|---|
| 1 | Datos de Google Maps | Dirección, teléfono, horarios, rating | Contenido, SEO, lógica de horarios |
| 2 | **Archivos del logo** | SVG/PNG transparente reales (recibí imágenes en chat, no assets) | Header, hero, favicon, OG |
| 3 | **Variante canónica del logo** | Ver §11.1 | Consistencia visual |
| 4 | Destino de la reserva | Decisión A / B / C | Implementación del envío |
| 5 | **Botón primario en Hoja Profunda** | Visto bueno al desvío del manual (§8.2) | Sistema de botones |
| 6 | Fotografías | 6–12 imágenes en buena resolución | Galería, hero |
| 7 | Menú / carta | PDF o lista de productos y precios | Sección menú |
| 8 | Zonas reservables | ¿Cuáles son elegibles? | Campo "zona" |
| 9 | Antelación mínima | Horas antes de la reserva | Validación de hora |
| 10 | Aviso de privacidad | Texto legal | Cumplimiento LFPDPPP |
| 11 | Dominio | ¿Ya tienen uno? | Despliegue, SEO |
| 12 | Repositorio | Permiso para crear `Terraza-Mojito` en GitHub | Entrega del código |

### 11.1 Inconsistencia entre variantes del logotipo

Se recibieron tres versiones y **no son intercambiables**:

| Variante | Descripción | Estado |
|---|---|---|
| A | Ilustración plana, lettering redondeado sans, dos líneas | Coincide con el manual |
| B | Igual que A, aplicada en el manual de identidad | Coincide con el manual |
| C | Ilustración con degradados y sombreado, **lettering serif**, banda `EST. 2024` | **Contradice el manual** |

La variante C choca con dos reglas explícitas del manual: *"No reemplazar el lettering del
nombre por una fuente genérica"* y *"No usar degradados nuevos dentro del vaso o las
hojas"*. Además introduce un elemento (`EST. 2024`) que el manual no contempla.

**Recomendación:** usar A/B como versión canónica en toda la web y retirar C, o bien
actualizar el manual si C es la dirección real. No se pueden aplicar ambas.

---

## 12. Fases

| Fase | Entregable | Depende de |
|---|---|---|
| **0 — Definición** | Este PRD aprobado | Bloqueadores 1, 3, 4, 5 |
| **1 — Maqueta** | Landing estática con contenido real, sin reservas | 1, 2, 6 |
| **2 — Reservas** | Módulo completo funcionando | 4, 8, 9, 10 |
| **3 — Pulido** | SEO, accesibilidad, rendimiento, despliegue | 11 |
| **4 — Futuro** | Backend, panel de reservas, confirmación automática | Fuera de alcance |

---

## Anexo — Datos a capturar

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

---

## Referencias

- Manual de Identidad Gráfica Terraza Mojito v1.0 — 8 de agosto de 2026
- [`design-tokens.css`](./design-tokens.css) — implementación de la paleta y tipografía
- WCAG 2.1 nivel AA
