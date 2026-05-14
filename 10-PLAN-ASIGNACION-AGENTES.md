# Plan: asignación de clientes a agentes

## Objetivo

Asignar cada cliente a un agente de comunicación desde el **dashboard** y el **detalle**, con registro persistente en backend (no solo en el front).

## Modelo de datos

| Concepto | Tabla / campo | Uso |
|----------|----------------|-----|
| Invitación | `invited_users` | Quién fue invitado, rol, `accepted_at`, `revoked_at` |
| Usuario activo | `profiles` | Cuenta con rol (`agente`, `gestor`, `admin`) |
| Asignación actual | `negociaciones.assigned_to` | Agente responsable del caso |
| Auditoría | `actividad_log` | Cambios de asignación (`assignment_change`) |

No se agrega campo de agente en `clientes`. La vista `v_clientes_dashboard` ya expone `assigned_to` y `assigned_to_name`.

Opcional en `negociaciones`: `assigned_at`, `assigned_by` (quién asignó y cuándo).

## Selector de agentes

Fuente: `profiles` con `role = 'agente'`, excluyendo emails con `invited_users.revoked_at` activo.

`invited_users` sirve para la pantalla Invitar; el dropdown de asignación usa perfiles activos.

## Permisos (MVP)

| Rol | Ver asignación | Cambiar asignación |
|-----|----------------|-------------------|
| `admin` / `gestor` | Todos | Cualquier agente o “Sin asignar” |
| `agente` | Todos | Solo lectura |

RLS: actualizar `assigned_to` (y columnas de auditoría) solo `gestor`/`admin`. El resto del `UPDATE` de negociación sigue para agentes autenticados.

## API / servidor

- `GET /api/assignable-agents` — lista para selects.
- `PATCH /api/negociacion/assign` — `negociacionId`, `clienteId`, `assignedTo` (`uuid | null`). Rechazar clientes exportados.

Asignación separada de `saveNegociacion` (sin aviso de cambios sin guardar del formulario de llamada).

## UI

- **Dashboard:** columna “Asignado a”, filtro Todos / Sin asignar / Mis clientes (agente). Solo lectura si exportado.
- **Detalle:** selector arriba a la derecha.
- **Invitar:** columna “En plataforma” (join `profiles` por email).

## Orden de implementación

1. Permisos + migración SQL `11-assignment-audit.sql`
2. Endpoints + mejoras Invitar
3. Dashboard (columna + filtros)
4. Detalle (selector)
5. Pruebas manuales y ajustes RLS

## Riesgos

- Invitado aceptado sin `profiles` → no aparece en el selector.
- Revocado con sesión vieja → validar en backend.
- Reasignación concurrente → último guardado gana.

## Deploy y commits

Commits y deploy a Vercel los hace el equipo manualmente.
