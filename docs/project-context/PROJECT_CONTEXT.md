# PROJECT CONTEXT - PAMPA ERP

## Proyecto

PAMPA es un ERP moderno desarrollado para Argentina con una arquitectura escalable y preparada para múltiples empresas (multi-tenant).

No es un proyecto de práctica. El objetivo es construir un producto comercial de calidad profesional.

---

# Stack

Frontend

- Next.js 16
- React 19
- TypeScript
- Tailwind CSS v4
- shadcn/ui

Backend

- NestJS 11
- Prisma ORM
- PostgreSQL

---

# Arquitectura

La arquitectura es una prioridad.

Siempre seguir estos principios:

- Repository Pattern
- DTOs
- Services
- Controllers
- Prisma como única capa de acceso a datos
- Validaciones con class-validator
- Swagger actualizado
- Código limpio y mantenible

No crear lógica duplicada.

No romper la arquitectura existente.

---

# Forma de trabajo

El desarrollo se realiza en equipo.

Roles:

- ChatGPT → Arquitecto / Tech Lead
- Codex → Software Engineer
- Usuario → Product Owner

Antes de implementar cambios importantes, analizar el dominio y la arquitectura existente.

Si existe un conflicto con el diseño actual, detener la implementación y explicarlo antes de modificar el código.

Nunca asumir.

Nunca reemplazar modelos existentes sin confirmación.

---

# Estado actual

Sprint 1 finalizado.

Implementado:

- Next.js
- NestJS
- PostgreSQL
- Prisma
- Swagger
- ResponseInterceptor
- ExceptionFilter
- ValidationPipe
- Repository Pattern
- Dashboard
- Countries CRUD
- Comunicación Frontend ↔ Backend

---

# Dominio

El esquema Prisma ya posee un modelo Company completamente diseñado.

No reemplazarlo.

Actualmente Company es el núcleo del ERP.

Relaciones principales:

- Branch
- Client
- Product
- ProductCategory
- Role
- User
- Warehouse
- Sale

Company depende de:

- CompanyType
- TaxCondition
- Currency

No agregar country_id a Company.

La ubicación se modela mediante:

Country
→ State
→ City
→ Address
→ Branch
→ Company

Esta arquitectura debe preservarse.

---

# Convenciones

Mantener el mismo estilo utilizado en Country.

Toda nueva entidad debe incluir:

- DTOs
- Repository
- Service
- Controller
- Swagger
- Validaciones
- Prisma Repository

Mantener el formato estándar de respuestas de la API.

---

# Filosofía

La prioridad es calidad antes que velocidad.

Preferimos detener una implementación antes que introducir deuda técnica.

Todo cambio debe respetar la arquitectura existente y facilitar la escalabilidad del ERP.

Si existe una duda de diseño, preguntar antes de modificar el código.