# PAMPA IA — Arquitectura

Estado:
- **Sprint IA-01** (infraestructura base): Gateway, provider abstraction, metering, pricing, créditos, cuotas, rate limiting, admin, auditoría. Ver §§1-8 más abajo.
- **Sprint IA-02** (asistente read-only con tool calling): PAMPA IA puede conversar y consultar datos reales de la empresa vía un conjunto controlado de tools de solo lectura. Ver §§9-15. Sigue sin poder crear, actualizar ni eliminar nada — carga de facturas, modificación de stock y agentes autónomos siguen fuera de alcance.

## Objetivo

Garantizar una invariante dura: **ninguna llamada a un proveedor de IA puede realizarse fuera de `AiGatewayService`.** Todo lo demás (cuotas, créditos, pricing, rate limiting, auditoría) existe para sostener esa invariante de forma segura y económicamente controlable.

## Ubicación

`pampa-api/src/modules/ai/`

```
ai/
  ai.module.ts            Wiring de DI. Único punto de entrada al módulo.
  ai.config.ts             Config centralizada (API key, modelo, límites) — AI_MODELS vive acá.
  ai.controller.ts         POST /ai/chat, GET /ai/usage (tenant-facing)
  ai.errors.ts              Errores de dominio (AI_DISABLED, AI_QUOTA_EXCEEDED, ...)
  ai.permissions.ts         Permisos RBAC tenant: ai.use, ai.usage.read
  provider/                 AiProvider (interfaz) + OpenAiProvider (única implementación hoy)
                            ai-tool.interface.ts — AiToolDefinition/AiToolCall/AiToolResult (provider-agnósticos)
  gateway/                  AiGatewayService — el único llamador de AiProvider y AiToolRegistry
                            ai-system-prompt.ts — system prompt central versionado
  pricing/                  AiPricingService + tabla de precios versionada
  credits/                  AiCreditsService — conversión USD -> créditos PAMPA
  quota/                    AiQuotaService — reserva/settle/release con locking Postgres
  usage/                    AiUsageRepository — AI Usage Ledger (nunca prompts/respuestas)
  subscription/             AiSubscriptionRepository/Service — company_ai_subscription
  admin/                    AiAdminController/Service — Platform Admin (/platform-admin/ai/*)
  tools/                    AiToolRegistry + AiTool (tipo) + AiToolsRegistrar (wiring)
                            ai-tools.repository.ts — queries de solo lectura propias de tools
                            period.util.ts, tool-args.util.ts — validación liviana de argumentos
                            definitions/ — un archivo por tool (ver §Tools disponibles)
  common/                   ai-plans.ts (presets), ai-period.util.ts
```

## Flujo de un request (`POST /ai/chat`)

```
Request
  -> JwtAuthGuard + PermissionGuard (globales, RBAC existente)
  -> AiController.chat()
  -> AiGatewayService.chat(context, message)
       1. AiSubscriptionService.requireEnabled(companyId)   -> AI_DISABLED si falta/deshabilitada
       2. AiConfigService.configured                         -> AI_PROVIDER_NOT_CONFIGURED si falta OPENAI_API_KEY
       3. RateLimitService.consume() x2 (empresa y usuario)   -> AI_RATE_LIMITED
       4. AiQuotaService.reserve(companyId, estimateWorstCase) -> AI_QUOTA_EXCEEDED / AI_COST_LIMIT_EXCEEDED
       5. AiProvider.complete()  (única llamada real a OpenAI) -> AI_PROVIDER_ERROR si falla
       6. AiPricingService.calculate(usage real)
       7. AiCreditsService.toCredits(costo real)
       8. AiQuotaService.settle(...)  (mueve reserva -> uso real)
       9. AiUsageRepository.record(...) (ledger, sin prompt/respuesta)
      10. SecurityAuditService.record(AI_REQUEST)
  -> respuesta { reply, usage: { creditsUsed, creditsRemaining, percentageUsed } }
```

Ningún controller ni módulo del ERP puede saltarse este camino: `OpenAiProvider` es la única clase del repo que importa el SDK `openai`, y sólo `AiGatewayService` la invoca (vía el token `AI_PROVIDER`).

## Provider abstraction

`AiProvider` (interfaz) desacopla el resto de PAMPA del SDK concreto:

```ts
interface AiProvider {
  readonly name: string;
  complete(request: AiCompletionRequest): Promise<AiCompletionResult>;
}
```

`OpenAiProvider` es la única implementación hoy. Para agregar Gemini u otro proveedor:

1. Crear `gemini-provider.service.ts` implementando `AiProvider`.
2. En `ai.module.ts`, cambiar el factory del token `AI_PROVIDER` para elegir la implementación (por config, plan, o lo que corresponda) — igual al patrón ya usado en `MercadoLibreModule` para `MERCADOLIBRE_CLIENT` (real vs. mock).
3. `AiGatewayService`, `AiPricingService` y todo el resto del ERP no cambian una línea.

El nombre del modelo está centralizado en `AI_MODELS.GENERAL` (`ai.config.ts`) — no aparece hardcodeado en ningún otro archivo.

## Seguridad de la API key

- `OPENAI_API_KEY` sólo existe en `AiConfigService` (variable privada) y se lee una vez al boot vía `ConfigService`.
- Si falta, `AiConfigService.configured = false` y **el ERP arranca normalmente** — no hay ningún `throw` en el constructor.
- `OpenAiProvider` construye el cliente OpenAI de forma perezosa (nunca en el boot) y sólo si `configured === true`.
- Nunca se loguea la key ni el mensaje de error crudo de OpenAI (`OpenAiProvider.complete()` sólo loguea `error.constructor.name`, nunca `error.message`, que podría contener fragmentos de headers o del propio prompt).
- Nunca se expone en respuestas HTTP, nunca se persiste en Prisma.

## Metering — AI Usage Ledger

Tabla `ai_usage_ledger` (una fila por request, éxito o error). Campos: `company_id`, `user_id`, `provider`, `model`, `operation`, `input_tokens`, `cached_input_tokens`, `output_tokens`, `total_tokens`, `estimated_cost_usd`, `credits_used`, `status`, `error_code`, `created_at`.

**Nunca** contiene el prompt ni la respuesta — ver §Privacidad.

Índices: `(company_id, created_at)`, `(user_id, created_at)`, `(created_at)`, `(provider, model)`.

## Pricing

`AiPricingService` + `pricing/ai-pricing.config.ts`. Tabla versionada por `provider` + `model` + `effectiveFrom`; se busca la entrada más reciente cuya fecha sea `<= now`. Para actualizar un precio: **agregar una entrada nueva**, nunca editar/borrar una histórica (así una fila vieja del ledger sigue siendo reconstruible con el precio que realmente tenía en su momento).

Fuente actual (gpt-5-mini): `https://openai.com/api/pricing/`, verificada 2026-08-17 — input USD 0.25/1M tokens, output USD 2.00/1M tokens, cached input USD 0.025/1M tokens (10% del input, el descuento estándar de OpenAI para prompt caching). No son valores permanentes: OpenAI puede cambiarlos sin aviso, volver a verificar periódicamente.

Fórmula: `estimated_cost_usd = (input_tokens - cached_input_tokens) * input$/1M + cached_input_tokens * cached_input$/1M + output_tokens * output$/1M`. Toda la aritmética usa `Prisma.Decimal` (nunca `number`/float de JS) para evitar error de redondeo en un ledger financiero.

## Créditos PAMPA IA

`AiCreditsService.toCredits(costoUsd) = costoUsd / AI_CREDIT_VALUE_USD`. La conversión es **por costo, no por token** — si cambia el precio de OpenAI o se agrega un proveedor con otra economía de tokens, los créditos siguen significando lo mismo sin migrar el ledger. `AI_CREDIT_VALUE_USD` (env, default `0.001`) es la única palanca para cambiar la economía de créditos.

Platform Admin ve tokens y costo real (`AiAdminService`). El tenant sólo ve créditos (`AiSubscriptionService.getUsageStatus`).

## Cuotas — `company_ai_subscription`

Una fila por empresa. Campos comerciales: `enabled`, `plan_code`, `monthly_credit_limit`, `period_start`/`period_end`. Campos de protección económica: `internal_cost_limit_usd` (nunca expuesto a tenant), y los contadores `credits_used_period` / `reserved_credits_period` / `cost_used_period_usd` / `reserved_cost_period_usd`.

Planes (`common/ai-plans.ts`): `AI_FREE`, `AI_PRO`, `AI_BUSINESS`, `CUSTOM`. Los tres primeros traen presets de límite; `CUSTOM` requiere que Platform Admin fije los valores a mano. No hay billing real todavía — son sólo los límites que activan el bloqueo.

Rollover de período: perezoso. Si `now >= period_end` al momento de una reserva, `AiQuotaService.reserve()` resetea `period_start/period_end` (+1 mes UTC) y pone los cuatro contadores en cero, dentro de la misma transacción que hace el chequeo de cuota — no hay cron job.

## Doble protección económica y concurrencia

Ver `AiQuotaService` (`quota/ai-quota.service.ts`) para la implementación completa; el resumen:

**Problema:** el costo real de un request sólo se conoce *después* de llamar al proveedor (depende de tokens reales de la respuesta). Un chequeo ingenuo "leer saldo, decidir, luego escribir" permite que N requests concurrentes lean el mismo saldo disponible antes de que ninguna escriba, superando ampliamente la cuota.

**Solución — reserva de dos fases, sin Redis:**

1. **`reserve(companyId, estimate)`** — antes de llamar al proveedor. Toma un lock transaccional por empresa (`pg_advisory_xact_lock(hashtext('ai_quota'), hashtext(company_id))`, mismo mecanismo que `RateLimitService` ya usa para el login throttle). Dentro del lock: lee la fila, aplica rollover de período si corresponde, chequea `usado + reservado + estimate` contra ambos límites (`monthly_credit_limit` e `internal_cost_limit_usd`), y si pasa, incrementa `reserved_*` y libera el lock (la llamada al proveedor **nunca** ocurre con el lock tomado).
2. **`settle(companyId, estimate, actual)`** — después de una respuesta exitosa. Vuelve a tomar el lock, decrementa `reserved_*` en `estimate` e incrementa `credits_used_period`/`cost_used_period_usd` en `actual` (el costo real, ya conocido).
3. **`release(companyId, estimate)`** — si el proveedor falló. Sólo decrementa `reserved_*`; no se registra consumo porque no hubo respuesta facturable.

El `estimate` que se reserva es un **límite superior conservador** (`AiPricingService.estimateMax`): asume cero cache hits y el tope máximo de tokens de salida configurado (`AI_CHAT_MAX_OUTPUT_TOKENS`). Esto acota el sobreconsumo posible bajo concurrencia: N requests simultáneas para la misma empresa serializan en el lock durante `reserve`/`settle`/`release`, así que el excedente máximo posible sobre el límite es, como mucho, una reserva en vuelo por request concurrente — nunca "las 20 pasan porque todas leyeron el mismo saldo".

No se usa Redis: PostgreSQL con `pg_advisory_xact_lock` + `$transaction` alcanza para el volumen de este sprint y reutiliza un patrón ya probado en el repo.

## Rate limiting

Reutiliza `RateLimitService` existente (bucket en Postgres, sin Redis) con dos acciones nuevas: `ai.chat.company` (`AI_RATE_LIMIT_COMPANY_PER_MINUTE`, default 20/min) y `ai.chat.user` (`AI_RATE_LIMIT_USER_PER_MINUTE`, default 6/min). Sólo afecta `/ai/*` — no toca el resto del ERP.

## Aislamiento tenant

Todo acceso a `company_ai_subscription` y `ai_usage_ledger` está indexado y filtrado por `company_id`. `AiSubscriptionService`/`AiQuotaService` sólo aceptan un `companyId` explícito (viene de `SecurityContext`, nunca del body/query del cliente). Los tests de `AiQuotaService` y `AiUsageRepository` verifican explícitamente que cada lectura/escritura queda scopeada a la empresa dada.

## Errores de dominio

| Code | HTTP | Cuándo |
|---|---|---|
| `AI_DISABLED` | 503 | La empresa no tiene IA habilitada (o no tiene fila de suscripción) |
| `AI_QUOTA_EXCEEDED` | 402 | `monthly_credit_limit` alcanzado |
| `AI_COST_LIMIT_EXCEEDED` | 402 | `internal_cost_limit_usd` alcanzado (mensaje idéntico al de arriba — nunca se revela al cliente que existe un segundo límite) |
| `AI_RATE_LIMITED` | 429 | Rate limit por empresa o usuario |
| `AI_PROVIDER_NOT_CONFIGURED` | 503 | Falta `OPENAI_API_KEY` |
| `AI_PROVIDER_ERROR` | 502 | Falla de OpenAI (timeout, 5xx, respuesta inválida) |

## Privacidad — Ledger vs. Historial de conversación

Dos conceptos deliberadamente separados:

- **AI Usage Ledger** (`ai_usage_ledger`, implementado este sprint): tokens y costo, nada de contenido.
- **AI Conversation History** (no implementado): guardaría prompts/respuestas para features futuras (memoria de contexto, etc.).

`AiUsageRepository.RecordUsageInput` no tiene ningún campo para texto — no hay forma de persistir un prompt por accidente al llamar a `record()`. `POST /ai/chat` no persiste el mensaje del usuario en ningún lado más que en la request HTTP misma.

## Observabilidad

Eventos en `SecurityAuditService` (tabla `security_event` existente, sin nueva infraestructura): `AI_REQUEST`, `AI_QUOTA_EXCEEDED`, `AI_COST_LIMIT_EXCEEDED`, `AI_RATE_LIMITED`, `AI_PROVIDER_ERROR`, `AI_SETTINGS_CHANGED`, `AI_TOOL_CALLED` (Sprint IA-02, uno por cada ejecución de tool — éxito o falla, `metadata: { tool, durationMs, errorCode? }`), `AI_TOOL_PERMISSION_DENIED` (Sprint IA-02, `metadata: { tool }`). Ninguno incluye el prompt completo ni el resultado completo de una tool. `AI_SETTINGS_CHANGED` (mutaciones de Platform Admin) nunca incluye `internal_cost_limit_usd` en `metadata`, aunque el propio `AiAdminService` sí lo lee/escribe en la base — la exclusión es explícita en el código, no incidental.

## Platform Admin (`/admin/ai`)

Backend: `AiAdminController` (`/platform-admin/ai/*`), guardeado con el `PlatformAdminGuard` existente (no requiere permiso tenant — autoridad de plataforma es un sistema aparte del RBAC de empresa).

- `GET /platform-admin/ai/overview` — KPIs de los últimos 30 días: empresas con IA, bloqueadas por cuota, requests, tokens, costo estimado, créditos consumidos, **tokens promedio/request, costo promedio/request, tool calls totales, tools más usadas (top 10, agregado read-only sobre `security_event.metadata->>'tool'`), errores de proveedor, requests rate-limited, requests bloqueados por cuota** (estos últimos seis, agregados de Sprint IA-02).
- `GET /platform-admin/ai/companies` — tabla paginada, filtrable por nombre/estado.
- `GET /platform-admin/ai/companies/:id` — detalle de una empresa (incluye `internalCostLimitUsd`, costo real, y las últimas 20 filas del ledger).
- `PATCH /platform-admin/ai/companies/:id` — habilitar/deshabilitar, cambiar plan, cambiar límites. Audita `AI_SETTINGS_CHANGED`.

Frontend: `/admin/ai` (listado + KPIs) y reutiliza el layout/sidebar de Platform Admin existente (`src/app/admin/layout.tsx`).

## Tool calling — abstracción provider-agnóstica

`AiProvider.complete()` ahora recibe un transcript (`AiMessage[]`) y opcionalmente `AiToolDefinition[]`, y devuelve `{ content, toolCalls, finishReason, usage }`. Ningún tipo de OpenAI (`ChatCompletionTool`, `ChatCompletionMessageToolCall`, ...) sale de `openai-provider.service.ts` — `AiGatewayService`, `AiToolRegistry` y cada tool sólo conocen `AiMessage`/`AiToolDefinition`/`AiToolCall`/`AiToolResult` (`provider/ai-provider.interface.ts` y `provider/ai-tool.interface.ts`).

Agregar Gemini más adelante sigue siendo: una clase nueva que implemente `AiProvider` (traduciendo su propio formato de function calling a estos mismos tipos) + cambiar el factory del token `AI_PROVIDER` en `ai.module.ts`. Ni las tools ni `AiGatewayService` cambian.

## AI Tool Registry y seguridad de tools

`AiToolRegistry.register()` es el único punto de entrada para dar de alta una tool, y rechaza en boot cualquiera que no declare `readOnly: true` — no hay forma de registrar una tool mutante por accidente en este sprint. `AiToolsRegistrar` (`OnModuleInit`) puebla el registry al arrancar el módulo, inyectando servicios reales ya tenant-scoped (`ProductsService`, `StockService`, `AnalyticsRepository`) más `AiToolsRepository` (queries de solo lectura propias de IA).

Flujo obligatorio de una tool call (`AiGatewayService.executeToolCall`):

```
tool call del modelo
  -> ¿existe la tool en AiToolRegistry?           no -> { error: 'TOOL_NOT_FOUND' }
  -> ¿context.permissions incluye tool.permission? no -> { error: 'PERMISSION_DENIED' } + audita AI_TOOL_PERMISSION_DENIED
  -> sanitizeToolArguments(call.arguments)         (borra company_id/companyId/user_id/userId/tenant* si el modelo los incluyó)
  -> tool.handler(argsSanitizados, context)         con timeout (AI_TOOL_TIMEOUT_MS)
  -> audita AI_TOOL_CALLED (éxito o error)
  -> resultado (minimizado) vuelve al modelo como mensaje `tool`
```

`context: SecurityContext` es siempre el de la request autenticada — ninguna tool acepta `company_id`/`user_id` como argumento del modelo, y aunque el modelo alucine esos campos, `sanitizeToolArguments()` los descarta antes de que el handler los vea. Cada handler además está escrito para usar únicamente `context.companyId`, nunca un campo de `args` con ese propósito — dos capas de la misma garantía.

La IA nunca toca Prisma ni ejecuta SQL: cada tool delega en un service/repository ya existente (`ProductsService.findAll`, `StockService.findAll/summary`, `AnalyticsRepository.dashboard`) o en `AiToolsRepository`, que usa exclusivamente la API tageada `$queryRaw` de Prisma (parametrizada por diseño, nunca concatenación de strings) para las tres consultas que no tenían un service reutilizable con la forma correcta.

## Tools disponibles (Sprint IA-02, todas `readOnly: true`)

| Tool | Permiso requerido | Reutiliza |
|---|---|---|
| `search_products` | `products.read` | `ProductsService.findAll` |
| `get_low_stock_products` | `stock.read` | `StockService.findAll({ lowStock: true })` — la regla real ya existente (`quantity <= minimum_quantity`) |
| `get_inventory_summary` | `stock.read` | `StockService.summary()` |
| `get_sales_summary` | `sales.read` | `AiToolsRepository.salesSummary` (mismo filtro de estado `NOT IN (DRAFT, CANCELLED)` que `AnalyticsRepository`) |
| `get_top_selling_products` | `sales.read` | `AiToolsRepository.topSellingProducts` |
| `get_customer_balance_summary` | `clients.read` | `AiToolsRepository.customerBalanceSummary` — usa `client.current_balance`, un campo real y activamente mantenido (`PaymentRepository.recalculateClientBalance` lo recalcula en cada mutación de pago), no un cálculo inventado para esta tool |
| `get_business_overview` | `sales.read` | `AnalyticsRepository.dashboard()` — el mismo agregado que usa el dashboard de PAMPA |

`get_sales_summary` y `get_top_selling_products` aceptan `period` (`today | yesterday | last_7_days | last_30_days | this_month | custom`) resuelto por `tools/period.util.ts`, que valida agresivamente el caso `custom` (rango máximo 366 días, fechas bien formadas, `from <= to`) porque esos argumentos vienen del modelo, no de un usuario tipeando en un formulario.

## System prompt

`gateway/ai-system-prompt.ts` — constante única (`AI_SYSTEM_PROMPT`), nunca construida ad hoc en un controller. Define el rol ("asesor administrativo dentro de PAMPA"), prohíbe explícitamente afirmar haber ejecutado una acción, exige usar tools para cualquier pregunta sobre datos de la empresa (nunca inventar cifras), exige reconocer cuando no hay datos suficientes, y fija el idioma por defecto (español rioplatense, pero responde en el idioma del usuario). La protección contra alucinaciones es, por diseño, una combinación de este prompt + la ausencia total de otra fuente de "conocimiento de la empresa" que no sean las tools — el modelo no tiene otro lugar de donde sacar una cifra de ventas real.

## Loop de tool calling

`AiGatewayService.chat()` corre hasta `AI_MAX_TOOL_ROUNDS` (default 5) llamadas al proveedor. En cada ronda:

1. Si el modelo no pide tools (`finishReason !== 'tool_calls'`), esa es la respuesta final.
2. Si pide tools y **no** es la última ronda permitida, se ejecutan (respetando `AI_MAX_TOOL_CALLS_PER_REQUEST`, default 10, contado across todas las rondas — pasado el límite, las tool calls sobrantes reciben `{ error: 'TOOL_CALL_LIMIT_EXCEEDED' }` sin ejecutarse) y sus resultados se agregan al transcript para la próxima ronda.
3. Si pide tools en la última ronda permitida, no se ejecutan (no quedaría ronda para que el modelo vea el resultado) y se responde con el texto que haya, o un mensaje genérico de fallback.

Cada tool corre con timeout (`AI_TOOL_TIMEOUT_MS`, default 8000ms) vía `Promise.race` — una tool colgada nunca cuelga el request completo, produce `{ error: 'TOOL_TIMEOUT' }`.

## Cost accounting multi-ronda

Un mismo `POST /ai/chat` puede disparar varias llamadas reales al modelo (una por ronda). La reserva de cuota (`AiQuotaService.reserve`, ver §Concurrencia arriba) se calcula para el **peor caso de todo el loop**: `AI_CHAT_MAX_OUTPUT_TOKENS * AI_MAX_TOOL_ROUNDS` tokens de salida, más un presupuesto conservador de tokens de entrada por ronda para los resultados de tools acumulados en el transcript. Todas las rondas se contabilizan (tokens y costo) en variables acumuladoras dentro de `chat()`, y hay **un solo `settle()` al final** con el total real — nunca un settle por ronda, así el loop no puede evadir el chequeo de cuota/costo/rate-limit ejecutando más rondas de las que una reserva cubre (la reserva ya cubrió el peor caso de `AI_MAX_TOOL_ROUNDS` rondas por adelantado).

Si una ronda posterior falla después de que rondas anteriores ya generaron uso real y facturable, ese costo **no se descarta**: se hace `settle()` con lo acumulado hasta ese punto (no un `release()` de la reserva completa). Sólo un fallo en la primera ronda, sin ningún uso real todavía, dispara `release()`. El ledger siempre refleja lo que realmente ocurrió.

## Minimización de contexto

Cada tool devuelve una forma explícita y mínima (ver la tabla de arriba) — nunca una fila de Prisma completa. Ejemplo real (`search_products`): `{ sku, name, barcode, unit, salePrice, totalStock, lowStock, isActive }`, sin `id`, `company_id`, `created_at`/`updated_at`, ni ningún campo de auditoría. Esto reduce tokens (costo) y superficie de exposición de datos al modelo al mismo tiempo.

## Conversaciones (sesión, no persistidas)

`POST /ai/chat` acepta `conversationContext?: { role, content }[]` — turnos previos que el **cliente** reenvía en cada request, mantenidos únicamente en el estado de React del panel (`PampaAiPanel`), nunca persistidos en el backend. El servidor trunca a los últimos `AI_MAX_CONVERSATION_CONTEXT_MESSAGES` (default 10) sin importar cuántos mande el cliente (la validación del DTO además tope-a el array en 40 elementos como defensa adicional contra un payload gigante). `company_id`/`user_id` nunca viajan en este array — sólo texto de diálogo, y siempre vienen del `SecurityContext` autenticado.

Decisión explícita: no existe todavía un **AI Conversation History** persistente — ver §Privacidad arriba. Cuando se diseñe, será una entidad separada del AI Usage Ledger, con sus propias reglas de retención/privacidad.

## Frontend — panel lateral

`PampaAiPanel` (`src/components/pampa-ui/ai/pampa-ai-panel.tsx`) es un `Sheet` (`side="right"`, `w-full sm:max-w-md` — pantalla completa en mobile, panel angosto en desktop) montado una sola vez en `AuthenticatedShell`, disparado por un botón "PAMPA IA" en el topbar que sólo se muestra si `user.permissions.includes('ai.use')`. Estados de UI:

- `idle` / `thinking` / `consulting` (cosmético: cambia el label ~900ms después de enviar, ya que `POST /ai/chat` es una única request/response sin canal de progreso real por tool — implementar eso requeriría streaming, fuera de este sprint) / `response`.
- Errores mapeados desde el `status` HTTP de `ApiError` (no desde el `code` de dominio, que el filtro de excepciones no expone en el body — sólo el `message`): `402` -> cuota agotada, `429` -> rate limited, `503`/`502` -> proveedor no disponible, `403` -> sin permiso, `status 0` -> error de red.
- `PERMISSION_DENIED` a nivel de una tool específica **no** es un estado de UI aparte: el modelo lo recibe como resultado de la tool y se lo explica al usuario en lenguaje natural dentro de la respuesta (así lo exige el system prompt) — nunca se muestran nombres internos de tools en la interfaz.
- Al llegar a 100% de uso, el input se deshabilita y se muestra el mismo mensaje bloqueante que el widget (`PampaAiWidget`, reutilizado dentro del panel), con el CTA inerte "Ampliar capacidad" (sin billing todavía).

## Variables de entorno

Ver `pampa-api/.env.example`:

```
OPENAI_API_KEY=                          # vacío = IA inerte, no rompe el boot
AI_CREDIT_VALUE_USD=0.001                # USD por crédito PAMPA IA
AI_CHAT_MAX_OUTPUT_TOKENS=700            # tope de salida por ronda; también acota la reserva de cuota
AI_RATE_LIMIT_COMPANY_PER_MINUTE=20
AI_RATE_LIMIT_USER_PER_MINUTE=6
AI_MAX_TOOL_ROUNDS=5                     # máx. llamadas al modelo por request
AI_MAX_TOOL_CALLS_PER_REQUEST=10         # máx. tool calls ejecutadas por request, across todas las rondas
AI_TOOL_TIMEOUT_MS=8000                  # timeout por ejecución de tool
AI_MAX_CONVERSATION_CONTEXT_MESSAGES=10  # turnos previos (cliente) que se reenvían al modelo
```

## Cómo agregar la próxima función de IA

Cualquier feature futura (parsing de facturas, asistente de stock con escritura, agentes) debe:

1. Ser un nuevo método en un service dentro de `src/modules/ai/` (o un módulo que importe `AiGatewayService`), nunca un controller que llame a `OpenAiProvider` u otro SDK directo.
2. Pasar por `AiGatewayService` para heredar cuota, rate limit, tool-calling loop y auditoría gratis.
3. Si necesita una tool nueva, agregarla en `tools/definitions/` siguiendo el patrón de las siete existentes: reusar un service/repository real, devolver una forma mínima, declarar el permiso RBAC correcto. Una tool que **escriba** en el ERP requiere primero levantar la restricción `readOnly: true` de `AiToolRegistry.register()` — deliberadamente no es un simple flag a cambiar, es una decisión de producto que hay que tomar explícitamente cuando llegue ese sprint.

## Decisiones tomadas / pendientes

- **Sin Redis**: se prefirió Postgres + `pg_advisory_xact_lock`, ya probado en `RateLimitService`.
- **Sin tabla de pricing en DB**: se prefirió un archivo versionado (`ai-pricing.config.ts`) — más simple de auditar en code review que una tabla, y sigue el patrón de otros configs del repo (`arca.config.ts`).
- **Créditos basados en costo, no en tokens**: para poder cambiar de proveedor/precio sin romper la semántica de "cuánto vale un crédito".
- **Reserva conservadora (worst-case)** en vez de "leer y decidir": es la única forma de acotar el sobreconsumo bajo concurrencia sin conocer el costo real de antemano — extendida en Sprint IA-02 para cubrir el peor caso de todo el loop de tool calling, no sólo una llamada.
- **Un solo `settle()` por request, no uno por ronda**: simplifica el modelo mental (una reserva, un asentamiento) y hace imposible que el loop de tools "escape" del chequeo de cuota ejecutando más rondas de las reservadas.
- **Sin streaming (SSE/WebSockets)**: el panel usa un único request/response; los estados "pensando"/"consultando" son cosméticos, no reflejan progreso real por tool. Si se necesita progreso real en el futuro, es un cambio de transporte, no de la lógica del Gateway.
- **Sin tabla de Conversation History**: el contexto de conversación vive sólo en el cliente, por diseño (ver §Conversaciones) — evita decisiones de retención/privacidad que todavía no están tomadas.
- **Pendiente**: billing real, RAG/embeddings, agentes autónomos, tools que escriban en el ERP (carga de facturas, ajuste de stock, etc.) — explícitamente fuera de este sprint.
- **Riesgo conocido**: si un `settle`/`release` nunca llega a ejecutarse (proceso matado a mitad de camino, sin captura de la excepción), una reserva queda "colgada" en `reserved_*` hasta el próximo rollover de período. Aceptable para v1; si se vuelve un problema real, la mitigación natural es un job que expire reservas más viejas que un timeout corto.
- **Riesgo conocido (nuevo)**: el mapeo de errores en el frontend usa el `status` HTTP, no el `code` de dominio (el filtro de excepciones global no lo expone en el body). Alcanza para diferenciar los estados de UX pedidos este sprint, pero si en el futuro se necesita distinguir `AI_QUOTA_EXCEEDED` de `AI_COST_LIMIT_EXCEEDED` en el cliente (hoy comparten status 402 a propósito, ver §Errores de dominio), habría que decidir si vale la pena exponer `code` en el body del error sin romper el contrato actual de otros dominios.
