# Database

## Objetivo

Definir las reglas oficiales para el desarrollo de la base de datos de PAMPA.

---

# Motor

PostgreSQL

---

# ORM

Prisma ORM

No se utilizará ningún otro ORM.

---

# Migraciones

Toda modificación del schema deberá realizarse mediante Prisma Migrate.

Nunca modificar directamente la base de producción.

---

# Convenciones

## Tablas

snake_case

Ejemplo:

users

companies

sales_orders

purchase_orders

---

## Columnas

snake_case

Ejemplo:

created_at

updated_at

company_id

customer_id

---

## Claves Primarias

UUID

Ejemplo:

id UUID

---

# Fechas

Siempre utilizar:

created_at

updated_at

deleted_at (cuando exista Soft Delete)

---

# Soft Delete

Siempre que sea posible.

Ejemplo:

deleted_at TIMESTAMP NULL

---

# Relaciones

Siempre mediante claves foráneas.

Nunca guardar datos duplicados.

---

# Índices

Agregar índices para:

UUID

Foreign Keys

Campos de búsqueda frecuente

Ejemplos:

email

tax_id

company_id

sku

barcode

---

# Integridad

Toda restricción debe implementarse en la base de datos.

Ejemplo:

UNIQUE

FOREIGN KEY

CHECK

NOT NULL

---

# Prisma

Todo acceso a PostgreSQL deberá realizarse mediante PrismaService.

Nunca utilizar consultas SQL dentro del proyecto salvo casos excepcionales y documentados.

---

# Organización

Cada modelo representará una única entidad.

Ejemplo:

User

Company

Customer

Product

Warehouse

Sale

Purchase

Invoice

Payment

---

# Auditoría

Todas las tablas importantes deberán registrar:

created_at

updated_at

created_by

updated_by

---

# Escalabilidad

El diseño debe permitir:

Multiempresa

Multiusuario

Multisucursal

Multirol

---

# Backups

La estrategia futura incluirá:

Backups automáticos

Versionado

Recuperación ante desastres

---

# Filosofía

La base de datos debe priorizar:

Consistencia

Integridad

Escalabilidad

Rendimiento

Seguridad