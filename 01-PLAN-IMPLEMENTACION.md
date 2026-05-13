# Plan de Implementación — Plataforma de Reestructura

> Documento master para llevar el prototipo aprobado a producción.
> **Tiempo total estimado a primer lunes en operación: 2-3 semanas.**

---

## Resumen ejecutivo

Tenemos un prototipo HTML validado con negocio (`prototipo-reestructura.html`). Ahora hay que productizarlo en una webapp real con base de datos, autenticación, deploy y ponerla a operar con los agentes el lunes siguiente al deploy.

**Stack elegido:**

- Frontend: Next.js 14 (App Router) + TypeScript + Tailwind CSS
- Backend: Supabase (Postgres + Auth + Storage)
- Deploy: Vercel (auto-deploy desde GitHub)
- AI coding: Cursor (recomendado) o Claude Code

**Por qué este stack:** es el camino más corto y barato a producción. Supabase resuelve DB + Auth + Storage sin servidor. Vercel hace deploy automático desde Git. Next.js + Tailwind te deja replicar la UI del prototipo casi 1:1. Todo el ecosistema está bien documentado y los modelos de IA (Cursor/Claude Code) generan muy buen código sobre este stack.

---

## Pre-requisitos (haz esto primero — 30 min)

1. **Crear cuenta en GitHub** (gratis) → [https://github.com/signup](https://github.com/signup)
2. **Crear cuenta en Supabase** (gratis hasta 500MB) → [https://supabase.com/dashboard/sign-up](https://supabase.com/dashboard/sign-up)
3. **Crear cuenta en Vercel** (gratis para proyectos pequeños) → [https://vercel.com/signup](https://vercel.com/signup) — vincula tu GitHub
4. **Instalar Cursor** (gratis) → [https://cursor.com](https://cursor.com) — o usar Claude Code en terminal
5. **Instalar Node.js LTS** (si no lo tenés) → [https://nodejs.org](https://nodejs.org)

Mientras esperás aprobaciones de cuentas corporativas, podés ir leyendo este documento y los archivos `02-supabase-schema.sql` y `03-cursor-handoff.md`.

---

## Fase 1 — Base de datos en Supabase (45 min)

1. En Supabase → New Project → ponele un nombre (`reestructura-prod`), elegí región más cercana (us-east-1), guarda la contraseña de la DB en tu password manager.
2. Esperá ~2 min que termine de provisionar.
3. Abrí **SQL Editor** → New query → pegá todo el contenido de `02-supabase-schema.sql` → Run.
4. Verificá en **Table Editor** que aparezcan: `profiles`, `shortlist_uploads`, `clientes`, `negociaciones`, `actividad_log`.
5. En **Authentication → Providers**, dejá habilitado Email (Magic Link). Desactivá "Confirm email" para los primeros tests.
6. En **Authentication → URL Configuration**, agregá `http://localhost:3000` y luego tu URL de Vercel.
7. En **Storage**, creá un bucket privado llamado `csv-uploads` y otro `pdfs-generados`.
8. En **Project Settings → API**, copiá `Project URL` y `anon public key`. Los vas a usar en `.env.local`.

> ⚠️ **No publiques el `service_role key`.** Solo se usa server-side.

---

## Fase 2 — Setup del proyecto local (1 hora)

1. Abrí Cursor en una carpeta nueva (`reestructura-app`).
2. En el chat de Cursor, pegá el contenido completo de `03-cursor-handoff.md` como primer mensaje. Pedile: *"Scaffoldeá el proyecto Next.js siguiendo este brief."*
3. Cursor te va a generar `package.json`, configurar Tailwind, instalar Supabase client, crear las páginas base y los componentes.
4. Crea un archivo `.env.local` en la raíz:
  ```
   NEXT_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGc...
  ```
5. Corré `npm install` y después `npm run dev`. Abrí `http://localhost:3000`.
6. Probá: registrarte con tu email, recibir magic link, entrar al dashboard vacío.

---

## Fase 3 — Desarrollo iterativo (1-2 semanas)

Sugiero romper el desarrollo en **4 sprints chicos** que vayan funcionando end-to-end. No tratés de hacer todo en uno, vas a perderte. Cada sprint debe terminar con algo testeable.

### Sprint 1 — Auth + Dashboard vacío (1-2 días)

- Login con magic link funcionando
- Página `/dashboard` muestra "Hola {nombre}" con sidebar y rol detectado
- Tabla `profiles` se popula automáticamente al primer login (con trigger o en el callback)
- Switching de rol para testing (asigná manualmente el rol "gestor" a tu user en Supabase Table Editor)

### Sprint 2 — Carga CSV + Listado de clientes (3-4 días)

- Vista `/gestor/cargar` con dropzone que acepta CSV
- Parser de CSV en el cliente con `papaparse`
- Insertar clientes en la DB (la negociación se crea automáticamente por trigger)
- Vista `/dashboard` lee `v_clientes_dashboard` y muestra la tabla con filtros por estado
- Search bar por nombre/AF funcionando

### Sprint 3 — Detalle del cliente + Calculadora (3-4 días)

- Vista `/cliente/[id]` replicando el split-screen del prototipo
- Hero card con Saldo a Reestructurar
- Botones de opciones de pago (presets dinámicos)
- Input que **NO se rompe al tipear** (atención al bug que ya resolvimos en el prototipo: no re-render el input, solo los valores calculados)
- Validación en vivo de mínimo $5K y máximo 50% del saldo
- Resumen del acuerdo con todas las fórmulas (ver `03-cursor-handoff.md` sección Calculadora)
- Status dropdown arriba, save top-right, fecha hoy arriba, fecha de compromiso abajo

### Sprint 4 — PDF + WhatsApp + Export (2-3 días)

- Generación de PDF con `react-pdf` o `@react-pdf/renderer`
- Botón "Enviar por WhatsApp" abre `https://wa.me/{telefono}?text=...` con el link al PDF
- Export por estado descarga CSV con todos los campos calculados
- Página `/gestor/cargar` con historial de uploads

### Sprint 5 — Acceso por invitación (2-3 días)

- Correr `04-supabase-schema-addendum.sql` en Supabase
- Configurar Supabase Auth: disable email signups públicos
- Construir `/admin/usuarios` con tabla, modal de invitación, acciones de revocar y re-enviar
- Endpoints `POST /api/admin/invite` y `POST /api/admin/revoke`
- Validar que un email no invitado no puede crear cuenta
- Detalle en `04-AUTH-Y-API.md`

### Sprint 6 — API REST para Cobranzas (2-3 días)

- Construir `/admin/api-keys` con creación (mostrar plaintext una sola vez), revocación, historial de uso
- 4 endpoints REST: `GET /api/v1/clientes`, `/clientes/:af`, `/clientes/:af/negociacion`, `/changes?since=`
- Middleware de auth con bearer token (SHA-256 hash en DB)
- Logging en `api_usage_log`
- Documentación lista para entregar a cobranzas
- Detalle en `04-AUTH-Y-API.md`

> **Tip:** después de cada sprint, hacé deploy a Vercel y mandá el link al equipo para testeo informal. Los errores se ven más rápido en producción que pidiendo a alguien que abra `localhost`.

> **Nota:** los Sprints 5 y 6 se pueden hacer en paralelo con el lanzamiento operativo si el equipo de cobranzas no necesita la API la primera semana. El Sprint 5 (invitaciones) sí es bloqueante: hay que tenerlo listo antes de que entren los 4 agentes a producción.

---

## Fase 4 — Deploy a Vercel (30 min)

1. En la carpeta del proyecto: `git init && git add . && git commit -m "Initial commit"`.
2. En GitHub, creá un repo nuevo `reestructura-app` (privado).
3. `git remote add origin https://github.com/tu-org/reestructura-app.git && git push -u origin main`.
4. En Vercel → Add New → Project → importá el repo de GitHub.
5. En la pantalla de configuración, agregá las variables de entorno (las mismas de `.env.local`).
6. Deploy. En ~2 min tenés URL pública (`reestructura-app.vercel.app`).
7. Copiá esa URL y agregala en Supabase → Auth → URL Configuration.
8. Configurá un dominio custom después si lo necesitás (ej: `reestructura.tudominio.com`).

A partir de acá: cada `git push` a `main` deploya automáticamente. Branches deployan en preview URLs (útil para revisar cambios antes de mergear).

---

## Fase 5 — Lanzamiento operativo (1 semana)

### Día -3 (Viernes previo)

- Crear cuentas en la plataforma para los 4 agentes (Aarón, Pablo, Caloca, etc) → invitar por magic link
- Cargar el primer shortlist real (200 clientes) en la plataforma
- Test interno: vos llamás a 1-2 clientes con la herramienta para detectar fricciones

### Día -1 (Domingo)

- Training de 30 min con los 4 agentes por video. Comparten pantalla, vos los guiás:
  - Login con magic link
  - Ver dashboard, filtrar por "Listo para contactar"
  - Click en cliente, simular llamada, capturar estado
  - Negociar pago de intención y enviar PDF
- Crear un grupo de WhatsApp solo para reportar bugs de la herramienta esa semana
- Dejar el shortlist cargado y los 4 agentes con acceso

### Día 0 (Lunes)

- 9:00 AM — Standup de 15 min para alinear ("hoy hacen 100 llamadas")
- Vos monitoreás Supabase Table Editor en `negociaciones` para ver actividad en vivo
- Vos disponible en el grupo de WhatsApp para reportes de bugs
- Hacés hotfixes en Cursor → git push → auto-deploy a Vercel en 2 min

### Día 1 (Martes)

- Repetir 100 llamadas restantes
- 5 PM — Retro con agentes: ¿qué falta, qué sobra, qué falla?
- Anotás en Linear/Notion el backlog de mejoras

### Día 2 (Miércoles)

- Caloca exporta los aceptados/comprometidos
- Empieza el flujo posterior (segunda parte que NO está en el MVP)

### Semana 2

- Iterar sobre el feedback de los agentes
- Empezar a diseñar la "Fase 2" del flujo: esperando pago, firma de CSC, suspensión de AF

---

## Decisiones técnicas que tomé por defecto (podés cambiar)


| Tema                  | Default elegido                                            | Alternativa                                                       |
| --------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------- |
| Auth                  | Magic link por email                                       | Google SSO si tu empresa lo permite                               |
| WhatsApp              | Link `wa.me` que abre WhatsApp Web con mensaje pre-cargado | API oficial de WhatsApp Business (semanas de aprobación con Meta) |
| PDF                   | Generado client-side con react-pdf                         | Server-side con Puppeteer si quieres más complejo                 |
| Mock data en sprint 1 | Sí, mientras se construye la conexión a DB                 | Conectar a Supabase desde el día 0                                |
| Hosting de PDFs       | Supabase Storage bucket `pdfs-generados`                   | S3 propio o no guardar, regenerar siempre                         |
| Logging               | Console + tabla `actividad_log`                            | Sentry para errores en prod                                       |


---

## Costos estimados

- Supabase Free tier: $0 (suficiente para los primeros 200 clientes/semana)
- Vercel Hobby: $0 (alcanza para tráfico interno)
- GitHub Free: $0 (private repos ilimitados)
- Cursor Pro: $20/mes (vale la pena, los autocompletes son mucho mejores)
- Dominio custom: $12/año (opcional)

**Total para empezar: ~$20/mes.** Cuando crezcan a 1000+ clientes/semana o más agentes, Supabase Pro son $25/mes.

---

## Riesgos y mitigaciones


| Riesgo                                           | Mitigación                                                                                    |
| ------------------------------------------------ | --------------------------------------------------------------------------------------------- |
| El agente pierde conexión a mitad de una llamada | Save automático cada cambio (no solo al hacer click en "Guardar")                             |
| Dos agentes llaman al mismo cliente              | Columna `assigned_to` + lock visual ("Andrea está editando")                                  |
| El CSV viene con formato distinto cada semana    | Validación estricta de columnas al subir + preview antes de confirmar                         |
| Fórmula del balloon difiere del Excel            | Confirmar con Pablo/Aarón cuál es la correcta antes de codear (ya lo flagueé en el prototipo) |
| Auth se rompe en producción                      | Verificar URL configuration en Supabase Auth incluye dominio de Vercel                        |
| Agentes no se acuerdan cómo usar la plataforma   | Loom de 5 min embebido en el dashboard como ayuda                                             |


---

## Checklist de "listo para producción"

- Schema corrido en Supabase
- 4 agentes invitados con sus roles correctos
- Magic link funciona en producción
- CSV de prueba subido y mostrando 200 clientes
- Calculadora valida $5K mínimo y 50% máximo
- PDF se genera con datos correctos
- Export por estado descarga CSV completo
- URL de Vercel agregada en Supabase Auth
- Grupo de WhatsApp para soporte creado
- Training de 30 min agendado con agentes
- Backup manual del CSV crudo guardado en algún lado

---

## Anexos en esta carpeta

- `02-supabase-schema.sql` — Schema completo de la DB, listo para pegar en Supabase SQL Editor.
- `03-cursor-handoff.md` — Brief detallado para feedear a Cursor o Claude Code y que scaffolde el MVP.
- `04-AUTH-Y-API.md` — Diseño de Sprint 5 (acceso por invitación) y Sprint 6 (API REST para cobranzas).
- `04-supabase-schema-addendum.sql` — Tablas adicionales para invitaciones y API keys (correr DESPUÉS del schema principal).

Y en la carpeta padre tenés:

- `prototipo-reestructura.html` — el prototipo aprobado, **fuente de verdad de la UI y reglas de negocio**.

---

*Documento generado el 2026-05-11. Si algo de esto cambia (nuevos requisitos, decisiones distintas), actualizá este archivo para que el siguiente sprint arranque desde el estado correcto.*