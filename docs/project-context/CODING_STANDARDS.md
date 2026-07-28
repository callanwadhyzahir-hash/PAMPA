# Coding Standards

## Objetivo

Todo el proyecto debe parecer escrito por un único equipo.

La consistencia es más importante que la velocidad.

---

# TypeScript

Siempre usar tipos.

No utilizar any.

Preferir interfaces para contratos públicos.

---

# NestJS

Separación estricta:

Controller

↓

Service

↓

Repository

Nunca romper esta regla.

---

# Prisma

Toda consulta pasa por Repository.

No acceder directamente a Prisma desde Services.

---

# Frontend

No llamar fetch() directamente.

Siempre:

Service

↓

Hook

↓

Page

---

# Componentes

Crear componentes reutilizables.

Evitar duplicación.

---

# Nombres

Variables

camelCase

Interfaces

PascalCase

Componentes

PascalCase

Archivos

kebab-case

---

# Imports

Orden:

React

↓

Externos

↓

Internos

↓

Tipos

---

# Código

Funciones pequeñas.

Métodos cortos.

Responsabilidad única.

No escribir funciones gigantes.

---

# Comentarios

Solo cuando agreguen valor.

El código debe ser autoexplicativo.

---

# Calidad

Antes de finalizar una tarea verificar:

- TypeScript
- ESLint
- Arquitectura
- Consistencia
- Reutilización