# PAMPA Database Architecture

Versión: 1.0

Estado: En Diseño

---

# Objetivo

Diseñar una base de datos moderna, escalable y preparada para soportar el crecimiento del ERP durante muchos años.

La base de datos debe representar el negocio y no la interfaz de usuario.

---

# Convenciones

## Idioma

Todas las tablas, columnas y relaciones estarán escritas en inglés.

## Nombres

- snake_case
- singular
- minúsculas

Ejemplos

company

branch

branch_contact

company_type

tax_condition

---

## Claves Primarias

### Tablas maestras

INTEGER GENERATED ALWAYS AS IDENTITY

### Tablas de negocio

UUID DEFAULT gen_random_uuid()

---

## Claves Foráneas

Siempre utilizar:

company_id

branch_id

currency_id

country_id

province_id

city_id

tax_condition_id

company_type_id

---

## Auditoría

Todas las tablas de negocio deberán contener:

created_at

updated_at

deleted_at

updated_at será actualizado automáticamente mediante Trigger.

---

# Arquitectura General

Core

- company
- branch
- address
- branch_contact

Catalogs

- currency
- company_type
- tax_condition
- country
- province
- city
- clae
- address_type
- branch_type
- document_type

Users

- user
- role
- permission

CRM

- client
- supplier

Inventory

- product
- warehouse
- stock
- stock_movement

Sales

- quotation
- sale
- sale_item
- invoice
- invoice_item
- payment

Purchases

- purchase
- purchase_item

Audit

- audit_log

---

# Relaciones principales

Company

↓

Branch

↓

Address

↓

Branch Contact

Company

↓

Product

Branch

↓

Stock

↓

Stock Movement

---

# Principios

- Una empresa puede tener múltiples sucursales.

- Un producto pertenece a una empresa.

- El stock pertenece a una sucursal.

- Las tablas maestras utilizan INTEGER.

- Las tablas de negocio utilizan UUID.

- La integridad de los datos es responsabilidad de la base de datos.

- La documentación es parte del proyecto.