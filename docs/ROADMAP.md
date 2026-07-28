# PAMPA ERP — Roadmap de arquitectura e implementación

**Estado:** vigente desde su adopción.
**Propósito:** ordenar la evolución de PAMPA como ERP multiempresa y multisucursal sin avanzar módulos sobre una base no verificada.

El código actual y `pampa-api/prisma/schema.prisma` prevalecen sobre documentación histórica cuando exista conflicto. Este roadmap no invalida funcionalidades preexistentes: establece la compuerta de avance para el trabajo posterior a su adopción.

## Estado inicial al adoptar este roadmap

PAMPA se encuentra en una transición desde una base inicial hacia un proceso de sprints formal. Por ello, el estado inicial no representa una secuencia lineal ya cumplida.

| Área | Estado al adoptar el roadmap |
| --- | --- |
| Fundación técnica | Parcial: existen Next.js, NestJS, Prisma, PostgreSQL, Swagger, validación y manejo global de respuestas/errores; faltan los bloqueos de cierre definidos en Sprint 0. |
| Empresas | Completo funcionalmente: CRUD con NestJS, Prisma y PostgreSQL, catálogos comerciales, formulario RHF/Zod, validaciones y pruebas verdes. Es una excepción histórica explícita. |
| Catálogos geográficos | Parcial: `country` funciona; `state` y `city` existen en Prisma, pero sus módulos reales están pendientes. |
| Seguridad | Pendiente: auth, usuarios, RBAC y empresa activa no están implementados. |
| Sucursales y direcciones | Pendiente: los modelos existen, pero no hay módulo operativo. |
| CRM, catálogo, inventario, compras, ventas, facturación, finanzas, integraciones y ATLAS AI | Pendientes como capacidades funcionales. Algunos modelos Prisma existen; eso no equivale a un módulo implementado. |

### Excepción histórica: Empresas

Empresas y sus catálogos comerciales se desarrollaron antes de formalizar este roadmap. Se mantiene como **módulo funcional existente**, no como trabajo inválido ni sujeto a rehacerse por el orden nuevo. Su estado es **Completado funcionalmente — excepción histórica**.

La regla de avance se aplica estrictamente desde el **Sprint 0 de Fundación técnica pendiente**. Al completarlo, el siguiente sprint operativo será Catálogos y geografía real. Empresas debe permanecer verde mediante la regla de regresión definida más abajo.

## Regla de avance obligatoria

Desde la adopción de este roadmap, un sprint solo puede comenzar cuando el sprint operativo anterior figure como **Completado** y haya cumplido sus criterios de aceptación y los criterios transversales.

Un criterio pendiente, una verificación fallida o una decisión de arquitectura sin resolver bloquea el inicio del siguiente sprint. Una excepción futura requiere aprobación explícita del Product Owner y un ADR con alcance, riesgo aceptado y plan de recuperación. Las excepciones no habilitan módulos de negocio antes de seguridad, aislamiento tenant o integridad de datos.

## Arquitectura objetivo

```text
Next.js App Router
  Page → Componentes → Hooks → Services → API HTTP

NestJS
  Controller → Service → Repository → Prisma → PostgreSQL
```

- `company` es el tenant principal.
- `branch` define el contexto operativo únicamente después de que el módulo Sucursales exista.
- PostgreSQL protege reglas expresables mediante PK, FK, `UNIQUE`, índices y restricciones.
- Los controllers son delgados; Prisma solo se usa en repositories.
- Las APIs conservan el sobre de respuesta global y DTOs validados.
- El frontend no llama `fetch` desde páginas o componentes de dominio; utiliza services y hooks.
- Cada entidad de PAMPA UI declara `singular`, `plural` y `gender`; el framework no infiere idioma.

## Dependencias transversales

| Capacidad | Debe estar lista antes de |
| --- | --- |
| Fundación técnica mínima cerrada | Todo sprint operativo posterior a la adopción |
| Empresa funcional | Seguridad y cualquier módulo multiempresa |
| Country, state, city y direcciones | Sucursales y entidades que requieran domicilio |
| Identidad, autenticación, RBAC y empresa activa | Sucursales, CRM, productos, depósitos, compras, ventas, finanzas e integraciones con acceso de usuario |
| Sucursal activa | Depósitos, inventario, compras, ventas, facturación y reportes operativos; no Seguridad |
| Clientes y productos | Ventas |
| Productos y depósitos | Inventario |
| Inventario transaccional | Compras y ventas que afecten existencias |
| Compras, ventas y facturación | Finanzas, contabilidad y reportes financieros |
| Auditoría y observabilidad básica | Integraciones y ATLAS AI |

## Criterios transversales de finalización

Todos los sprints deben cumplir, además de sus criterios particulares:

1. Alcance implementado sin cambios de esquema no aprobados.
2. Controller → Service → Repository → Prisma respetado en backend.
3. DTOs, errores HTTP y Swagger actualizados para contratos públicos.
4. Loading, error, éxito y estado vacío reales en toda pantalla operativa creada.
5. Sin UUIDs visibles para el usuario en campos basados en catálogos.
6. Sin mocks, controles simulados ni acciones visuales que aparenten funcionar.
7. Tests unitarios relevantes y e2e del flujo expuesto pasan.
8. Frontend: TypeScript, ESLint y build pasan.
9. Backend: ESLint, build, `prisma validate`, tests unitarios y e2e pasan.
10. Validación manual proporcional al riesgo contra PostgreSQL local o entorno controlado.
11. No se pierden cambios locales preexistentes ni se ejecutan operaciones destructivas fuera del alcance.

## Regla de regresión de Empresas

Empresas es un módulo funcional existente y debe mantenerse verde. Todo sprint posterior debe volver a ejecutar sus verificaciones unitarias, e2e y manuales cuando cambie cualquiera de estos contratos compartidos:

- catálogos comerciales (`company_type`, `tax_condition` o `currency`);
- tenant `company`, UUIDs o aislamiento de datos;
- autenticación, autorización, empresa activa o contexto de sesión;
- Prisma, PostgreSQL, migraciones o restricciones que afecten Company;
- cliente HTTP, envoltorio de respuesta, errores o infraestructura CRUD compartida.

Una regresión en Empresas bloquea el cierre del sprint que la introdujo.

## Secuencia de sprints

### Sprint 0 — Fundación técnica y gobierno

**Estado:** pendiente de cierre; **sprint inmediato**.

**Incluye:** configuración, estrategia de migraciones, health check, CI, documentación de entorno y ADRs esenciales. No introduce módulos de negocio.

**Depende de:** ninguno.

#### Bloqueos para habilitar el próximo sprint

- Establecer un baseline seguro de Prisma Migrate para la base existente, sin `db push`, `db reset` ni pérdida de datos.
- Eliminar la configuración Prisma duplicada o deprecada y conservar una única fuente de configuración válida.
- Exponer un health check mínimo, sin información sensible.
- Incorporar CI básico que ejecute las validaciones transversales.
- Documentar variables de entorno requeridas sin versionar secretos.
- Aprobar ADRs esenciales para baseline/migraciones y estrategia UUID, reconciliados con el esquema Prisma.

#### Mejoras progresivas no bloqueantes

- Observabilidad avanzada, métricas, trazas distribuidas y alertas.
- Dockerización, despliegue y entornos remotos.
- Endurecimiento adicional de rate limiting y seguridad operativa.
- Automatización ampliada de calidad, cobertura y reportes.

**Cierra cuando:** todos los bloqueos anteriores están validados y documentados. Las mejoras progresivas se planifican, pero no impiden el avance.

### Sprint 1 — Empresas y catálogos comerciales

**Estado:** completado funcionalmente — excepción histórica previa a este roadmap.

**Incluye:** `company` como tenant, `country`, `currency`, `company_type`, `tax_condition` y CRUD administrativo.

**Depende de:** fundación disponible al momento de su implementación; no se exige rehacerlo.

**Criterio de preservación:** debe permanecer verde según la regla de regresión; no habilita por sí solo el próximo sprint hasta cerrar Sprint 0.

### Sprint 2 — Catálogos y geografía real

**Estado:** pendiente; siguiente después de Sprint 0.

**Incluye:** completar `state` y `city`, relaciones `country → state → city` y selectores geográficos para direcciones futuras.

**Depende de:** Sprint 0 cerrado y `country` existente.

**Cierra cuando:**

- State y city usan UUID, DTOs, repository y endpoints reales.
- Se sustituyen los esqueletos `provinces`/`cities` incompatibles con Prisma, con decisión explícita de compatibilidad de rutas si correspondiera.
- Las relaciones geográficas se consultan y validan de forma consistente.
- Los selectores son buscables, accesibles, con loading/error y sin selección automática engañosa.

### Sprint 3 — Seguridad, RBAC y empresa activa

**Estado:** pendiente.

**Incluye:** identidad, `user`, `role`, `permission`, `user_role`, `role_permission`, autenticación, sesiones, guards, RBAC y selección de empresa activa.

**Depende de:** Sprint 2 y Company funcional.

**Cierra cuando:**

- Login, logout, expiración o renovación de sesión y protección de rutas funcionan.
- Tenant, empresa activa y permisos se resuelven desde identidad autenticada, nunca desde IDs arbitrarios enviados por cliente.
- Roles y permisos se prueban tanto para permitir como para denegar operaciones.
- La UI dispone de sesión, empresa activa y estados de acceso denegado.
- No se exige ni se muestra una sucursal activa: Branch aún no existe como módulo.

### Sprint 4 — Sucursales, direcciones y sucursal activa

**Estado:** pendiente.

**Incluye:** `address`, `branch`, dirección vinculada a city, sucursal principal, activación y selección de sucursal activa.

**Depende de:** Sprints 2 y 3.

**Cierra cuando:**

- Una empresa autorizada administra sus sucursales sin acceder a datos de otra empresa.
- Una dirección usa la jerarquía geográfica real.
- La regla de sucursal principal se define y se garantiza mediante aplicación y/o base según corresponda.
- La sesión permite seleccionar sucursal activa solo entre sucursales autorizadas de la empresa activa.

### Sprint 5 — CRM: clientes y proveedores

**Estado:** pendiente; `client` existe en Prisma y supplier es una capacidad planificada.

**Incluye:** `client`, direcciones de cliente, cuentas comerciales y diseño aprobado de supplier antes de crear tablas.

**Depende de:** Sprints 3 y 4.

**Cierra cuando:**

- Clientes se aíslan por empresa y respetan su código único por tenant.
- Los formularios distinguen persona/empresa y validan identificaciones fiscales sin inventar reglas.
- Supplier tiene ADR, modelo Prisma, migración aprobada y CRUD real antes de usarse en compras.

### Sprint 6 — Catálogo de productos

**Estado:** pendiente; `product_category` y `product` existen en Prisma.

**Incluye:** categorías, productos, precios/costos base y reglas de seguimiento de stock.

**Depende de:** Sprints 3, 4 y 5.

**Cierra cuando:**

- Productos y categorías se aíslan por empresa.
- Los códigos son únicos por empresa; barcode, impuestos, costo y unidad se validan.
- El usuario administra productos reales y define si rastrean stock.
- Marcas o unidades como entidades solo se agregan tras ADR y migración aprobada.

### Sprint 7 — Depósitos e inventario

**Estado:** pendiente; `warehouse`, `stock` y `stock_movement` existen en Prisma.

**Incluye:** depósitos por sucursal, existencias, movimientos, ajustes y transferencias.

**Depende de:** Sprints 4 y 6.

**Cierra cuando:**

- Un depósito pertenece a empresa y sucursal autorizadas.
- Stock es único por `(warehouse_id, product_id)`.
- Cada ajuste o transferencia registra movimiento auditable y actualiza stock en una transacción atómica.
- No se permiten existencias negativas salvo regla explícita y documentada.

### Sprint 8 — Compras

**Estado:** pendiente; compras y supplier requieren modelo aprobado.

**Incluye:** órdenes/ingresos de compra, ítems, costos y recepción en depósito.

**Depende de:** Sprints 5 y 7.

**Cierra cuando:**

- El modelo de compras y sus migraciones están aprobados antes de implementar endpoints.
- Confirmar una compra actualiza existencias y movimientos de forma atómica.
- Los importes usan precisión decimal adecuada y quedan auditables.

### Sprint 9 — Ventas y cobranzas

**Estado:** pendiente; `sale`, `sale_item`, `payment` y `payment_item` existen en Prisma.

**Incluye:** ventas, ítems, pagos, medios de pago y afectación de stock.

**Depende de:** Sprints 5, 6 y 7.

**Cierra cuando:**

- Ventas se crean en empresa y sucursal activas autorizadas.
- Ítems preservan producto, precio, cantidad, impuesto y totales del momento.
- La confirmación afecta stock y movimientos atómicamente.
- Pagos respetan las reglas definidas y mantienen trazabilidad.

### Sprint 10 — Facturación fiscal

**Estado:** pendiente; `invoice` existe en Prisma y ARCA está planificado.

**Incluye:** emisión local, estados fiscales, CAE, vencimiento y adapter ARCA desacoplado del Core.

**Depende de:** Sprint 9.

**Cierra cuando:**

- Una factura corresponde a una única venta y conserva datos fiscales inmutables.
- Reintentos y errores externos son idempotentes y auditables.
- La integración ARCA se implementa mediante adapter/servicio aislado, sin acoplar ventas a HTTP externo.

### Sprint 11 — Finanzas, contabilidad y reportes

**Estado:** pendiente; parte de los modelos contables son capacidades planificadas.

**Incluye:** conciliación, caja/bancos, cuentas contables, asientos, estados financieros, reportes y KPIs.

**Depende de:** Sprints 8, 9 y 10. Todo modelo faltante requiere ADR y migración aprobada.

**Cierra cuando:**

- Los reportes se basan en compras, ventas, pagos y facturas reales, respetando empresa, sucursal y permisos.
- Los importes no se calculan desde UI ni se duplican sin una fuente de verdad definida.
- Los procesos de cierre y corrección preservan trazabilidad.

### Sprint 12 — Integraciones y automatización

**Estado:** pendiente.

**Incluye:** Mercado Pago, bancos, Mercado Libre, Tiendanube, WhatsApp, Google Drive/Calendar y APIs externas aprobadas.

**Depende de:** Sprints 10 y 11, además de los módulos de dominio específicos que cada integración afecte.

**Cierra cuando:**

- Cada integración usa credenciales seguras, webhooks verificados, reintentos idempotentes y observabilidad básica.
- Las fallas externas no rompen transacciones del Core.
- Hay pruebas de contrato y procedimientos de recuperación documentados.

### Sprint 13 — ATLAS AI

**Estado:** pendiente.

**Incluye:** chat empresarial, copiloto, agentes, automatizaciones, análisis y predicciones.

**Depende de:** Sprints 3, 11 y 12; datos confiables, permisos y auditoría son obligatorios.

**Cierra cuando:**

- Toda consulta y acción de IA respeta empresa activa, sucursal activa cuando aplique y RBAC.
- Las acciones con efecto externo requieren confirmación, autorización y audit trail.
- Prompts, proveedores, costos, retención de datos y evaluación de calidad están documentados.

## Mapa de dependencias y orden operativo

```text
Estado histórico: Sprint 1 Empresas y catálogos comerciales (completo, excepción previa)

Sprint 0 Fundación técnica pendiente
  └─ Sprint 2 Catálogos y geografía real
      └─ Sprint 3 Seguridad, RBAC y empresa activa
          └─ Sprint 4 Sucursales, direcciones y sucursal activa
              └─ Sprint 5 CRM
                  └─ Sprint 6 Productos
                      └─ Sprint 7 Inventario
                          └─ Sprint 8 Compras
                              └─ Sprint 9 Ventas y cobranzas
                                  └─ Sprint 10 Facturación fiscal
                                      └─ Sprint 11 Finanzas, contabilidad y reportes
                                          └─ Sprint 12 Integraciones
                                              └─ Sprint 13 ATLAS AI
```

Finanzas se habilita después de compras, ventas y facturación; no es una rama independiente desde Seguridad.

## Protocolo al cerrar un sprint

1. Actualizar su estado en este documento y enlazar PR o evidencia de validación.
2. Registrar decisiones nuevas o excepciones en un ADR antes de iniciar el siguiente sprint.
3. Ejecutar los criterios transversales y adjuntar resultados.
4. Confirmar manualmente el flujo crítico y sus fallos esperables.
5. Ejecutar la regla de regresión de Empresas cuando corresponda.
6. Solo entonces declarar el sprint **Completado** y habilitar el siguiente.
