# PAMPA ERP - cierre de beta interna

**Fecha:** 30 de julio de 2026  
**Alcance:** operación local sin APIs externas ni comprobantes fiscales ARCA.

Este documento actualiza el estado inicial registrado en
`erp-domain-implementation.md`. La línea base contenía cinco migraciones; la
beta agrega tres migraciones aditivas y PostgreSQL local queda actualizado con
ocho.

## Resultado

Quedaron operativos categorías, productos, depósitos, stock y transferencias,
clientes, ventas, pagos, comprobantes internos, dashboard y reportes básicos.
La caja se omitió deliberadamente: era opcional y agregar tres entidades nuevas
habría reducido la confiabilidad del circuito principal.

Las migraciones agregadas y aplicadas localmente son:

1. `20260730150000_catalog_products`
2. `20260730161000_inventory_integrity`
3. `20260730173000_sales_payments_internal_documents`

## Decisiones finales

- La numeración de venta utiliza la secuencia `BIGINT` de PostgreSQL y se
  presenta como `VTA-00000001`; nunca usa `count + 1`.
- Los importes se calculan con `Prisma.Decimal` desde precios vigentes del
  backend y se guardan como snapshots.
- Cada mutación de stock usa una transacción serializable, bloqueo asesor por
  producto/depósito, validación de saldo y un movimiento inmutable.
- Confirmar una venta descuenta stock y emite un comprobante interno no fiscal
  en la misma transacción.
- Cancelar una venta repone stock mediante movimientos `SALE_CANCEL`; los
  movimientos originales nunca se modifican.
- Un pago puede ser parcial y combinar métodos. El bloqueo por venta impide
  sobrepagos concurrentes.
- La reversión conserva el pago original, cambia su estado a `CANCELLED` o
  `REFUNDED`, registra motivo/fecha y auditoría, y recalcula venta y cliente.
- Los reportes incluyen ventas por fecha, sucursal, producto y cliente; cobros
  por método; stock actual/bajo; movimientos y saldos pendientes.
- Todas las consultas reciben `companyId` desde `SecurityContext`, usan
  parámetros SQL y límites explícitos.

## Evidencia local

- Prisma schema formateado y válido.
- Ocho migraciones al día en PostgreSQL local.
- Catálogo RBAC: 48 permisos, 8 roles y 8 matrices sincronizadas.
- 143 pruebas unitarias backend.
- 64 pruebas e2e, incluyendo 401, 403 y aislamiento A/B del dominio ERP.
- 5 pruebas frontend.
- Lint, TypeScript y builds de backend/frontend aprobados.
- Auditoría tenant sin relaciones cruzadas.
- Dashboard y nueve conjuntos de reporte ejecutados contra PostgreSQL real.
- HTTP local verificado: frontend responde 200; rutas protegidas responden 401
  sin sesión.

## Pendientes deliberados

- Caja básica.
- Integraciones ARCA, Mercado Pago, marketplaces y bancos.
- Deploy productivo del backend y sus secretos administrados.
- Rediseño visual premium.
