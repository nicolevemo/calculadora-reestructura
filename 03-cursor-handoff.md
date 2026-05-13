# Handoff para Cursor / Claude Code — Plataforma de Reestructura

> **Cómo usar este documento:** abrí una carpeta vacía en Cursor (ej: `reestructura-app/`). Pegá este archivo completo en el chat de Cursor como primer mensaje y pedile:
> _"Soy product manager. Necesito que scaffoldees y construyas esta webapp siguiendo este brief al pie de la letra. Empezá por el setup del proyecto y después vamos sprint por sprint."_

---

## Contexto del producto

LTO da crédito automotriz a conductores de Uber/DiDi. Cada lunes, el gestor de cartera identifica ~200 clientes con atraso de 15-60 días que son elegibles a reestructura. Hay 4 agentes de comunicación que durante lunes y martes los llaman por teléfono para negociar un "pago de intención" que dispara una reestructura del crédito (condonación parcial + diferimiento del remanente sin intereses).

Hoy todo se hace en Excel manualmente y se pierde mucha información. Necesitan una herramienta web que:

1. Permita al gestor cargar el CSV semanal de 200 clientes
2. Le muestre a los agentes un dashboard con esos clientes y sus estados
3. Tenga una calculadora que muestre en vivo cómo queda el crédito según el pago de intención que negocien
4. Genere un PDF resumen al final de la llamada para mandar al cliente por WhatsApp
5. Permita al gestor exportar los resultados por estado al final de la semana

**Hay un prototipo HTML aprobado por negocio en la carpeta padre (`prototipo-reestructura.html`).** Toda la UI, fórmulas y reglas de negocio están en ese archivo — **úsalo como fuente de verdad**.

---

## Stack obligatorio

- **Framework:** Next.js 14 (App Router) con TypeScript
- **Estilos:** Tailwind CSS + shadcn/ui para componentes base
- **Backend:** Supabase (DB + Auth + Storage) — schema ya está corrido, ver `02-supabase-schema.sql`
- **Tablas a consumir:** `profiles`, `shortlist_uploads`, `clientes`, `negociaciones`, `v_clientes_dashboard` (vista)
- **Librerías clave:**
  - `@supabase/supabase-js` y `@supabase/ssr` para el cliente
  - `papaparse` para parsear CSVs
  - `@react-pdf/renderer` para generar PDFs
  - `lucide-react` para íconos
  - `zod` para validación
  - `react-hook-form` para formularios complejos
- **Hosting:** Vercel
- **Auth:** Magic link de Supabase

---

## Variables de entorno

```env
NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
SUPABASE_SERVICE_ROLE_KEY=eyJhbGc...   # solo server-side, NO exponer
```

---

## Estructura de archivos esperada

```
reestructura-app/
├── app/
│   ├── (auth)/
│   │   └── login/page.tsx
│   ├── (app)/
│   │   ├── layout.tsx              # Sidebar + auth guard
│   │   ├── dashboard/page.tsx      # Tabla de clientes (agente)
│   │   ├── cliente/[id]/page.tsx   # Detalle con calculadora + PDF
│   │   └── gestor/
│   │       ├── cargar/page.tsx     # Upload CSV + historial
│   │       └── exportar/page.tsx   # Export por estado
│   ├── api/
│   │   ├── upload-csv/route.ts
│   │   ├── export-csv/route.ts
│   │   └── pdf/[clienteId]/route.ts
│   └── layout.tsx
├── components/
│   ├── ui/                          # shadcn components
│   ├── sidebar.tsx
│   ├── client-table.tsx
│   ├── calculator-hero.tsx
│   ├── payment-options.tsx
│   ├── deal-summary.tsx
│   ├── pdf-preview.tsx
│   └── status-dropdown.tsx
├── lib/
│   ├── supabase/
│   │   ├── client.ts                # Client component supabase
│   │   ├── server.ts                # Server component supabase
│   │   └── middleware.ts
│   ├── calculator.ts                # Fórmulas (compartido client+server)
│   ├── csv.ts                       # Parser + validator
│   ├── pdf.ts                       # PDF generator
│   ├── types.ts                     # TypeScript types
│   └── constants.ts                 # RULES, STATUS_CONFIG
├── middleware.ts                    # Auth middleware
├── tailwind.config.ts
├── tsconfig.json
├── package.json
└── .env.local
```

---

## REGLAS DE NEGOCIO CRÍTICAS — Calculadora

⚠️ **Estas fórmulas DEBEN coincidir EXACTAMENTE con el prototipo. Replicalas en `lib/calculator.ts` con tests unitarios.**

### Inputs por cliente (vienen del CSV)
- `adeudo` — Saldo Vencido (MXN)
- `semana` — Renta de la semana siguiente (MXN)
- `plazo_remanente` — Semanas restantes del contrato
- `pago_en_dia` — Boolean (si pagó algo hoy)
- `monto_pago_dia` — Monto del pago del día si aplica

### Input del agente (capturado en la llamada)
- `pago_intencion` — Monto que el cliente se compromete a pagar

### Constantes globales
```ts
export const RULES = {
  PAGO_INTENCION_MIN: 5000,           // $5,000 MXN mínimo
  PAGO_INTENCION_PCT_MAX: 0.5,        // 50% del saldo a reestructurar
  TOPE_INCREMENTAL_RENTA: 200,         // $200 MXN/semana máximo de aumento
  MAX_INTENTOS: 5,                     // máximo de llamadas sin respuesta
};
```

### Cálculos derivados
```ts
function calculate(client, pagoIntencion) {
  const saldoActual = client.pago_en_dia
    ? client.adeudo - client.monto_pago_dia
    : client.adeudo;

  const saldoAReestructurar = saldoActual + client.semana;

  const pagoIntencionMin = RULES.PAGO_INTENCION_MIN;
  const pagoIntencionMax = saldoAReestructurar * RULES.PAGO_INTENCION_PCT_MAX;

  const condonacion = pagoIntencion;  // por regla: la condonación = el pago de intención
  const remanente   = saldoAReestructurar - pagoIntencion - condonacion;

  const indicativoSemanal = remanente / client.plazo_remanente;
  const incrementoSemanal = Math.min(RULES.TOPE_INCREMENTAL_RENTA, indicativoSemanal);
  const balloon           = Math.max(0, (indicativoSemanal - incrementoSemanal) * client.plazo_remanente);
  const nuevaSemanalidad  = client.semana + incrementoSemanal;

  const isAboveMax = pagoIntencion > pagoIntencionMax;
  const isBelowMin = pagoIntencion > 0 && pagoIntencion < pagoIntencionMin;
  const isValid    = pagoIntencion >= pagoIntencionMin && pagoIntencion <= pagoIntencionMax;

  return {
    saldoActual, saldoAReestructurar,
    pagoIntencionMin, pagoIntencionMax,
    pagoIntencion, condonacion, remanente,
    indicativoSemanal, incrementoSemanal, balloon, nuevaSemanalidad,
    isAboveMax, isBelowMin, isValid,
  };
}
```

> **Nota importante para Cursor:** en el Excel original, la fórmula del Balloon estaba hardcodeada como `(indicativo - incremento) * 100`. El PM ya validó que el `100` es un bug y debe ser `plazo_remanente`. Usar la fórmula corregida (la de arriba).

---

## Estados y transiciones

```ts
export const STATUS = {
  listo_contactar:   { label: 'Listo para contactar', color: 'gray'   },
  sin_respuesta:     { label: 'Sin respuesta',         color: 'amber'  },
  en_negociacion:    { label: 'En negociación',        color: 'blue'   },
  aceptado:          { label: 'Aceptado',              color: 'green'  },
  rechazado:         { label: 'Rechazado',             color: 'red'    },
  necesita_revision: { label: 'Necesita revisión',     color: 'purple' },
} as const;
```

**Reglas de transición:**
- Al cargar un cliente desde CSV, su estado inicial es `listo_contactar` (esto ya lo hace un trigger en la DB).
- Cuando el agente lo marca como `sin_respuesta`, el contador `intentos` se incrementa en 1 (max 5).
- `en_negociacion`, `aceptado`, `rechazado` y `necesita_revision` se pueden seleccionar libremente desde el dropdown.
- Solo cuando el estado es `rechazado`, mostrar el dropdown de `motivo_rechazo`.
- Solo cuando el estado es `aceptado` o `en_negociacion`, requerir `fecha_compromiso`.
- Cualquier cambio de estado se loggea automáticamente en `actividad_log` (trigger en la DB lo hace).

---

## Columnas esperadas del CSV

```
af, nombre, telefono, vehiculo, plataforma, bucket, origination_date,
adeudo, semana, plazo_remanente, pago_en_dia, monto_pago_dia,
api_uber, api_didi, ingresos_api, viajes_api, ci, energia_adicional
```

- `pago_en_dia`, `api_uber`, `api_didi` aceptan `SI`/`NO` y deben convertirse a boolean.
- `origination_date` viene como `DD/MM/YYYY` o ISO.
- Hacer **preview de 5 filas antes de confirmar la carga**. Validar columnas obligatorias con zod. Si faltan campos, mostrar error claro.

---

## Páginas a construir

### `/login`
Magic link con un solo input de email. Botón "Enviar link de acceso". Tras click muestra "Revisá tu mail".

### `/dashboard` (default landing)
- Sidebar fijo con navegación
- Top: 5 stat cards (Total, Pendientes, En Negociación, Aceptados, Sin respuesta)
- Filter chips por estado con contadores
- Search box por nombre o AF
- Tabla con columnas: Cliente, AF, Saldo Vencido, Bucket, Plataforma, API, Estado (badge), Compromiso, Pago Intención, Última actividad
- Click en fila → navega a `/cliente/[id]`
- Botón export (solo visible para gestor)

### `/cliente/[id]`
**Replicar el split-screen del prototipo:**

**Topbar:** fecha de hoy a la izquierda, dropdown de estado al centro, botón "Guardar cambios" arriba a la derecha.

**Header:** nombre del cliente grande, debajo AF + Vehículo + Plataforma + Teléfono, badge con estado actual.

**Izquierda (orden top-down):**
1. **Hero card con gradiente morado** mostrando "Saldo a Reestructurar" en grande, con desglose Adeudo + Semana siguiente, y Plazo Remanente al lado.
2. **Pago de Intención** — card con 4 botones de presets (Mínimo, ~40%, ~70%, Tope máximo) calculados dinámicamente. Input grande para custom amount. Legend abajo que muestra el rango permitido y valida en vivo (rojo si excede, verde si OK).
3. **Resumen del acuerdo** — tabla con Pago Intención, Condonación, Remanente, Pago semanal indicativo, Incremento Semanal (highlight), Balloon, Nueva Semanalidad (total).
4. **Estado extra** condicional (intentos / motivo rechazo).
5. **Notas de la llamada** — textarea.
6. **Información adicional del cliente** — card colapsable con 4 columnas chiquitas de info.
7. **Fecha de compromiso del Pago** — date picker.

**Derecha (sticky):** PDF preview que se actualiza en vivo cada vez que cambia el pago de intención. Arriba "Enviar por WhatsApp" button.

⚠️ **BUG CRÍTICO A EVITAR:** el input del pago de intención NO debe re-renderizarse en cada keystroke. Si lo hacés con `useState` y re-renderizás todo el HTML cuando cambia, vas a perder el foco al tipear números seguidos. **Solución:** mantené el input como un componente estable y solo actualizá los valores calculados que dependen de él. Mira `prototipo-reestructura.html` función `handlePIInput` para referencia.

### `/gestor/cargar`
- Dropzone para CSV
- Preview de 5 filas + validación de columnas
- Historial de cargas con: filename, fecha, gestor, # clientes, estado
- Solo accesible si `role === 'gestor'` o `admin`

### `/gestor/exportar`
- Botones por estado que descargan CSV con todas las columnas calculadas
- Filtro por upload/semana

---

## Sprints recomendados

### Sprint 1 (1-2 días): Setup + Auth
- `npx create-next-app@latest reestructura-app --typescript --tailwind --app`
- Instalar `shadcn/ui` y configurar tema
- Instalar Supabase client
- Página `/login` con magic link
- Middleware con auth guard
- Layout con sidebar
- Dashboard vacío que diga "Hola {full_name}, rol: {role}"

### Sprint 2 (3-4 días): Carga CSV + Dashboard
- Página `/gestor/cargar` funcional (parser CSV, validación, insert a Supabase)
- Dashboard que lee `v_clientes_dashboard` y muestra tabla con filtros y search
- Stat cards arriba

### Sprint 3 (3-4 días): Detalle + Calculadora
- Página `/cliente/[id]` con todo el layout del prototipo
- `lib/calculator.ts` con fórmulas + tests
- Hero card, payment options, deal summary, dropdown de status, fecha de compromiso
- Save: persiste a `negociaciones`

### Sprint 4 (2-3 días): PDF + WhatsApp + Export
- Generar PDF con `@react-pdf/renderer` usando datos de la negociación
- Subir PDF a Supabase Storage y guardar path en `negociaciones.pdf_storage_path`
- Botón "Enviar por WhatsApp" abre `https://wa.me/{telefono}?text={mensaje + link al PDF}`
- Endpoint `/api/export-csv?status=aceptado` que devuelve CSV con todos los campos calculados

---

## Estilo visual

**Colores (Tailwind config):**
- Primary: indigo-600 (`#4f46e5`)
- Hero gradient: `from-indigo-600 via-indigo-500 to-indigo-400`
- Green (aceptado): `#10b981`
- Amber (sin respuesta): `#f59e0b`
- Blue (en negociación): `#3b82f6`
- Red (rechazado): `#ef4444`
- Purple (necesita revisión): `#8b5cf6`
- Gray (listo contactar): `#6b7280`

**Tipografía:** SF Pro / Inter en general. `tabular-nums` para montos.

**Border radius:** `rounded-lg` (8px) para cards, `rounded-xl` (12px) para hero card.

**Componentes shadcn a usar:** Button, Input, Select, Badge, Card, Dialog, Toast, Tabs, Table.

---

## Datos de muestra (para testing local)

Ver las primeras 20 filas en `prototipo-reestructura.html`, variable `SAMPLE_CLIENTS`. Son datos reales del shortlist del piloto.

---

## Lo que NO está en el MVP (próxima fase)

- Flujo posterior al "Aceptado" (esperando pago, firma de CSC, suspensión de AF)
- Integración con AirCall para grabaciones de llamada
- Sub-asignación de clientes por agente (todos ven todos)
- Notificaciones push o por email
- API oficial de WhatsApp Business (usamos wa.me por ahora)
- Dashboard ejecutivo con métricas de conversión

---

## Checklist de aceptación del MVP

- [ ] Login con magic link funciona en producción
- [ ] El rol `gestor` ve `/gestor/cargar` y el rol `agente` no
- [ ] Subir un CSV de 200 filas inserta 200 clientes y 200 negociaciones
- [ ] El dashboard filtra por estado correctamente
- [ ] La calculadora muestra los valores correctos para todos los casos del prototipo
- [ ] El input de pago de intención NO pierde foco al tipear
- [ ] Validaciones de mínimo $5K y máximo 50% funcionan
- [ ] Cambiar el estado a "sin_respuesta" incrementa intentos
- [ ] El PDF se genera con todos los datos correctos
- [ ] El botón de WhatsApp abre con teléfono y mensaje pre-cargado
- [ ] Export por estado descarga CSV con campos calculados
- [ ] Deploy en Vercel funcional con dominio
- [ ] Tests unitarios de la calculadora pasan

---

**Cualquier ambigüedad: priorizá el comportamiento del prototipo HTML (`prototipo-reestructura.html`).**
