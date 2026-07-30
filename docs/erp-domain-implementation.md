# PAMPA ERP — Auditoría e implementación del dominio interno

**Fecha:** 30 de julio de 2026
**Estado:** auditoría inicial completada; implementación por fases en curso.
**Alcance:** beta local sin APIs externas, sin facturación fiscal ARCA y sin rediseño visual premium.

## 1. Evidencia auditada

Se inspeccionaron la documentación de `docs/project-context`, la arquitectura de identidad/RBAC/sesiones, el esquema Prisma, las cinco migraciones existentes, los módulos NestJS, la capa de base de datos, el bootstrap HTTP, el frontend operativo, los dos manifiestos NPM, los `.gitignore` y el estado real de Git.

Validación inicial:

- Rama `master`, worktree limpio y remoto `origin` configurado.
- Prisma contiene cinco migraciones y PostgreSQL local está actualizado.
- `prisma format --check` y `prisma validate` pasan.
- La auditoría tenant existente pasa con cero relaciones cruzadas en usuarios, roles y sucursales.
- Datos locales: 3 empresas, 1 usuario y 0 registros en branch, product_category, product, warehouse, stock, stock_movement, client, sale, sale_item, payment, payment_item e invoice.
- Existe una advertencia no bloqueante: la propiedad `package.json#prisma` está deprecada y es reemplazada por `prisma.config.ts`.

El código y `pampa-api/prisma/schema.prisma` son la fuente de verdad frente a documentación histórica.

## 2. Arquitectura obligatoria

Backend:

```text
Controller → Service → Repository → Prisma → PostgreSQL
```

Frontend:

```text
Page → Components/Hooks → Service → API
```

Reglas transversales:

- `companyId` se obtiene sólo de `SecurityContext`.
- Repositories filtran todo recurso tenant por `company_id` o por una relación propietaria.
- Un UUID de otro tenant se responde como 404.
- `JwtAuthGuard`, `PermissionGuard` y permisos declarativos permanecen como autoridad.
- Las operaciones de stock, confirmación/cancelación de venta y pagos son transaccionales.
- Los movimientos y comprobantes emitidos son inmutables.
- Prisma no se usa en controllers, services de dominio ni frontend.
- Los errores Prisma se traducen a errores HTTP de dominio.
- No se borran físicamente entidades con historial.

## 3. Modelos existentes y brechas

### Product category

Existe con `company_id`, nombre, descripción, activo y timestamps. La unicidad actual `(company_id, name)` es sensible a mayúsculas según collation. Se requiere una restricción case-insensitive o un nombre normalizado persistido. Una categoría con productos se desactiva; no se elimina.

### Product

Existe con empresa, categoría opcional, `code`, barcode, nombre, descripción, tipo, unidad, costo, impuesto, control de stock y activo.

Brechas:

- `code` será el SKU operativo.
- falta precio de venta;
- falta moneda explícita o una decisión de herencia;
- barcode es único global, pero debe ser único por empresa;
- falta snapshot de SKU en `sale_item`;
- el stock mínimo ya existe por combinación producto-depósito, no en product.

Decisión: el producto tendrá `sale_price`; usará la moneda base de la empresa para esta beta. No se agrega una moneda por producto mientras no exista un caso multimoneda aprobado.

### Warehouse

Existe con empresa, sucursal, nombre, código, descripción y activo. La FK compuesta ya impide que la sucursal pertenezca a otro tenant.

Brechas:

- falta `is_main`;
- falta restricción de máximo un depósito principal activo por sucursal;
- no hay unique compuesto `(id, company_id)` para relaciones tenant-aware futuras.

### Stock y stock movement

`stock` mantiene saldo por `(warehouse_id, product_id)` y mínimos/máximos. `stock_movement` registra depósito, producto, tipo, cantidad, referencia, observaciones, actor y fecha.

Brechas:

- los tipos actuales son demasiado amplios;
- no existe referencia común textual/tipada ni origen;
- la base no garantiza que producto y depósito sean del mismo tenant;
- no hay constraint de stock no negativo;
- la cantidad del movimiento no define de forma inequívoca signo y dirección.

Decisión: movimientos con cantidad positiva y tipo direccional. `stock.quantity >= 0`; transferencias generan `TRANSFER_OUT` y `TRANSFER_IN` con la misma referencia. El saldo se bloquea con `SELECT ... FOR UPDATE` dentro de una transacción PostgreSQL.

### Client

Existe con empresa, dirección, código, nombres, razón social, CUIT/documento genérico, contacto, tipo empresa, crédito, saldo, notas y activo.

Brechas:

- faltan tipo de cliente/documento y nombre comercial explícitos;
- `tax_id` sólo tiene índice, no unicidad por tenant;
- `current_balance` es un saldo mutable sin ledger explícito.

Decisión: para la beta, el saldo se deriva de ventas confirmadas menos pagos vigentes y `current_balance` se mantiene sincronizado transaccionalmente como caché. CUIT/documento no se presenta como validado por ARCA.

### Sale y sale item

Sale existe con empresa, sucursal, cliente opcional, usuario, secuencia bigint, fecha, subtotales, impuestos, descuentos, total, estado y notas. Sale item guarda snapshot de nombre, cantidad, precio, impuesto, descuento y totales.

Brechas:

- falta depósito;
- estados actuales no incluyen borrador ni pago parcial;
- falta snapshot de SKU;
- la numeración bigint es global y no tiene presentación `VTA-00000001`;
- faltan fechas de confirmación/cancelación y actor de cancelación;
- las FKs no garantizan tenant consistente para cliente/producto/usuario.

Decisión: `sale_number` mantiene secuencia segura de PostgreSQL y se presenta formateado. Se agregan depósito y snapshots mínimos. Un borrador no mueve stock. Confirmar recalcula todo desde productos, bloquea saldos y genera movimientos/comprobante en una sola transacción. Cancelar crea movimientos compensatorios y nunca modifica los originales.

### Payment y payment item

Payment agrupa cobros por venta; payment item distribuye importes por método.

Brechas:

- faltan estado, actor, cancelación/reembolso y referencias a movimientos compensatorios;
- la FK actual usa cascade desde sale, incompatible con historial inmutable;
- no hay tenant directo, por lo que todo acceso debe atravesar sale;
- faltan timestamps/estado en payment item.

Decisión: pagos completados no se editan ni eliminan. Cancelaciones/reembolsos se representan con estado y registro compensatorio. La suma vigente no puede superar el saldo.

### Invoice

Existe uno a uno con sale y contiene campos fiscales futuros. No almacena snapshots y su semántica actual sugiere factura fiscal.

Decisión: en esta beta se usa como comprobante interno no fiscal, identificado de manera inequívoca. Se agregan número interno y snapshots JSON inmutables. `cae` y campos ARCA permanecen sin uso.

## 4. Riesgos

### Tenant

Se requieren FKs/uniques compuestos para:

- producto-categoría;
- stock-producto-depósito;
- venta-sucursal/depósito/cliente/usuario;
- ítem-producto;
- pago/comprobante mediante venta.

La aplicación valida antes de escribir y PostgreSQL actúa como segunda barrera.

### Monetarios

- Todos los cálculos usan `Prisma.Decimal`.
- Se redondea a 2 decimales en cada línea y total monetario.
- Cantidades usan 3 decimales.
- El frontend nunca es fuente de precios ni totales.
- La moneda de la beta es la moneda base de Company.

### Concurrencia

- No se usa `count + 1`.
- La numeración usa secuencia de PostgreSQL.
- Filas de stock se bloquean antes de validar/descontar.
- Confirmación, cancelación, transferencia y pago usan transacciones.
- Los servicios rechazan segundos envíos según estado actual.

### Eliminación e historial

- Categorías, productos, depósitos y clientes con historial se desactivan.
- Movimientos, ventas confirmadas, pagos completados y comprobantes no se eliminan.
- Borradores de venta pueden descartarse sólo mientras no tengan efectos.

## 5. Migraciones necesarias

Orden aditivo previsto:

1. Catálogo/producto: precio de venta, barcode por tenant, normalización/constraints e integridad categoría-producto.
2. Inventario: depósito principal, integridad tenant de stock y movimientos, tipos direccionales, referencias y checks.
3. Comercial: campos de cliente, depósito/estados/snapshots de venta, pagos compensatorios y comprobante interno.
4. Índices de búsqueda, fechas, estados y reportes.

No se modifica ninguna migración aplicada. Cada SQL se revisa antes de aplicar y se audita después.

## 6. Estados definitivos

- Categoría/producto/depósito/cliente: `is_active`.
- Venta: `DRAFT`, `CONFIRMED`, `PARTIALLY_PAID`, `PAID`, `CANCELLED`.
- Pago: `PENDING`, `COMPLETED`, `CANCELLED`, `REFUNDED`.
- Comprobante interno: `ISSUED`, `CANCELLED`.
- Movimiento: `INITIAL`, `PURCHASE`, `SALE`, `SALE_CANCEL`, `ADJUSTMENT_IN`, `ADJUSTMENT_OUT`, `TRANSFER_IN`, `TRANSFER_OUT`, `RETURN_IN`, `RETURN_OUT`.

## 7. Orden y gates

1. Categorías.
2. Productos.
3. Depósitos.
4. Stock y movimientos.
5. Clientes.
6. Ventas.
7. Pagos.
8. Comprobantes internos.
9. Dashboard y reportes.
10. Caja sólo si los módulos anteriores quedan verdes y el modelo puede agregarse sin comprometerlos.

Un módulo no habilita el siguiente hasta que backend, frontend, permisos, aislamiento tenant, tests y validación local de su flujo crítico estén verdes.
