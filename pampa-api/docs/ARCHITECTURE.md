# PAMPA ERP

> ERP inteligente para PyMEs argentinas impulsado por IA.

---

# Visión

PAMPA no busca ser un ERP tradicional.

El objetivo es construir la plataforma ERP más moderna para Argentina, integrando inteligencia artificial, automatización e integraciones con organismos y servicios externos para que las empresas puedan administrar completamente su operación desde un único sistema.

El proyecto será desarrollado siguiendo estándares de software empresarial, priorizando:

- Escalabilidad
- Mantenibilidad
- Seguridad
- Modularidad
- Rendimiento
- Documentación

---

# Stack Tecnológico

## Backend

- NestJS
- TypeScript
- Prisma ORM
- PostgreSQL
- JWT
- Passport
- Bcrypt
- Swagger

## Frontend

- Next.js
- React
- TypeScript
- TailwindCSS

## Base de datos

- PostgreSQL

## ORM

- Prisma

## Infraestructura

- Docker (futuro)
- GitHub
- Vercel (Frontend)
- VPS / Cloud (Backend)

---

# Arquitectura General

La arquitectura utilizada será una arquitectura modular basada en dominios de negocio.

Cada módulo será completamente independiente.

Ejemplo:

modules/

- auth
- administration
- crm
- catalog
- inventory
- finance
- accounting
- sales
- purchases
- reports

Cada módulo tendrá:

- Controller
- Service
- DTOs
- Entities
- Module

---

# Flujo de una petición

Cliente

↓

Controller

↓

Service

↓

Prisma Service

↓

PostgreSQL

Nunca un Controller accederá directamente a Prisma.

Toda la lógica de negocio estará dentro de los Services.

---

# Arquitectura de Carpetas

src/

common/

config/

database/

modules/

shared/

main.ts

app.module.ts

---

# Principios de Desarrollo

Todo el proyecto seguirá los principios SOLID.

Se priorizará:

- Responsabilidad única
- Bajo acoplamiento
- Alta cohesión
- Reutilización
- Código limpio

---

# Convenciones

## Controllers

Responsables únicamente de recibir solicitudes HTTP.

No contendrán lógica de negocio.

---

## Services

Toda la lógica del negocio se implementará aquí.

Los Services serán la única capa autorizada para acceder al PrismaService.

---

## DTO

Toda validación utilizará class-validator.

No se validarán datos manualmente.

---

## Prisma

Toda comunicación con PostgreSQL será realizada mediante Prisma ORM.

Nunca se escribirán consultas SQL dentro de Controllers.

---

# Organización de módulos

Los módulos se organizarán por dominio funcional.

Ejemplo:

administration/

- users
- roles
- permissions

crm/

- customers
- suppliers

catalog/

- products
- brands
- categories

inventory/

- warehouses
- stock

sales/

purchases/

finance/

accounting/

reports/

---

# Seguridad

La autenticación utilizará:

- JWT Access Token
- Refresh Token
- Passport
- Guards
- Roles
- Permissions

Las contraseñas serán almacenadas utilizando Bcrypt.

Nunca se almacenarán contraseñas en texto plano.

---

# Base de Datos

Se utilizará PostgreSQL como motor principal.

Prisma será el ORM oficial del proyecto.

Las migraciones serán administradas mediante Prisma Migrate.

---

# Documentación

Toda API será documentada mediante Swagger.

Cada endpoint deberá tener:

- Descripción
- Parámetros
- Respuestas
- Códigos HTTP

---

# Objetivo Final

PAMPA será una plataforma empresarial compuesta por múltiples módulos capaces de administrar completamente una empresa argentina.

Entre las funcionalidades previstas se incluyen:

- Gestión de empresas
- Clientes
- Proveedores
- Productos
- Inventario
- Compras
- Ventas
- Facturación Electrónica (ARCA)
- Reportes
- Dashboard
- Integración Mercado Libre
- Integración Tiendanube
- Integración WhatsApp
- Integración bancaria
- Inteligencia Artificial (ATLAS)

---

# Filosofía

La prioridad del proyecto no es desarrollar rápido.

La prioridad es construir un software de calidad profesional que pueda evolucionar durante muchos años manteniendo una arquitectura limpia, escalable y fácil de mantener.