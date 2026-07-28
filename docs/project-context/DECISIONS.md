# Architecture Decisions (ADR)

Este archivo documenta todas las decisiones importantes del proyecto.

---

## ADR-001

Repository Pattern

Estado:

Aceptado.

Motivo:

Separar lógica de negocio del acceso a datos.

---

## ADR-002

NestJS + Prisma

Estado:

Aceptado.

Motivo:

Escalabilidad y mantenibilidad.

---

## ADR-003

Company es el Tenant principal

Estado:

Aceptado.

Motivo:

Todo el ERP gira alrededor de Company.

No modificar esta decisión sin una revisión completa de arquitectura.

---

## ADR-004

No agregar country_id a Company

Estado:

Aceptado.

Motivo:

La ubicación pertenece a Branch.

Jerarquía:

Country

↓

State

↓

City

↓

Address

↓

Branch

↓

Company

---

## ADR-005

Todos los módulos deben seguir la misma arquitectura

Controller

↓

Service

↓

Repository

↓

Prisma

Estado:

Aceptado.

---

## ADR-006

Calidad sobre velocidad

Estado:

Aceptado.

Motivo:

Se prioriza una arquitectura sólida y mantenible antes que implementar funcionalidades rápidamente.