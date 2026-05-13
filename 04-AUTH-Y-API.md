# 04 — Acceso por Invitación + API para Cobranzas

> Complemento al plan original (`01-PLAN-IMPLEMENTACION.md`). Acá dejo el diseño de las dos features que agregamos: login restringido por invitación y API REST para que cobranzas consulte la data. Schema SQL adicional en `04-supabase-schema-addendum.sql`.

---

## Resumen

| Feature | Para qué | Cuándo construir |
|---------|----------|------------------|
| Acceso por invitación | Solo personas autorizadas pueden entrar. Vos invitás desde un admin UI. | Sprint 5, después del MVP funcional |
| API REST + API keys | Cobranzas consulta cliente y negociación desde su sistema. | Sprint 6, después de invitaciones |

Total adicional: **~1 semana** de desarrollo. Cero infra extra.

---

## Decisiones de diseño

**Para invitación — qué elegí y qué descarté:**
- ✅ **Allowlist + magic link**: vos administrás una lista de emails autorizados desde un panel. Cuando alguien intenta entrar y su email no está → rechazo. Cuando está → magic link a su correo.
- ❌ SSO con Google Workspace: requiere coordinación con IT y aprobación de Vemo. No vale la pena para 4-8 usuarios al inicio.
- ❌ 2FA obligatorio: fricción extra para los agentes. Supabase lo soporta nativo, lo activamos en v2 si lo piden.

**Para API — pull vs push:**
- ✅ **REST API con bearer token (pull)**: cobranzas llama cuando quiere. Simple de construir y de consumir. Funciona desde día 1.
- ⏸️ **Webhook (push)**: lo dejo para v2. Requiere que cobranzas tenga un endpoint listo, manejar reintentos, validar firmas. Más complejo de los dos lados. Si lo piden, lo agregamos sin romper la API.

**Por qué pull primero:** ellos controlan la frecuencia (cada 15 min, on-demand, lo que les sirva), no necesitan endpoint propio, y el endpoint `/changes?since=...` ya les da lo que necesitan para sync incremental.

---

# Parte 1 — Acceso por invitación

## Cómo funciona (flujo del usuario)

1. Como admin entrás a `/admin/usuarios`.
2. Click "+ Invitar usuario" → modal con email + rol (agente/gestor/admin).
3. Se inserta una fila en `invited_users` y Supabase manda un magic link al email.
4. La persona hace click en el link → se loguea → se le crea perfil con el rol que vos pre-asignaste.
5. Si alguien intenta entrar con un email NO invitado → bloqueado por configuración de Supabase (signups desactivados).
6. Vos podés revocar acceso desde la misma página: borra el `auth.users` row y `accepted_at` queda como historial.

## Setup en Supabase (cambios manuales)

En el dashboard de Supabase del proyecto:

1. **Authentication → Sign In / Up → Email**:
   - "Enable email signups" → **OFF** (sólo magic link vía nuestro endpoint admin)
   - "Confirm email" → OFF (magic link no lo necesita)
2. **Authentication → URL Configuration**: agregá tu URL de Vercel a las redirect URLs permitidas.
3. **Authentication → Settings → Auth Providers**: si querés agregar restricción por dominio (`@vemo.com.mx`), se puede hacer en una Edge Function del auth hook, pero con allowlist explícito ya es suficiente.

## Página a construir: `/admin/usuarios`

Solo accesible si `role === 'admin'`. Requiere:

**Tabla con columnas:** Email · Rol · Nombre · Invitado por · Invitado el · Estado (Pendiente / Activo / Revocado) · Acciones

**Modal "Invitar usuario":**
- Input email (validación: si querés, restringí dominio a `@vemo.com.mx`)
- Select rol: agente / gestor / admin
- Input nombre completo (opcional)
- Botón "Enviar invitación"

**Acciones por fila:**
- "Re-enviar invitación" → vuelve a mandar el magic link
- "Revocar acceso" → marca `revoked_at` + elimina sesiones activas del usuario

## Endpoints a construir (Next.js API routes)

### `POST /api/admin/invite`
Body: `{ email, role, full_name? }`

Lógica:
1. Verificar que el caller es admin (cookie de Supabase + check de `role`)
2. Insertar en `invited_users` (upsert por email)
3. Llamar `supabaseAdmin.auth.admin.inviteUserByEmail(email, { redirectTo: ... })`
4. Devolver `{ success: true }`

### `POST /api/admin/revoke`
Body: `{ user_id }`

Lógica:
1. Verificar admin
2. Marcar `invited_users.revoked_at = now()`
3. Llamar `supabaseAdmin.auth.admin.deleteUser(user_id)`

## Lo que NO hay que construir

- Página de registro: no existe, sólo magic link
- Reseteo de password: no hay password
- Verificación de email: el click en magic link la hace implícita
- 2FA: pendiente para v2

---

# Parte 2 — API REST para Cobranzas

## Cómo funciona

1. Vos generás una API key desde `/admin/api-keys` y se la pasás al equipo de cobranzas (por canal seguro: 1Password, no por mail).
2. Ellos hacen requests HTTPS con `Authorization: Bearer <key>`.
3. 4 endpoints disponibles, todos read-only.
4. Cada request loguea uso en `api_usage_log` para auditoría.

## Endpoints

Base URL: `https://reestructura-app.vercel.app/api/v1`

### `GET /clientes`
Lista paginada de clientes con su negociación.

**Query params:**
- `status` (opcional): `aceptado` · `rechazado` · `en_negociacion` · etc.
- `since` (opcional): ISO timestamp, sólo clientes con actividad después de esta fecha
- `limit` (default `50`, max `200`)
- `offset` (default `0`)

**Response 200:**
```json
{
  "data": [
    {
      "af": "5730AF",
      "nombre": "MATA MARTINEZ JOSUE JUAN",
      "telefono": "5512345001",
      "vehiculo": "AION ES",
      "plataforma": "Uber",
      "bucket": "30 A 60",
      "adeudo": 44808.93,
      "semana": 6866.64,
      "plazo_remanente": 178,
      "status": "aceptado",
      "intentos": 0,
      "pago_intencion": 6450,
      "fecha_compromiso": "2026-05-13",
      "calculo": {
        "saldo_a_reestructurar": 51675.57,
        "condonacion": 6450,
        "remanente": 38775.57,
        "incremento_semanal": 200,
        "nueva_semanalidad": 7066.64,
        "balloon": 2911.17
      },
      "last_activity_at": "2026-05-11T10:24:00Z"
    }
  ],
  "pagination": { "total": 200, "limit": 50, "offset": 0 }
}
```

### `GET /clientes/:af`
Detalle de un cliente por su número de AF.

**Response 200:** mismo objeto que el item de `/clientes`.
**Response 404:** `{ "error": "Cliente no encontrado" }`

### `GET /clientes/:af/negociacion`
Sólo la parte de negociación (status, pago, fechas, notas).

### `GET /changes?since=<ISO timestamp>`
Cambios incrementales — útil para sync cada N minutos desde cobranzas.

**Response 200:**
```json
{
  "changes": [
    {
      "af": "5730AF",
      "accion": "status_change",
      "estado_anterior": "en_negociacion",
      "estado_nuevo": "aceptado",
      "timestamp": "2026-05-11T10:24:00Z"
    },
    {
      "af": "4674AF",
      "accion": "pago_intencion_set",
      "payload": { "pago_intencion": 5000 },
      "timestamp": "2026-05-11T11:02:00Z"
    }
  ]
}
```

## Auth

```
Authorization: Bearer rest_live_a8f3b2c1d4e5f6...
```

- Falta el header o es inválido → `401 Unauthorized`
- Key revocada → `403 Forbidden`
- Resource no encontrado → `404 Not Found`
- Server error → `500 Internal Server Error`

## Página a construir: `/admin/api-keys`

Solo accesible si `role === 'admin'`.

**Tabla:** Nombre · Prefix (`rest_live_a8f3...`) · Creada por · Creada el · Último uso · Status (activa / revocada)

**Crear key:**
- Modal con `name` (ej: "Cobranzas — Producción") y opcionalmente `notes`
- Al crear, generar key plaintext de 32 chars random (`rest_live_` + base62)
- Mostrar la key **una sola vez** con warning grande: "Guardala ahora, no la vas a poder ver de nuevo. Cópiala a tu password manager."
- Guardar SHA-256 del plaintext en la DB (nunca el plaintext)

**Revocar key:**
- Marca `revoked_at = now()`
- Inmediatamente cualquier request con esa key devuelve `403`

## Middleware de auth (Next.js)

```ts
// lib/api/auth.ts
import { createHash } from 'crypto';
import { supabaseAdmin } from '@/lib/supabase/admin';

export async function authenticateApiKey(request: Request) {
  const auth = request.headers.get('authorization');
  if (!auth?.startsWith('Bearer ')) return null;

  const key = auth.slice(7);
  const hash = createHash('sha256').update(key).digest('hex');

  const { data } = await supabaseAdmin
    .from('api_keys')
    .select('*')
    .eq('key_hash', hash)
    .is('revoked_at', null)
    .single();

  if (!data) return null;

  // Update last_used_at (fire and forget)
  supabaseAdmin
    .from('api_keys')
    .update({ last_used_at: new Date().toISOString() })
    .eq('id', data.id)
    .then();

  return data;
}
```

Cada handler de `/api/v1/...` empieza con:
```ts
export async function GET(request: Request) {
  const key = await authenticateApiKey(request);
  if (!key) return Response.json({ error: 'Unauthorized' }, { status: 401 });
  // ... lógica
}
```

## Documentación que le pasás a cobranzas

Un solo PDF/email con:
- Base URL
- Cómo configurar el header de auth
- Los 4 endpoints con ejemplo de request y response
- Recomendación de frecuencia de polling (cada 15 min con `/changes?since=` les sobra)
- Email de contacto para soporte y para rotar la key

Si querés te armo esa hoja aparte, decime.

---

## Sprints adicionales sobre el plan original

### Sprint 5 — Invitaciones (2-3 días)
- [ ] Correr `04-supabase-schema-addendum.sql` en Supabase
- [ ] Configurar Supabase Auth (disable signups, etc)
- [ ] Construir `/admin/usuarios`
- [ ] Endpoint `POST /api/admin/invite` y `/api/admin/revoke`
- [ ] Verificar que un email no invitado no puede entrar
- [ ] Invitar a vos misma como admin, después invitar a los 4 agentes

### Sprint 6 — API REST (2-3 días)
- [ ] Construir `/admin/api-keys`
- [ ] 4 endpoints REST con auth por bearer token
- [ ] Log de uso en `api_usage_log`
- [ ] Documentación para cobranzas
- [ ] Generar primera key y entregarla por canal seguro

---

## Apéndice — Prompt complementario para Cursor

Cuando llegues al Sprint 5/6 (después de tener el MVP funcionando), pegale a Cursor:

> Voy a agregar dos features adicionales a la app: (1) sistema de acceso restringido por invitación con tabla `invited_users` y página admin `/admin/usuarios`. (2) API REST `/api/v1/...` con auth por bearer token, gestionable desde `/admin/api-keys`. El diseño completo está en `04-AUTH-Y-API.md` y el schema SQL adicional en `04-supabase-schema-addendum.sql` (ya corrido en Supabase). Implementá ambos sprints siguiendo el doc al pie, respetando las decisiones de seguridad: hashes SHA-256 para API keys (nunca guardar plaintext), validación de admin en cada endpoint sensible, y RLS en las tablas nuevas.

---

*Documento generado el 2026-05-11.*
