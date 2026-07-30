# Arquitectura de identidad, autorización y aislamiento multiempresa

**Estado:** Sprint 3 implementado y validado localmente
**Fecha:** 29 de julio de 2026
**Alcance:** Autorización de Companies, catálogo RBAC, roles de sistema y bootstrap inicial de OWNER.

> **Actualización del 29 de julio de 2026:** el Sprint 2 implementó
> `SecurityContext`, autorización declarativa y aislamiento tenant para
> Companies. La descripción de riesgos iniciales se conserva como evidencia de
> auditoría; la sección 19 registra cuáles fueron cerrados y cuáles continúan.

## 1. Resumen ejecutivo

PAMPA ya autentica usuarios mediante correo y contraseña, emite un JWT de 15 minutos en una cookie `HttpOnly` y protege globalmente los endpoints con `JwtAuthGuard`. La autenticación verifica que el usuario y su empresa estén activos y recupera los roles y permisos relacionados.

La autorización todavía no está implementada. Los roles y permisos se incluyen en el JWT, pero ningún guard los evalúa. Como consecuencia, cualquier usuario autenticado, incluso sin roles, puede ejecutar todos los endpoints cargados. El caso más crítico es `companies`: lista todas las empresas y permite leer, modificar o desactivar cualquier empresa usando un UUID global, sin comparar el recurso con `request.user.companyId`.

El esquema representa a `company` como tenant, pero las claves foráneas actuales sólo validan la existencia de cada entidad. No garantizan que un usuario, sucursal, rol, depósito, venta, cliente o producto relacionados pertenezcan a la misma empresa. No hay Row-Level Security, políticas, triggers ni restricciones compuestas de tenant en la migración baseline.

La recomendación es implementar defensa en profundidad:

1. JWT mínimo y sesiones revocables.
2. Un contexto de seguridad resuelto en backend desde el usuario autenticado.
3. `PermissionGuard` para autorización por acción.
4. Scoping obligatorio por `company_id` y, cuando corresponda, `branch_id` dentro de repositories.
5. Validaciones transaccionales de pertenencia para relaciones indirectas.
6. Restricciones de integridad multiempresa en PostgreSQL cuando el diseño sea aprobado.

El sistema no debe exponerse públicamente como ERP multiempresa hasta cerrar los hallazgos críticos de este documento.

## 2. Estado actual verificado

### 2.1 Estructura

El repositorio es un monorepo informal:

- La raíz contiene el frontend Next.js.
- `pampa-api/` contiene una aplicación NestJS independiente.
- Cada aplicación tiene su propio `package.json`, `package-lock.json`, `node_modules` y comandos.
- No hay workspaces ni pipeline CI/CD común.
- El backend completo continúa sin seguimiento en el Git raíz al momento de esta auditoría.

`pampa-api/src/app.module.ts` carga:

- `ConfigModule`
- `PrismaModule`
- `CountriesModule`
- `CompaniesModule`
- `CompanyTypesModule`
- `TaxConditionsModule`
- `CurrenciesModule`
- `AuthModule`

Existen esqueletos de `cities` y `provinces`, pero no están cargados en `AppModule`. No existen módulos backend de `users` ni `branches`.

### 2.2 Autenticación

La implementación actual incluye:

- bcrypt con hash alternativo para reducir enumeración temporal de correos.
- Validación de usuario activo y empresa activa.
- JWT firmado con `issuer: pampa-api`, `audience: pampa-web` y expiración de 15 minutos.
- Cookie `pampa_access`, `HttpOnly`, `SameSite=Lax`, `Secure` sólo cuando `NODE_ENV === "production"`.
- `JwtAuthGuard` global mediante `APP_GUARD`.
- `@Public()` para excluir explícitamente `POST /auth/login`.
- Limitador en memoria: cinco fallos por combinación IP/correo durante quince minutos.
- Recuperación de usuario, empresa, roles y permisos desde PostgreSQL.
- Actualización de `last_login_at`.

### 2.3 Autorización

No existe:

- `PermissionGuard`.
- `@RequirePermissions()`.
- comprobación de permisos en services.
- scoping de `companies` por tenant autenticado.
- contexto tenant inyectado en repositories.
- validación de alcance por sucursal.
- módulo de administración de usuarios, roles o permisos.
- revocación persistente de sesiones.

El frontend oculta el dashboard cuando `/auth/me` falla, pero esto es sólo experiencia de usuario. La seguridad efectiva debe permanecer en la API.

## 3. Inventario de modelos reales

La fuente de verdad es `pampa-api/prisma/schema.prisma`.

### 3.1 `user`

Campos relevantes:

- `id`: UUID, PK.
- `company_id`: UUID obligatorio, FK a `company.id`.
- `branch_id`: UUID opcional, FK a `branch.id`.
- `email`: `VARCHAR(255)`, único globalmente mediante `uq_user_email`.
- `password_hash`: obligatorio.
- `last_login_at`: opcional.
- `is_active`: `true` por defecto.
- `created_at`, `updated_at`.

Índices:

- `idx_user_branch` sobre `branch_id`.
- `idx_user_company` sobre `company_id`.

Borrado:

- Las FKs hacia `company` y `branch` usan `ON DELETE NO ACTION`.
- Las filas de `user_role` usan `ON DELETE CASCADE` al eliminar el usuario.

Riesgo de integridad: nada exige que `branch_id` pertenezca a `company_id`.

### 3.2 `company`

Campos relevantes:

- `id`: UUID, PK.
- `company_type_id`, `tax_condition_id`, `currency_id`: FKs obligatorias.
- `tax_id`: único globalmente.
- `is_active`: `true` por defecto.
- `created_at`, `updated_at`.

Relaciones directas:

- `branch`, `client`, `product`, `product_category`, `role`, `sale`, `user`, `warehouse`.

Las FKs de catálogos usan `ON DELETE NO ACTION`.

### 3.3 `branch`

Campos relevantes:

- `id`: UUID, PK.
- `company_id`: FK obligatoria a `company`.
- `address_id`: FK obligatoria a `address`.
- `code`, `is_main`, `is_active`.

Restricción:

- `uq_branch_code` sobre `(company_id, code)`.

Borrado:

- FKs a `company` y `address`: `ON DELETE NO ACTION`.

No existe módulo funcional de branches. El esquema no garantiza una única sucursal principal por empresa.

### 3.4 `role`

Campos relevantes:

- `id`: UUID, PK.
- `company_id`: FK obligatoria a `company`.
- `name`: nombre del rol.
- `is_system`: `false` por defecto.
- `is_active`: `true` por defecto.

Restricciones e índices:

- `uq_role_company_name` sobre `(company_id, name)`.
- `idx_role_company` sobre `company_id`.

Borrado:

- FK a `company`: `ON DELETE NO ACTION`.
- Al eliminar un rol, `user_role` y `role_permission` asociados se eliminan por cascada.

Los nombres sugeridos `OWNER`, `ADMINISTRATOR`, `MANAGER`, `SELLER`, `CASHIER`, `WAREHOUSE`, `ACCOUNTANT` y `VIEWER` caben en `name` y respetan su unicidad por empresa. Sin embargo, el modelo no dispone de un código inmutable que permita distinguir con seguridad un rol de sistema de un rol personalizado con nombre similar.

### 3.5 `permission`

Campos relevantes:

- `id`: UUID, PK.
- `code`: `VARCHAR(100)`, único globalmente mediante `uq_permission_code`.
- `name`, `module`, `description`.
- `created_at`, `updated_at`.

Índice:

- `idx_permission_module` sobre `module`.

No tiene `company_id`: el catálogo de permisos es global, lo cual encaja con permisos atómicos definidos por la plataforma.

### 3.6 `user_role`

- PK compuesta `(user_id, role_id)`.
- FKs a `user` y `role`, ambas con `ON DELETE CASCADE`.
- No contiene `company_id` ni `branch_id`.

Riesgo crítico: la base permite asignar a un usuario de una empresa un rol perteneciente a otra empresa.

### 3.7 `role_permission`

- PK compuesta `(role_id, permission_id)`.
- FKs a `role` y `permission`, ambas con `ON DELETE CASCADE`.

La relación es adecuada para permisos globales asignados a roles por empresa.

### 3.8 Entidades tenant-owned adicionales

Con `company_id` directo:

- `client`
- `product`
- `product_category`
- `sale`
- `warehouse`

Con tenant indirecto:

- `invoice` y `payment` mediante `sale`.
- `sale_item` mediante `sale` y `product`.
- `stock` mediante `warehouse` y `product`.
- `stock_movement` mediante `warehouse`, `product` y opcionalmente `user`.

Entidades globales:

- `country`, `state`, `city`, `address`.
- `company_type`, `tax_condition`, `currency`.
- `permission`.

Aunque `address` es global en el esquema, su acceso de negocio deberá limitarse mediante la entidad propietaria que lo referencia.

## 4. Inventario de endpoints

Todos los endpoints siguientes están protegidos por el `APP_GUARD`, excepto donde se indica `Público`.

| Método | Ruta | Estado |
| --- | --- | --- |
| POST | `/auth/login` | Público; funcional |
| GET | `/auth/me` | Funcional |
| POST | `/auth/logout` | Funcional |
| GET | `/companies` | Funcional; sin tenant scope |
| GET | `/companies/:id` | Funcional; sin tenant scope |
| POST | `/companies` | Funcional; sin permiso |
| PATCH | `/companies/:id` | Funcional; sin tenant scope ni permiso |
| DELETE | `/companies/:id` | Soft delete; sin tenant scope ni permiso |
| GET | `/countries` | Funcional; catálogo global |
| GET | `/countries/:id` | Funcional; catálogo global |
| POST | `/countries` | Funcional; sin permiso administrativo |
| PUT | `/countries/:id` | Funcional; sin permiso administrativo |
| DELETE | `/countries/:id` | Soft delete; sin permiso administrativo |
| GET | `/company-types` | Funcional; catálogo global |
| GET | `/tax-conditions` | Funcional; catálogo global |
| GET | `/currencies` | Funcional; catálogo global y sólo activos |

Los controllers de `cities` y `provinces` existen como esqueletos, pero sus módulos no están importados en `AppModule`; no forman parte de la API efectiva. No deben considerarse implementación funcional.

Swagger está disponible en `/api`, pero:

- no declara esquema de cookie/JWT para operación autenticada;
- no documenta permisos requeridos;
- no muestra tenant o branch scope;
- el e2e existente espera acceso anónimo a `/countries`, lo que contradice el guard global actual.

## 5. Flujo actual de autenticación

1. `LoginDto` normaliza el correo y valida formato y longitudes.
2. `AuthController.login` aplica rate limiting por IP y correo.
3. `AuthService.login` llama a `AuthRepository.findByEmail`.
4. El repository selecciona usuario, empresa, roles activos y permisos.
5. bcrypt compara la contraseña; si el usuario no existe usa un hash alternativo.
6. El service exige `user.is_active` y `company.is_active`.
7. `toAuthenticatedUser` descarta roles inactivos, agrega nombres de roles y deduplica códigos de permisos.
8. Se firma un JWT con `sub`, `companyId`, `branchId`, `email`, `roles` y `permissions`.
9. Se actualiza `last_login_at`.
10. El controller guarda el token en `pampa_access`.
11. `JwtStrategy` extrae la cookie, valida firma, expiración, issuer y audience.
12. Passport copia el payload directamente a `request.user`.
13. `GET /auth/me` vuelve a consultar PostgreSQL por `sub`.

Observación: los endpoints de negocio no vuelven a validar usuario/empresa activos ni permisos. Durante hasta 15 minutos confían en el payload emitido.

## 6. Riesgos encontrados

| Severidad | Archivo / función | Riesgo | Ejemplo conceptual | Corrección recomendada |
| --- | --- | --- | --- | --- |
| Crítica | `auth/auth.types.ts`, `auth.service.ts`, `jwt.strategy.ts` | Roles y permisos viajan en JWT pero nunca son evaluados. | Un usuario sin roles puede invocar cualquier endpoint cargado. | Crear `@RequirePermissions()` y `PermissionGuard`; denegar por defecto las operaciones de negocio sin metadata o política explícita. |
| Crítica | `core/companies/repositories/company.repository.ts`, todas las consultas CRUD | Acceso global a tenants. | Un usuario de empresa A lista, lee, modifica o desactiva empresa B. | Rediseñar endpoints tenant-self; filtrar por `id = securityContext.companyId`. Reservar administración global para un contexto de plataforma separado. |
| Alta | `auth/repositories/auth.repository.ts`, `authenticatedUserSelect` | Acepta roles vinculados al usuario sin comprobar que `role.company_id === user.company_id`. | Una asignación cruzada errónea otorga permisos de otro tenant y éstos se incorporan al JWT. | Filtrar roles por `company_id` y agregar integridad en DB; rechazar inconsistencias durante autenticación. |
| Alta | `auth/repositories/auth.repository.ts`, `findById` y `updateLastLogin` | Consultas sólo por ID; hoy el ID viene de un JWT firmado, pero el patrón no es reutilizable para recursos tenant. | Copiar este patrón a Users produciría IDOR. | Definir contratos explícitos: operaciones del principal por `sub`; recursos de negocio por clave compuesta tenant/recurso. |
| Alta | `auth/login-throttle.service.ts` | Rate limit local y no acotado en memoria. | Varias instancias permiten multiplicar intentos; muchas claves únicas hacen crecer el `Map`. | Almacén distribuido con TTL y límites por IP/cuenta; limpieza automática; confiar en IP sólo detrás de proxy configurado. |
| Alta | `auth/auth.controller.ts`, `logout` | Logout sólo elimina la cookie; el JWT robado sigue válido hasta expirar. | Reutilización del token fuera del navegador después de logout. | Sesión persistente, refresh hash, revocación y validación de `sessionId`. |
| Media | `auth/auth.controller.ts`, `cookieOptions` | `Secure` depende de que `NODE_ENV` sea exactamente `production`. | Un despliegue mal configurado emite cookie no segura. | Validación de entorno fail-fast; en entornos no locales, `Secure` obligatorio. |
| Media | `auth/auth.controller.ts`, `login` | Todo error dentro del `try`, incluso fallos de DB, incrementa intentos. | Una caída de PostgreSQL bloquea temporalmente cuentas. | Registrar fallo sólo para credenciales inválidas; distinguir error operativo. |
| Media | `auth/auth.service.ts`, `login` | `last_login_at` se actualiza después de firmar; un fallo de actualización impide login aunque el token ya se generó en memoria. | Indisponibilidad parcial produce error sin semántica clara. | Definir transacción/orden y política explícita para auditoría no crítica. |
| Media | `main.ts` y Swagger | Swagger no representa cookie auth ni permisos. | Integradores interpretan endpoints como utilizables sin contexto. | Agregar seguridad Swagger y documentar permisos por operación. |
| Media | `test/app.e2e-spec.ts` | Espera 200 anónimo en `/countries`, contradictorio con `APP_GUARD`. | La prueba e2e falla o valida una política obsoleta. | Definir si catálogos de lectura son públicos; actualizar tests tras aprobación. |
| Baja | Specs de `auth` | Sólo comprueban que controller/service existan. | Regresiones en login, permisos, cookie o estado activo no se detectan. | Tests unitarios de caminos positivos/negativos y e2e de autorización. |

## 7. Riesgos de aislamiento multiempresa

### 7.1 Consultas actuales sin `company_id`

`CompanyRepository`:

- `findAll`: devuelve todas las empresas activas.
- `findById`: UUID global.
- `findByTaxId` y `findByTaxIdExcludingId`: globales; esto puede ser correcto para unicidad fiscal, pero no para devolver información.
- `update` y `delete`: operan sólo por `id`.

`AuthRepository`:

- `findByEmail`: el correo es único globalmente; identifica una cuenta, pero no valida consistencia tenant de sus roles o sucursal.
- `findById`: adecuado sólo para el principal autenticado.

Los repositories de países, tipos de empresa, condiciones fiscales y monedas consultan catálogos globales; no requieren `company_id`, pero sus escrituras deben ser permisos de plataforma, no permisos de un tenant normal.

### 7.2 IDOR y escalada horizontal

El UUID no constituye autorización. El riesgo actual se materializa al proporcionar a `/companies/:id` el UUID de otro tenant. La misma regla deberá prevenirse desde el diseño en Users, Branches y todos los futuros módulos tenant-owned.

La corrección no debe consistir en:

- comparar sólo en el controller;
- aceptar `companyId` del body/query;
- ocultar botones en frontend;
- hacer una consulta global y comprobar después;
- confiar en roles/permisos enviados por el cliente.

La consulta debe incluir el tenant:

```text
where: {
  id: resourceId,
  company_id: securityContext.companyId
}
```

Cuando el modelo no tiene `company_id`, el repository debe atravesar una relación propietaria en la propia consulta.

### 7.3 Relaciones indirectas que requieren validación

- `user.branch_id` debe apuntar a una branch de `user.company_id`.
- `user_role.role_id` debe pertenecer a `user.company_id`.
- `warehouse.branch_id` debe pertenecer a `warehouse.company_id`.
- `product.category_id`, si existe, debe pertenecer a `product.company_id`.
- `sale.branch_id`, `client_id` y `user_id` deben pertenecer a `sale.company_id`.
- `sale_item.product_id` debe pertenecer a la misma empresa que la sale.
- `stock.product_id` y `warehouse_id` deben pertenecer a la misma empresa.
- `stock_movement.product_id`, `warehouse_id` y `created_by` deben pertenecer a la misma empresa.
- `invoice` y `payment` heredan tenant desde `sale`; toda consulta por sus IDs debe filtrar mediante `sale.company_id`.

### 7.4 Alcance por sucursal

`user.branch_id` expresa como máximo una sucursal asociada. No define si:

- es una sucursal de inicio;
- es la única sucursal permitida;
- el usuario puede acceder a varias sucursales;
- OWNER/ADMINISTRATOR ignoran el límite.

Hasta aprobar esta semántica no debe usarse `branch_id` como autorización definitiva.

## 8. Arquitectura RBAC propuesta

### 8.1 Principios

- Los permisos son capacidades atómicas globales definidas por PAMPA.
- Los roles pertenecen a una empresa.
- Un rol agrupa permisos.
- Un usuario sólo puede recibir roles de su propia empresa.
- El backend decide; el frontend sólo adapta la interfaz.
- Toda decisión combina permiso y alcance tenant/branch.
- Denegación por defecto.
- OWNER es un rol de sistema protegido, no sólo un nombre editable.

### 8.2 Flujo de autorización

```text
Request
  -> JwtAuthGuard
  -> SecurityContextResolver
  -> PermissionGuard
  -> Controller
  -> Service
  -> Tenant-scoped Repository
  -> Prisma
  -> PostgreSQL
```

`PermissionGuard` responde “¿puede realizar esta acción?”. El repository responde “¿puede afectar este registro dentro de su tenant?”. Ambos controles son obligatorios.

### 8.3 Reglas de administración de roles

- Sólo OWNER puede asignar o retirar roles equivalentes a administración total.
- ADMINISTRATOR puede administrar usuarios y roles no protegidos si posee permisos explícitos.
- Ningún usuario puede elevar sus propios permisos.
- Una operación de asignación debe rechazar roles cuyo `company_id` difiera del usuario objetivo.
- `is_system = true` debe impedir renombrar, desactivar o eliminar el rol desde flujos normales.
- Los permisos de un rol de sistema sólo pueden cambiar mediante una operación de plataforma/versionada.
- Antes de retirar OWNER, desactivar o eliminar al usuario, una transacción debe comprobar que permanezca al menos otro OWNER activo en la empresa.
- La comprobación de último OWNER debe bloquear concurrentemente las filas relevantes o contar con protección SQL adicional; un simple `count` no transaccional tiene carrera.
- Los roles personalizados serán editables por empresa, pero nunca podrán recibir capacidades reservadas de plataforma.

## 9. Roles iniciales

Los nombres encajan en `role.name`, pero se recomienda asociarlos en el futuro a un identificador inmutable, separado de la etiqueta visible.

| Rol | Finalidad | Permisos iniciales | Restricciones | Editable | Alcance |
| --- | --- | --- | --- | --- | --- |
| OWNER | Propietario del tenant | Todos los permisos tenant, gestión de roles y owners | No puede eliminarse el último OWNER; no asignable por usuarios comunes | No | Empresa completa |
| ADMINISTRATOR | Administración operativa | Empresas propias, sucursales, usuarios, roles no protegidos y configuración operativa | No administra OWNER ni se autoeleva | No en primera etapa | Empresa completa |
| MANAGER | Supervisión general | Lectura amplia y operación de ventas, clientes, productos e inventario | Sin gestión de seguridad ni cambios estructurales críticos | Sí, luego de estabilizar | Empresa; opcionalmente sucursales asignadas |
| SELLER | Ventas y clientes | Clientes, productos en lectura, ventas create/read/update limitada | Sin ajustes de stock, roles ni configuración | Sí | Sucursal asignada |
| CASHIER | Cobros | Ventas en lectura, pagos create/read y reembolsos si se autoriza | Sin edición de catálogo o stock | Sí | Sucursal asignada |
| WAREHOUSE | Depósito | Productos en lectura, depósitos/stock en lectura, movimientos, ajuste/transferencia según permiso | Sin precios sensibles ni seguridad | Sí | Depósitos de sucursales asignadas |
| ACCOUNTANT | Administración contable | Ventas, pagos e invoices en lectura/gestión fiscal definida | Sin usuarios, roles o stock físico | Sí | Empresa completa |
| VIEWER | Consulta | Permisos `.read` seleccionados | Ninguna mutación | Sí | Empresa o sucursal |

Los conjuntos exactos deben aprobarse con Product Owner. En especial, refund, cancel, adjust y transfer deben separarse de update genérico.

## 10. Catálogo inicial de permisos

Convención: `recurso.accion`, en minúsculas.

| Recurso | Permisos propuestos |
| --- | --- |
| companies | `companies.read`, `companies.update` |
| branches | `branches.read`, `branches.create`, `branches.update`, `branches.delete` |
| users | `users.read`, `users.create`, `users.update`, `users.delete`, `users.assign_roles` |
| roles | `roles.read`, `roles.create`, `roles.update`, `roles.delete`, `roles.assign_permissions` |
| permissions | `permissions.read` |
| products | `products.read`, `products.create`, `products.update`, `products.delete` |
| product_categories | `product_categories.read`, `product_categories.create`, `product_categories.update`, `product_categories.delete` |
| warehouses | `warehouses.read`, `warehouses.create`, `warehouses.update`, `warehouses.delete` |
| stock | `stock.read`, `stock.adjust`, `stock.transfer` |
| stock_movements | `stock_movements.read`, `stock_movements.create` |
| clients | `clients.read`, `clients.create`, `clients.update`, `clients.delete` |
| sales | `sales.read`, `sales.create`, `sales.update`, `sales.cancel` |
| payments | `payments.read`, `payments.create`, `payments.refund` |
| invoices | `invoices.read`, `invoices.create`, `invoices.cancel` |

Decisiones:

- No se propone `companies.create` o `companies.delete` como permiso tenant: crear tenants es onboarding/plataforma y desactivar la propia empresa requiere un flujo especial.
- `permissions` es catálogo global; tenants lo leen, no lo crean ni modifican.
- `stock.update` se evita: las cantidades deben cambiar mediante `adjust` o `transfer`, generando `stock_movement`.
- `stock_movements` no debe tener update/delete porque funciona como historial.
- `sales.delete`, `payments.delete` e `invoices.delete` se sustituyen por acciones de negocio auditables.

Los catálogos globales (`countries`, `company_types`, `tax_conditions`, `currencies`) requieren permisos de plataforma separados; no deben asignarse a roles tenant hasta diseñar el rol de operador de plataforma.

## 11. Diseño de guards y decoradores

### 11.1 `@Public()`

Mantener el decorador actual para endpoints que no requieren identidad. Su uso debe ser excepcional y revisable. No marcar controllers de negocio completos como públicos.

### 11.2 `JwtAuthGuard`

Responsabilidad:

- extraer y validar el access token;
- validar firma, expiración, issuer y audience;
- construir una identidad mínima;
- rechazar sesiones inexistentes o revocadas cuando exista `session`.

No debe decidir permisos de negocio.

### 11.3 `@RequirePermissions()`

Metadata declarativa:

```text
@RequirePermissions('companies.read')
```

Debe aceptar una política explícita de “todos” o “alguno” cuando una operación lo requiera, evitando semántica implícita.

### 11.4 `PermissionGuard`

Usa `Reflector` para leer la metadata y el contexto de seguridad resuelto por backend. Debe:

- denegar si falta metadata en endpoints de negocio, salvo una política explícita;
- comprobar permisos vigentes;
- ignorar roles inactivos;
- comprobar usuario, empresa y sesión activos;
- no aceptar permisos desde headers, body, query o params.

### 11.5 Contexto y decoradores de parámetros

Proponer:

- `@CurrentUser()` para el principal autenticado.
- `@SecurityContext()` para `{ userId, companyId, branchScope, permissions, sessionId }`.

Los decoradores sólo leen valores creados por guards/interceptors confiables. No consultan Prisma.

### 11.6 `TenantGuard`

No se recomienda un `TenantGuard` genérico como única defensa porque desconoce cómo cada recurso se relaciona con `company`.

Puede ser útil para validar un selector de sucursal o una ruta administrativa explícita, pero el aislamiento principal debe implementarse en services/repositories mediante un `SecurityContext` obligatorio. Los repositories tenant-owned no deben exponer métodos globales a módulos de negocio.

### 11.7 Orden

1. `JwtAuthGuard`.
2. Resolver/validar sesión y principal.
3. `PermissionGuard`.
4. Guard opcional de branch/contexto específico.
5. Controller.
6. Service con reglas de negocio.
7. Repository tenant-scoped.

En NestJS, si se registran varios `APP_GUARD`, el orden debe declararse y probarse explícitamente.

## 12. Estrategia de tenant isolation

### 12.1 Fuente del tenant

`companyId` procede del usuario/sesión autenticados. Nunca del body, query o params para operaciones tenant normales.

Si una ruta contiene `companyId`, sólo debe existir para un contexto de plataforma separado y explícito. No reutilizar roles tenant para administración global.

### 12.2 Contratos de repository

Ejemplos conceptuales:

```text
findById(companyId, resourceId)
update(companyId, resourceId, data)
delete(companyId, resourceId)
```

Para el tenant actual, `CompanyRepository` debería ofrecer `findCurrent(companyId)` y `updateCurrent(companyId, data)`, no `findAll()` global.

Las consultas indirectas deben filtrar por relación:

```text
invoice where id = invoiceId AND sale.company_id = companyId
stock where id = stockId AND warehouse.company_id = companyId
```

### 12.3 Branch scope

Primero debe aprobarse si el usuario:

- está limitado a una sola branch;
- puede pertenecer a varias;
- tiene una branch predeterminada y alcance empresa;
- hereda alcance según rol.

Recomendación: separar “branch predeterminada” de “branches autorizadas”. OWNER y ADMINISTRATOR pueden tener alcance empresa; roles operativos deben limitarse a branches/depositories asignados.

### 12.4 Defensa en base de datos

Después de aprobar el modelo:

- agregar claves/uniques compuestas que permitan FKs tenant-aware;
- validar asociaciones cruzadas mediante FKs compuestas cuando sea posible;
- usar transacciones para reglas no declarativas;
- evaluar PostgreSQL RLS como capa adicional, no como sustituto del scoping del repository.

RLS requiere una estrategia segura para establecer el tenant por transacción/conexión con pooling; no debe activarse sin prototipo y pruebas.

## 13. Propuesta de payload JWT

Payload actual:

```text
sub
companyId
branchId
email
roles[]
permissions[]
iss
aud
iat
exp
```

Problemas:

- roles/permisos quedan obsoletos hasta expirar;
- aumenta el tamaño de cada request;
- expone más información de identidad de la necesaria;
- no permite revocación inmediata;
- `branchId` mezcla asociación y autorización.

Payload propuesto:

```text
sub
companyId
sessionId
tokenVersion
iss
aud
iat
exp
```

Recomendación:

- No incluir roles ni permisos en el access token definitivo.
- Resolver permisos desde PostgreSQL o cache de corta duración.
- Cachear por `{ userId, companyId, tokenVersion }`.
- Invalidar cache al modificar usuario, roles, permisos, empresa o sesión.
- Mantener access tokens cortos.
- Validar `sessionId`, revocación y `tokenVersion`.

`companyId` en JWT sirve como claim de contexto firmado, pero debe compararse con la sesión/usuario vigente. No reemplaza el filtro tenant del repository.

## 14. Cambios Prisma propuestos, sin aplicar

No se modificó `schema.prisma`. Propuesta mínima para una etapa posterior:

| Modelo | Cambio propuesto | Finalidad / restricción | Índice | Riesgo y compatibilidad |
| --- | --- | --- | --- | --- |
| `user` | `token_version Int @default(0)` | Invalidar access tokens ante eventos de seguridad | No necesario inicialmente | Bajo; backfill por default |
| `role` | Código inmutable de sistema, nullable para personalizados | Distinguir OWNER real de un nombre editable; unicidad por empresa para códigos no nulos | Unique/partial unique por `(company_id, system_code)` | Medio; Prisma puede requerir SQL manual para índice parcial |
| `session` nuevo | `id`, `user_id`, hash de refresh, family, expiración, revocación, timestamps y metadata mínima | Rotación, revocación y detección de reutilización | `user_id`, hash único, `family_id`, `expires_at`, `revoked_at` | Medio; requiere backfill sólo para sesiones futuras |
| `user_role` | Protección de misma empresa | Impedir asignaciones cruzadas | Según estrategia compuesta | Alto; primero auditar y limpiar datos |
| `user`/`branch` | Integridad compuesta de branch/company | Impedir branch de otro tenant | Unique auxiliar `(id, company_id)` y FK compuesta | Medio; auditar datos existentes |
| `warehouse`/`branch` | FK tenant-aware | Misma empresa | Índice/FK compuesta | Medio |
| `product`/`product_category` | FK tenant-aware | Misma empresa | Índice/FK compuesta | Medio |
| `sale` y relaciones | FKs tenant-aware o validación equivalente | Branch, client y user de misma empresa | Índices compuestos | Alto; varias relaciones y datos existentes |
| `security_event` nuevo, etapa posterior | actor, user, company, session, tipo, resultado, metadata segura, timestamp | Auditoría de login, logout, bloqueo, cambios de credenciales y privilegios | `(company_id, created_at)`, `(user_id, created_at)`, `event_type` | Medio; definir retención y privacidad |

### Branch scope futuro

Si se aprueba acceso a múltiples sucursales, crear una relación explícita (por ejemplo, usuario-sucursal) será más correcto que sobrecargar `user.branch_id`. El nombre y campos deben decidirse en el sprint de modelo; no se fijan aquí como implementación.

### OWNER

El esquema actual no garantiza que una empresa tenga OWNER. Las opciones son:

1. Regla transaccional sobre `user_role` más rol de sistema inmutable.
2. Referencia explícita desde `company` a un propietario primario.
3. Trigger de base para impedir dejar una empresa sin OWNER.

Se recomienda comenzar con rol de sistema inmutable y servicio transaccional; evaluar trigger como defensa adicional. La referencia de propietario primario cambia la semántica hacia un único propietario y requiere decisión de producto.

## 15. Plan de migración

1. Congelar creación manual de roles hasta definir códigos.
2. Auditar datos reales:
   - usuarios con branch de otra empresa;
   - usuarios con roles de otra empresa;
   - warehouses con branch cruzada;
   - productos/categorías cruzados;
   - sales con branch/client/user cruzados;
   - stock y movimientos cruzados.
3. Definir y aprobar roles de sistema y matriz de permisos.
4. Seed idempotente de permisos globales.
5. Crear roles de sistema por empresa.
6. Asignar OWNER al usuario inicial mediante una operación auditada.
7. Incorporar sesiones y `token_version`.
8. Migrar login a access/refresh rotativo.
9. Introducir constraints tenant-aware por grupos, después de limpiar inconsistencias.
10. Implementar guards y repositories scoped.
11. Activar módulos funcionales sólo después de sus pruebas de aislamiento.
12. Evaluar RLS en un ADR y prototipo separado.

Cada migración debe incluir respaldo, consulta previa de incompatibilidades y estrategia de rollback. La baseline contiene comentarios y `CHECK` manuales; futuras migraciones deben preservar esas construcciones.

## 16. Estrategia de pruebas

### Unitarias

- Login válido e inválido.
- Usuario inactivo y empresa inactiva.
- Rol inactivo ignorado.
- Rol de otro tenant rechazado.
- `PermissionGuard`: sin metadata, permiso ausente, permiso presente, sesión revocada.
- Protección de último OWNER.
- Prohibición de autoelevación.
- Repositories siempre reciben `companyId`.

### Integración

Crear fixtures de empresa A y B:

- usuario A no puede leer/modificar IDs de B;
- branch A no puede asociarse a user/warehouse B;
- role A no puede asignarse a user B;
- product A no puede usarse en sale/stock B;
- invoice/payment sólo se acceden a través de sale del tenant;
- scopes de sucursal se respetan.

### E2E

- Login, me, refresh, logout y revocación.
- Matriz de roles y permisos por endpoint.
- 401 sin identidad; 403 con identidad sin permiso; 404 o respuesta neutral para recurso ajeno según política.
- Cookies de producción.
- Rate limit distribuido.
- Swagger refleja seguridad.

### Seguridad

- IDOR horizontal.
- escalada vertical;
- manipulación de claims/cookies;
- token expirado/revocado;
- reutilización de refresh token;
- concurrencia al retirar OWNER;
- aislamiento bajo operaciones concurrentes.

No usar datos productivos ni ejecutar pruebas destructivas contra la base real.

## 17. Decisiones pendientes

1. ¿PAMPA tendrá operadores de plataforma separados de usuarios tenant?
2. ¿Quién puede crear o desactivar una empresa?
3. ¿Puede una persona usar el mismo correo en varias empresas? El esquema actual no.
4. ¿Puede una empresa tener varios OWNER?
5. ¿`user.branch_id` es sucursal única, predeterminada o ambas?
6. ¿Los usuarios pueden acceder a múltiples sucursales?
7. ¿Los permisos de sistema pueden evolucionar automáticamente por versión?
8. ¿Qué permisos exactos recibe cada rol inicial?
9. ¿ADMINISTRATOR puede crear roles personalizados?
10. ¿Qué acciones requieren reautenticación o aprobación dual?
11. ¿Duración de access token, refresh token y sesión?
12. ¿Política de sesiones simultáneas y dispositivos?
13. ¿Se adoptará Redis u otro almacén para cache/rate limiting?
14. ¿Se incorporará RLS como defensa adicional?
15. ¿Qué política de respuesta se usará para recursos de otro tenant: 404 neutral o 403?

## 18. Plan de implementación por etapas

### Etapa 0 — Contención

- No publicar CRUD tenant sin scoping.
- Restringir temporalmente operaciones críticas.
- Corregir la expectativa e2e de endpoints públicos después de aprobar la política.

### Etapa 1 — Contrato de seguridad

- Aprobar roles, permisos, OWNER, branch scope y operador de plataforma.
- Documentar ADRs.
- Diseñar `SecurityContext`.

### Etapa 2 — Autorización sin cambio de sesión

- Implementar `@RequirePermissions()` y `PermissionGuard`.
- Aplicar permisos a endpoints.
- Convertir repositories actuales a tenant-scoped.
- Agregar pruebas A/B de aislamiento.

### Etapa 3 — Datos RBAC

- Aprobar cambios Prisma.
- Crear migración revisada.
- Seed idempotente de permisos y roles.
- Asignar OWNER.
- Implementar Users/Roles con reglas anti-escalada.

### Etapa 4 — Sesiones

- Session y token version.
- Refresh rotation y reuse detection.
- Revocación y cierre de todas las sesiones.
- Rate limiting distribuido.

### Etapa 5 — Integridad tenant

- Limpiar inconsistencias.
- Aplicar constraints compuestos progresivamente.
- Evaluar RLS mediante ADR/prototipo.

### Etapa 6 — Hardening

- Security events.
- recuperación/cambio de contraseña;
- MFA;
- revisión externa;
- CI/CD con pruebas de aislamiento obligatorias.

No se debe iniciar la siguiente etapa sin aprobar la anterior y sus pruebas.

## 19. Estado del Sprint 2 — autorización y aislamiento de Companies

### 19.1 Decisiones aprobadas

- Una empresa puede tener múltiples OWNER y siempre deberá conservar al menos uno activo. La administración de OWNER queda fuera de este sprint.
- `user.branch_id` es temporalmente la sucursal predeterminada, no el alcance definitivo.
- Usuarios tenant y futuros operadores de plataforma serán identidades separadas.
- No existirá `SUPER_ADMIN` tenant.
- Un recurso ajeno al tenant debe responder como no encontrado; la falta de permiso responde 403 y la falta de autenticación responde 401.
- ADMINISTRATOR no puede administrar OWNER, roles de sistema, otras empresas, catálogos globales ni sus propios privilegios.

### 19.2 Archivos creados

- `auth/types/security-context.ts`
- `auth/types/authenticated-request.ts`
- `auth/decorators/current-user.decorator.ts`
- `auth/decorators/current-security-context.decorator.ts`
- `auth/decorators/require-permissions.decorator.ts`
- `auth/guards/permission.guard.ts`
- `core/companies/company.permissions.ts`
- specs unitarios de PermissionGuard, orden de guards y CompanyRepository.
- `test/companies-security.e2e-spec.ts`

### 19.3 Flujo efectivo

```text
JwtAuthGuard
  -> JwtStrategy construye SecurityContext
  -> PermissionGuard
  -> CompaniesController
  -> CompaniesService
  -> CompanyRepository tenant-scoped
  -> Prisma
  -> PostgreSQL
```

Los `APP_GUARD` están registrados en ese orden y existe una prueba que fija el contrato.

### 19.4 Política transitoria

- `@RequirePermissions()` exige que estén presentes todos los permisos declarados.
- Companies requiere `companies.read` o `companies.update` según la operación.
- Los demás módulos continúan temporalmente sólo autenticados cuando no tienen metadata, para no ampliar el sprint.
- Los roles y permisos todavía proceden del JWT de corta duración. Es una solución transitoria hasta implementar sesiones/cache; no se rediseñó el payload.
- AuthService descarta roles cuyo `role.company_id` no coincide con `user.company_id`, por lo que una relación cruzada no otorga permisos.

### 19.5 Endpoints vigentes

| Método | Ruta | Permiso | Alcance |
| --- | --- | --- | --- |
| GET | `/companies/current` | `companies.read` | Empresa autenticada |
| PATCH | `/companies/current` | `companies.update` | Empresa autenticada |

Se retiraron del controller tenant:

- `GET /companies`
- `GET /companies/:id`
- `POST /companies`
- `PATCH /companies/:id`
- `DELETE /companies/:id`

No se creó un controller de plataforma.

### 19.6 Aislamiento

- `companyId` se obtiene exclusivamente del `SecurityContext` creado a partir del JWT firmado.
- Controller y DTO no reciben UUID de empresa.
- `findCurrent` incluye `id = companyId` e `is_active = true` en la consulta.
- `updateCurrent` incluye los mismos filtros en `updateMany` y devuelve 404 cuando no actualiza exactamente una fila.
- `UpdateCompanyDto` no permite `isActive`; `ValidationPipe` rechaza campos no declarados.
- Las pruebas A/B confirman que query/body no cambian el tenant, las rutas globales devuelven 404 y empresa B permanece intacta.

### 19.7 Swagger

Swagger documenta:

- cookie `pampa_access`;
- autenticación requerida;
- permisos por endpoint;
- alcance de empresa autenticada;
- respuestas 401, 403 y 404.

### 19.8 Deuda restante

- El frontend de Companies conserva el contrato CRUD global anterior y deberá rediseñarse como pantalla de “Mi empresa” antes de volver a habilitarse.
- El usuario existente necesita asignación futura de rol/permisos para acceder a Companies.
- La metadata permisiva para módulos no migrados debe eliminarse progresivamente.
- Roles/permisos siguen en JWT hasta el sprint de sesiones.
- Falta integridad PostgreSQL contra relaciones cross-tenant.
- OWNER, Users, Branches, seeds, sesiones y refresh tokens no se implementaron.

### 19.9 Alcance de datos

`schema.prisma` no fue modificado y no se creó ni ejecutó ninguna migración durante este sprint.

## 20. Estado del Sprint 3 — bootstrap RBAC y OWNER

### 20.1 Identidad inmutable de roles

`role.system_code VARCHAR(30)` es nullable. Los roles personalizados mantienen
`NULL`; los roles de sistema usan uno de los códigos tipados aprobados. La
restricción `UNIQUE(company_id, system_code)` impide duplicar un rol de sistema
en una empresa. PostgreSQL permite múltiples `NULL` en este índice, por lo que
varios roles personalizados no colisionan por `system_code`.

La migración local aplicada es
`20260729120000_add_role_system_code`. Es aditiva: agrega la columna y el índice;
no elimina ni renombra datos existentes.

### 20.2 Fuente de verdad y bootstrap

`rbac.definitions.ts` contiene el catálogo global de 48 permisos tenant, los
ocho roles y su matriz exacta. `RbacBootstrapService` coordina el caso de uso y
`RbacRepository` concentra Prisma. El comando explícito:

```text
npm run rbac:bootstrap
```

ejecuta una transacción, actualiza únicamente metadata autorizada de permisos,
crea o reactiva roles de sistema para empresas activas y sincroniza exactamente
sus relaciones `role_permission`. No se ejecuta durante el arranque normal de
la API y puede repetirse sin duplicados.

No se crean roles para empresas inactivas. Cuando una empresa se active, el
bootstrap debe ejecutarse antes de habilitar sus usuarios.

### 20.3 OWNER inicial y reglas protegidas

La asignación inicial es explícita e idempotente:

```text
npm run rbac:assign-owner -- --email=<correo>
```

El correo se normaliza y no está hardcodeado. El servicio exige usuario y
empresa activos y localiza `OWNER` por `(company_id, system_code)`, nunca por
nombre visible. Un segundo uso confirma la asignación existente.

Los flujos reutilizables de dominio bloquean:

- modificar, renombrar, desactivar o eliminar roles de sistema;
- usar un rol de otra empresa;
- asignar OWNER desde un rol inferior;
- autoelevación;
- retirar o desactivar al último OWNER activo.

Retirar OWNER o desactivar un usuario se ejecuta en una transacción que obtiene
un advisory lock de PostgreSQL derivado de `company_id`. Esto serializa las
mutaciones de OWNER de una misma empresa antes de comprobar que exista otro
OWNER activo y evita la carrera de dos conteos aislados.

### 20.4 Integración transitoria con autenticación

Auth recupera los roles de sistema por `system_code`; para roles personalizados
usa el nombre. Continúa descartando cualquier rol cuyo `company_id` no coincida
con el usuario. Los permisos sincronizados se incorporan al contexto transitorio
actual y habilitan `companies.read` y `companies.update`.

Como roles y permisos siguen dentro del JWT de 15 minutos, un token emitido
antes del bootstrap no se actualiza. El usuario debe cerrar sesión e iniciarla
otra vez. No se agregaron refresh tokens, sesiones, Redis ni MFA.

### 20.5 Límites y deuda

- Las reglas de OWNER no tienen endpoints públicos todavía.
- La integridad cross-tenant de `user_role` sigue defendida por aplicación; una
  constraint de PostgreSQL requiere un sprint separado y auditoría previa.
- El catálogo se actualiza desde una fuente versionada; un cambio semántico en
  un código existente requiere revisión humana.
- Prisma 6 advierte que la configuración `package.json#prisma` será eliminada
  en Prisma 7; el proyecto ya posee `prisma.config.ts`, pero queda limpiar la
  entrada heredada en un mantenimiento posterior.
- VIEWER no recibe permisos predeterminados en esta versión.

El procedimiento operativo y el diagnóstico están en `docs/rbac-bootstrap.md`.
# Actualización: administración tenant y sesiones

La implementación vigente amplía la arquitectura con Users, Roles y Branches bajo el flujo Controller → Service → Repository → Prisma → PostgreSQL. `companyId` proviene exclusivamente de `SecurityContext`; los identificadores externos al tenant producen 404 neutral.

El access token ya no transporta roles ni permisos. La sesión persistente y `token_version` permiten revocación real; el contexto autorizado se reconstruye desde PostgreSQL. Los cambios de roles y permisos incrementan la versión del usuario afectado.

La integridad tenant se refuerza con claves foráneas compuestas para user-branch, user-role y warehouse-branch, más un índice parcial que permite como máximo una sucursal principal activa. Consultar [sessions-password-recovery.md](./sessions-password-recovery.md) para el protocolo completo.
