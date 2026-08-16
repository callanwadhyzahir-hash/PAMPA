# Integración Mercado Libre — v1

## Alcance

Primera versión simple de la integración de Mercado Libre. Permite:

1. Conectar una cuenta de Mercado Libre (OAuth 2.0 + PKCE, o modo mock en desarrollo).
2. Ver el vendedor conectado (nickname, ML user ID, sitio, estado).
3. Ver publicaciones (snapshot local, actualizado por sincronización manual).
4. Ver órdenes (snapshot local, actualizado por sincronización manual).
5. Vincular manualmente una publicación con un producto de PAMPA (asociación, no sincronización de stock/precio).
6. Ejecutar una sincronización manual (`POST /integrations/mercadolibre/sync`).
7. Ver cuándo ocurrió la última sincronización.

**No implementado en v1** (ver [Roadmap v2](#roadmap-v2)): sincronización automática/bidireccional de stock, edición de precios/publicaciones desde PAMPA, mensajería, envíos, facturación de ML, webhooks, cron/background workers, conversión automática de orden ML → venta PAMPA.

## Arquitectura

Aislada del dominio principal, dentro de `pampa-api/src/modules/integrations/mercadolibre/`:

```text
mercadolibre/
├── client/           # MercadoLibreClient (contrato) + Real/Mock
├── crypto/           # Cifrado AES-256-GCM de tokens
├── connection/        # Estado de la conexión (repo + service)
├── oauth/             # State firmado (JWT), PKCE, orquestación del flujo
├── listings/           # Publicaciones + vínculo con producto PAMPA
├── orders/             # Órdenes (solo lectura/cache)
├── sync/               # Sincronización manual
├── mercadolibre.controller.ts
├── mercadolibre.module.ts
├── mercadolibre.config.ts
├── mercadolibre.errors.ts
└── mercadolibre.permissions.ts
```

Sigue el patrón ya establecido por el módulo `fiscal` (integración ARCA): un contrato (`MercadoLibreClient`) con dos implementaciones (`RealMercadoLibreClient` / `MockMercadoLibreClient`) seleccionadas por DI según configuración — el resto de PAMPA nunca hace fetch directo a Mercado Libre.

**Diferencia clave con `fiscal.module.ts`**: `FiscalModule.forRoot()` falla el arranque si `FISCAL_PROVIDER` no está seteado (integración obligatoria una vez desplegada). `MercadoLibreModule` **nunca falla el arranque** — si faltan credenciales reales, `configured: false` se refleja como estado explícito en la UI, porque Mercado Libre es opcional por instalación y puede no estar aprobada todavía.

## Modelos de datos

Migración `20260817100000_add_mercadolibre_integration_v1` (aditiva).

- **`mercadolibre_connection`**: una por empresa (`@@unique(company_id)`). Guarda `provider` (`REAL` | `MOCK`, sin default — se setea explícitamente en cada escritura, igual que `invoice.fiscal_provider` en ARCA), tokens cifrados, `status`, `last_sync_at`, `last_error`.
- **`mercadolibre_listing`**: snapshot de publicaciones, único por `(connection_id, ml_item_id)`.
- **`mercadolibre_product_link`**: vínculo publicación↔producto. FKs compuestas `(listing_id, company_id)` y `(product_id, company_id)` — a nivel de base de datos es imposible vincular una publicación de una empresa con un producto de otra.
- **`mercadolibre_order`**: snapshot de órdenes, único por `(connection_id, ml_order_id)`. Minimiza PII: solo `buyer_nickname` opcional, sin email/teléfono/dirección.

Todas las tablas usan el mismo patrón tenant-safe que el resto del esquema: FK compuesta `[id, company_id]` hacia el padre en vez de una relación directa a `company` cuando el padre ya está scopeado (igual que `invoice_fiscal_attempt` → `invoice`).

## Endpoints

Todos bajo `/integrations/mercadolibre`, protegidos por `@RequirePermissions` salvo `/callback` (público, ver [Seguridad](#seguridad-y-oauth)):

| Método | Ruta | Permiso | Descripción |
|---|---|---|---|
| GET | `/status` | `read` | Estado (`configured`, `mockMode`, `connected`, `account`, `lastSyncAt`, `lastError`) |
| GET | `/connect` | `manage` | Inicia OAuth (real) o conecta directo (mock) |
| GET | `/callback` | público | Callback de Mercado Libre — resuelve la empresa vía `state` firmado |
| POST | `/disconnect` | `manage` | Limpia tokens, conserva historial de publicaciones/órdenes |
| GET | `/listings` | `read` | Paginado, filtro por `search`/`status` |
| POST | `/listings/:id/link` | `manage` | Vincula a un producto (`409 MERCADOLIBRE_LINK_CONFLICT` si ya está vinculada a otro) |
| DELETE | `/listings/:id/link` | `manage` | Desvincula |
| GET | `/orders` | `read` | Paginado, filtro por `status` |
| POST | `/sync` | `manage` | Sincronización manual, idempotente |

## Permisos (RBAC)

Agregados al catálogo único en `pampa-api/src/modules/auth/rbac/rbac.definitions.ts` (no se creó un sistema paralelo):

- `integrations.mercadolibre.read` — ver estado, publicaciones, órdenes.
- `integrations.mercadolibre.manage` — conectar, desconectar, sincronizar, vincular/desvincular.

Asignados en `ROLE_PERMISSION_MATRIX`: `OWNER`/`ADMINISTRATOR` (todos los permisos, automático) y `MANAGER` reciben ambos; `SELLER` recibe solo `read`; `CASHIER`/`WAREHOUSE`/`ACCOUNTANT`/`VIEWER` no reciben ninguno.

**Importante**: después de desplegar esta versión hay que correr `npm run rbac:bootstrap` (idempotente) para que los permisos nuevos se sincronicen en cada empresa activa.

## Variables de entorno

```env
MERCADOLIBRE_CLIENT_ID=
MERCADOLIBRE_CLIENT_SECRET=
MERCADOLIBRE_REDIRECT_URI=https://api.example.com/integrations/mercadolibre/callback
MERCADOLIBRE_SITE_ID=MLA
MERCADOLIBRE_TOKEN_ENCRYPTION_KEY=
MERCADOLIBRE_MOCK_MODE=true
```

- `MERCADOLIBRE_TOKEN_ENCRYPTION_KEY` es obligatoria (real o mock): sin ella `MercadoLibreTokenCipher` revienta al construirse. Generar con `openssl rand -hex 32`.
- `MERCADOLIBRE_MOCK_MODE=true` solo tiene efecto cuando `NODE_ENV !== production` — un despliegue de producción mal configurado lo ignora en silencio, nunca sirve datos falsos como reales.
- Sin `CLIENT_ID`/`CLIENT_SECRET`/`REDIRECT_URI`, `configured` es `false` (a menos que mock mode esté activo) y `/connect` responde `MERCADOLIBRE_NOT_CONFIGURED` en vez de fingir éxito.

## Seguridad y OAuth

- **Authorization Code + PKCE** (S256). El `code_verifier` se guarda en una cookie `httpOnly`/`secure` en producción, scopeada a `/integrations/mercadolibre`, nunca viaja por la URL.
- El parámetro `state` es un JWT firmado (mismo `JWT_SECRET`, audience distinta `mercadolibre-oauth-state`, expira a los 10 minutos) que contiene `companyId` y `userId`. El callback **nunca confía en un `companyId` de query param ni de la request** — lo único válido es lo que sale de verificar la firma del `state`.
- `access_token`/`refresh_token` se cifran con AES-256-GCM (`MercadoLibreTokenCipher`) antes de persistirse. El `select` de Prisma para cualquier response HTTP (`connectionPublicSelect`) nunca incluye las columnas cifradas — verificado por test (`connection.repository.spec.ts`) y por e2e (`mercadolibre-security.e2e-spec.ts`).
- Refresh de token es *lazy* (al usarse, si expira en menos de 60s), nunca en background/cron.
- Auditoría vía `SecurityAuditService` en conectar/desconectar/vincular/desvincular/sincronizar. Nunca se audita el código OAuth, el `state`, ni ningún token.
- Errores de dominio (`MercadoLibreDomainError` y subclases) nunca reenvían el cuerpo crudo de la respuesta de Mercado Libre al frontend — solo un `code` + mensaje sanitizado.

## Mock mode

`MERCADOLIBRE_MOCK_MODE=true` (solo fuera de producción) activa `MockMercadoLibreClient`: 8 publicaciones y 7 órdenes fijas y deterministas (mismos IDs en cada llamada, así `sync` es idempotente). `/connect` en modo mock no redirige a ningún lado — persiste la conexión directamente con `provider = 'MOCK'`.

La UI siempre muestra un badge **"Datos de prueba"** cuando `mockMode` es `true`, para que nunca se confunda con una cuenta real conectada.

## Cómo pasar de MOCK a API real

1. Obtener `Client ID`/`Client Secret` reales de Mercado Libre Developers.
2. Configurar en el servidor: `MERCADOLIBRE_CLIENT_ID`, `MERCADOLIBRE_CLIENT_SECRET`, `MERCADOLIBRE_REDIRECT_URI` (debe coincidir exactamente con la URL registrada en ML), `MERCADOLIBRE_SITE_ID` según el país.
3. Quitar/poner en `false` `MERCADOLIBRE_MOCK_MODE`.
4. Reiniciar el servicio — `MercadoLibreModule` selecciona `RealMercadoLibreClient` automáticamente.
5. Si había una conexión mock previa, desconectarla desde la UI y volver a conectar con la cuenta real (`provider` pasa a `REAL`).
6. No hace falta migración de datos: `mercadolibre_listing`/`mercadolibre_order` se repueblan solos en el próximo `sync`.

## Limitaciones de v1

- Una sola conexión de Mercado Libre por empresa.
- Vincular una publicación con un producto es solo una asociación — no sincroniza stock ni precio en ningún sentido.
- Las órdenes de Mercado Libre son de solo lectura, no se convierten en ventas de PAMPA.
- Sincronización 100% manual, sin cron ni worker en background.

## Roadmap v2 (no implementado)

Documentado solamente, sin código:

- Webhooks/notificaciones de Mercado Libre.
- Sincronización automática (stock PAMPA → ML y ML → PAMPA), con estrategia de source-of-truth.
- Actualización de precios y creación/edición de publicaciones desde PAMPA.
- Soporte de variantes de producto.
- Conversión de orden ML → venta PAMPA (automática o asistida).
- Logística/envíos.
- Reintentos, resiliencia, reconciliación periódica, observabilidad dedicada.
- Múltiples conexiones de Mercado Libre por empresa (multi-país/multi-cuenta).
