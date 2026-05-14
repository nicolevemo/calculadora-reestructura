# API v1 — Integración de lectura (clientes y negociación)

Documento para consumo interno por otro sistema (snapshot completo, solo lectura).

## Resumen

| Tema | Detalle |
|------|---------|
| Base URL (producción) | `https://calculadora-reestructura.vercel.app/api/v1` |
| Formato | JSON (`Content-Type: application/json`) |
| Métodos | Solo `GET` |
| Autenticación | No requerida (uso interno entre productos Vemo) |
| Alcance | Todo el universo de clientes en `v_clientes_dashboard` (incluye exportados y no exportados) |
| Cálculos | Mismos montos que el export CSV de la calculadora |

## Endpoints

| Método | Ruta | Uso |
|--------|------|-----|
| `GET` | `/clientes` | Listado paginado del universo |
| `GET` | `/clientes/:af` | Detalle de un cliente por AF |
| `GET` | `/clientes/:af/negociacion` | Solo datos de negociación |
| `GET` | `/changes?since=` | Cambios en `actividad_log` desde un timestamp |

---

## 1. Listado de clientes

`GET /api/v1/clientes`

### Query params (opcionales)

| Parámetro | Tipo | Default | Descripción |
|-----------|------|---------|-------------|
| `status` | string | — | Filtra por estado de negociación (ver tabla de estados) |
| `since` | ISO 8601 | — | Solo filas con `last_activity_at >= since` |
| `limit` | entero | `50` | Máximo `200` por página |
| `offset` | entero | `0` | Desplazamiento para paginación |

### Snapshot completo

Para traer todo el universo, paginar hasta agotar resultados:

1. Llamar con `limit=200` y `offset=0`.
2. Leer `pagination.total`, `pagination.limit` y `pagination.offset`.
3. Repetir aumentando `offset` en pasos de `limit` hasta que `offset + limit >= total` o `data` venga vacío.

Ejemplo:

`GET /api/v1/clientes?limit=200&offset=0`

### Respuesta 200

```json
{
  "data": [
    {
      "id": "uuid-cliente",
      "negociacion_id": "uuid-negociacion",
      "af": "4573",
      "nombre": "Marcela Camara",
      "telefono": "5512345678",
      "vehiculo": "Tesla Model 3",
      "plataforma": "Uber",
      "bucket": null,
      "originacion_vehiculo": "used",
      "adeudo": 37000,
      "semana": 4000,
      "semana_siguiente": 4000,
      "plazo_remanente": 32,
      "ingresos_api": 12000,
      "viajes_api": 45,
      "upload_id": "uuid-upload",
      "upload_week_of": "2026-05-12",
      "upload_filename": "shortlist.csv",
      "created_at": "2026-05-14T12:00:00.000Z",
      "status": "aceptado",
      "intentos": 1,
      "pago_intencion": 8000,
      "fecha_compromiso": "2026-05-20",
      "motivo_rechazo": null,
      "notes": null,
      "bono_pronto_pago": true,
      "assigned_to": null,
      "assigned_to_name": null,
      "exported_at": null,
      "exported_by": null,
      "last_activity_at": "2026-05-14T12:00:00.000Z",
      "calculo": {
        "saldo_vencido": 37000,
        "semanalidad_actual": 4000,
        "semanalidad_siguiente": 4000,
        "saldo_total": 41000,
        "saldo_a_regularizar": 41000,
        "total_pagar_hoy": 12000,
        "condonacion": 8000,
        "remanente": 25000,
        "csc_teorico": 781.25,
        "csc_aplicado": 200,
        "balloon": 18600,
        "nueva_semanalidad": 4200,
        "nueva_semanalidad_con_bono": 3800
      }
    }
  ],
  "pagination": {
    "total": 200,
    "limit": 200,
    "offset": 0
  }
}
```

Los montos en `calculo` se derivan de la calculadora de reestructura (misma lógica que el export CSV del dashboard).

---

## 2. Detalle por AF

`GET /api/v1/clientes/:af`

- `:af` es el identificador de contrato (ej. `4573`, `5730AF`).
- Respuesta: un solo objeto con la misma forma que cada ítem de `data` en el listado.
- `404` si no existe ese AF.

Ejemplo:

`GET /api/v1/clientes/4573`

---

## 3. Solo negociación

`GET /api/v1/clientes/:af/negociacion`

Devuelve únicamente la parte operativa de la negociación (sin ficha completa ni bloque `calculo`).

```json
{
  "af": "4573",
  "cliente_id": "uuid-cliente",
  "negociacion_id": "uuid-negociacion",
  "status": "aceptado",
  "intentos": 1,
  "pago_intencion": 8000,
  "fecha_compromiso": "2026-05-20",
  "motivo_rechazo": null,
  "notes": null,
  "bono_pronto_pago": true,
  "assigned_to": null,
  "assigned_to_name": null,
  "exported_at": null,
  "exported_by": null,
  "last_activity_at": "2026-05-14T12:00:00.000Z"
}
```

---

## 4. Cambios (auditoría)

`GET /api/v1/changes?since=2026-05-14T00:00:00.000Z`

- Parámetro `since` obligatorio (ISO 8601).
- Lee `actividad_log` ordenado por fecha ascendente (tope 1000 filas por request).
- Útil si más adelante quieren sync incremental; para snapshot completo alcanza con `GET /clientes`.

```json
{
  "changes": [
    {
      "af": "4573",
      "accion": "status_change",
      "estado_anterior": "en_negociacion",
      "estado_nuevo": "aceptado",
      "payload": {
        "pago_intencion": 8000,
        "intentos": 1,
        "fecha_compromiso": "2026-05-20"
      },
      "timestamp": "2026-05-14T12:00:00.000Z"
    }
  ]
}
```

---

## Estados de negociación (`status`)

| Valor | Significado |
|-------|-------------|
| `listo_contactar` | Listo para contactar |
| `sin_respuesta` | Sin respuesta |
| `en_negociacion` | En negociación |
| `aceptado` | Aceptado |
| `rechazado` | Rechazado |
| `necesita_revision` | Necesita revisión |

---

## Errores

| HTTP | Cuándo |
|------|--------|
| `400` | Query inválido (`status`, `since`, `limit`, `offset`) |
| `404` | AF no encontrado |
| `500` | Error de servidor o lectura a base de datos |

Cuerpo típico:

```json
{ "error": "Descripción del error" }
```

---

## Diferencia con `/api/export-csv`

| | API v1 (`/api/v1/...`) | Export CSV (`/api/export-csv`) |
|--|------------------------|--------------------------------|
| Formato | JSON | CSV |
| Auth | Sin login de usuario | Sesión gestor/admin |
| Efecto colateral | Ninguno (solo lectura) | `POST` marca `exported_at` en negociaciones |
| Uso | Integración sistema a sistema | Export operativo a cartera |

---

## Notas operativas

- Los endpoints viven en la app Next.js desplegada en Vercel; el servidor usa service role de Supabase para leer la vista (no hace falta cookie de la calculadora).
- En local, la misma base URL con `http://localhost:3000/api/v1` si el dev server está levantado con `SUPABASE_SERVICE_ROLE_KEY` en `.env.local`.
- Identificadores estables para cruzar sistemas: `id` (cliente), `negociacion_id`, `af`.

## Contacto / soporte

Ante dudas de contrato o campos faltantes, coordinar con el equipo de la calculadora de reestructura LTO.
