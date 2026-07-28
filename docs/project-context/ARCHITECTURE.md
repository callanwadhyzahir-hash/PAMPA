# PAMPA ERP - Architecture

## Arquitectura General

PAMPA sigue una arquitectura modular basada en dominios.

Cada módulo es independiente y mantiene la misma estructura.

Ejemplo:

Countries

Companies

Clients

Products

Warehouses

Sales

Purchases

etc.

---

# Backend

NestJS

Arquitectura:

Controller

↓

Service

↓

Repository

↓

Prisma

↓

PostgreSQL

Nunca acceder a Prisma desde un Controller.

Nunca colocar lógica de negocio en Controllers.

Toda lógica pertenece al Service.

Toda consulta pertenece al Repository.

---

# Frontend

Next.js App Router

Arquitectura:

Page

↓

Components

↓

Hooks

↓

Services

↓

API

Nunca consumir fetch() directamente desde una página.

Siempre utilizar Services.

Los Hooks consumen Services.

Las Pages consumen Hooks.

---

# API

Todas las respuestas siguen el mismo formato.

Ejemplo:

{
  "success": true,
  "message": "Countries retrieved successfully.",
  "data": [...]
}

No cambiar este formato.

---

# Repository Pattern

Cada módulo debe contener:

Repository

Service

Controller

DTOs

Prisma

Nunca duplicar consultas.

---

# Escalabilidad

Toda implementación debe ser reutilizable.

No escribir código específico para un solo módulo.

Si un componente puede reutilizarse, debe convertirse en componente compartido.

---

# Filosofía

Arquitectura primero.

Código después.