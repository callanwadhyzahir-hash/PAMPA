# Contexto integral para ChatGPT — PAMPA ERP
> Este archivo es la fuente de contexto para trabajar sobre este repositorio. Léelo antes de proponer arquitectura o cambios. Describe el estado observado del código el 25 de julio de 2026; distingue explícitamente entre lo implementado y lo planificado.

## 1. Qué es PAMPA

PAMPA es un ERP SaaS, API-first, pensado inicialmente para PyMEs argentinas. El objetivo es evolucionar a un producto comercial y de portfolio, mantenible, multiempresa y multisucursal. Argentina es el primer mercado (incluida futura facturación electrónica con ARCA), pero el núcleo debe mantenerse internacionalizable.

La propuesta de producto incluye administración de empresas, catálogo, CRM, inventario, ventas, pagos, facturación, reportes e integraciones. ATLAS es el nombre reservado para funcionalidades de IA futuras. No asumir que esos módulos ya están desarrollados.

## 2. Estado real a la fecha

El repositorio es un monorepo informal con dos aplicaciones Node independientes y dos `package.json`; no hay workspaces, Docker, CI/CD ni despliegue configurado.

| Área | Estado observado |
| --- | --- |
| Frontend | Landing/pantalla inicial funcional y biblioteca UI local; no hay autenticación ni conexión a API. |
| Backend | Bootstrap NestJS, Prisma, manejo global de validación/errores/respuestas y CRUD real de `countries`. |
| Otros endpoints core | Existen esqueletos de companies, provinces, cities y currencies, pero sus servicios devuelven texto de ejemplo. Además, no están importados en `AppModule`, por lo que no quedan expuestos al arrancar. |
| Auth | Módulo/controlador/servicio vacíos. JWT, Passport y bcrypt están instalados, no implementados. |
| Datos | Esquema Prisma amplio para el dominio ERP; no hay migraciones versionadas dentro de `pampa-api/prisma/migrations`. |
| Documentación | Hay ADRs y roadmap. Parte de ella es aspiracional u obsoleta; el código y el esquema Prisma prevalecen para el estado actual. |

El árbol de Git también está en una etapa inicial: el único commit es el bootstrap de Next.js y el backend/documentación/componentes aparecen como archivos aún no rastreados. No borrar ni revertir cambios existentes del usuario.

## 3. Estructura del repositorio

```text
pampa/
├── src/                         # frontend Next.js
│   ├── app/                     # App Router: layout, landing y CSS global
│   ├── components/
│   │   ├── ui/                  # primitives locales de shadcn/Base UI
│   │   ├── layout/              # sidebar, topbar, page-container
│   │   └── dashboard/           # stat-card, section-title
│   ├── hooks/                   # reservado; actualmente vacío
│   ├── lib/utils.ts             # helper cn() de clases CSS
│   ├── services/                # reservado; actualmente vacío
│   └── types/                   # reservado; actualmente vacío
├── public/                      # SVGs de plantilla Next
├── docs/
│   ├── CHATGPT_CONTEXT.md       # este documento
│   ├── PROJECT_CONTEXT.md       # contexto anterior, parcialmente desactualizado
│   ├── architecture/            # ADR-001 a ADR-007
│   ├── database/                # arquitectura de datos de alto nivel
│   └── engineering/             # principio Database as Guardian
├── pampa-api/                   # backend NestJS independiente
│   ├── prisma/schema.prisma     # fuente del modelo de datos
│   ├── src/main.ts              # bootstrap HTTP, Swagger y middleware global
│   ├── src/app.module.ts        # composición actual de módulos
│   ├── src/database/            # PrismaService y PrismaModule global
│   ├── src/common/              # interceptor de respuestas y filtro de errores
│   └── src/modules/
│       ├── auth/                # esqueleto
│       └── core/
│           ├── countries/       # CRUD real con Repository Pattern
│           ├── companies/       # esqueleto Nest
│           ├── provinces/       # esqueleto Nest
│           ├── cities/          # esqueleto Nest
│           └── currencies/      # esqueleto Nest
└── package.json                 # frontend
```

No tratar `.next/`, `node_modules/` ni `tsconfig.tsbuildinfo` como fuentes de código. Las variables `.env*` están ignoradas y nunca se deben incluir credenciales en código o documentación.

## 4. Configuración y cómo ejecutar

### Frontend

- Directorio: raíz del repositorio.
- Runtime: Next.js `16.2.10`, React/React DOM `19.2.4`, TypeScript 5.
- Comandos: `npm run dev`, `npm run build`, `npm run start`, `npm run lint`.
- Puerto habitual de desarrollo: `3000` (predeterminado de Next).
- Usa App Router bajo `src/app`, alias `@/* -> ./src/*`, modo estricto de TypeScript y Tailwind CSS v4.
- `next.config.ts` no contiene configuración adicional.

### Backend

- Directorio: `pampa-api`.
- Runtime: NestJS 11, TypeScript 5.7, Prisma `6.19.3`, PostgreSQL.
- Comandos: `npm run start:dev`, `npm run build`, `npm run start:prod`, `npm run test`, `npm run test:e2e`.
- La aplicación escucha de forma fija en `http://localhost:3001`.
- Swagger se publica en `http://localhost:3001/api`.
- Requiere `DATABASE_URL` en el entorno para Prisma; no inventar ni versionar su valor. `prisma.config.ts` apunta a `prisma/schema.prisma` y a `prisma/migrations`.

## 5. Frontend actual

La ruta `/` es un componente cliente (`"use client"`) con una landing centrada: marca PAMPA, mensaje de producto y botones visuales “Iniciar sesión” y “Crear empresa”. Los botones no tienen navegación ni lógica todavía.

El layout raíz usa `next/font` con Geist y Geist Mono, `lang="es"`, y metadata:

- título: `PAMPA | Sistema Operativo para PyMEs`
- descripción: `Sistema Operativo para PyMEs Argentinas.`

Sistema visual:

- Tailwind v4 con tokens CSS en `src/app/globals.css`.
- Paleta clara con fondo `#f8fafc`, primario azul `#2563eb` y sidebar oscuro `#111827`.
- Componentes UI locales basados en Base UI/shadcn (button, card, input, table, dialog, dropdown, modal, avatar y badge).
- `framer-motion` se usa para la animación de entrada de la landing y `lucide-react` para iconos.

No hay estado global, cliente HTTP, rutas protegidas, formularios conectados, tests frontend ni integración frontend-backend. Si se añade una funcionalidad, mantener TypeScript estricto, usar el alias `@/`, reutilizar los componentes existentes y no añadir dependencias sin necesidad.

## 6. Backend actual

### Bootstrap transversal

`main.ts` crea la aplicación Nest y registra:

- `ValidationPipe` global con `whitelist: true`, `transform: true` y `forbidNonWhitelisted: true`.
- `ResponseInterceptor` global: para resultados exitosos produce `{ success, message: "Success", timestamp, data }`.
- `HttpExceptionFilter` global: para errores produce `{ success: false, statusCode, path, timestamp, message }`.
- Swagger sin prefijo ni versionado global configurado.

`ConfigModule` es global. `PrismaModule` también es global y expone `PrismaService`, que hereda de `PrismaClient` y abre conexión al iniciar el módulo.

### Módulos cargados realmente

`AppModule` importa solo `ConfigModule`, `PrismaModule`, `CountriesModule` y `AuthModule`. Aunque se importan clases de `CompaniesModule`, `ProvincesModule`, `CitiesModule` y `CurrenciesModule` en el archivo, no están incluidos en el array `imports`; es código muerto/pendiente.

### API disponible

`/auth` existe como controller, pero no declara métodos.

`/countries` es el único recurso con lógica de persistencia real:

| Método | Ruta | Comportamiento |
| --- | --- | --- |
| GET | `/countries` | Lista países activos por nombre. |
| GET | `/countries/:id` | Busca por UUID; devuelve 404 si no existe. |
| POST | `/countries` | Crea; valida nombre/ISO, evita duplicados y reactiva un ISO previamente inactivo. |
| PUT | `/countries/:id` | Actualiza; verifica existencia y conflictos de nombre/ISO. |
| DELETE | `/countries/:id` | Soft delete: cambia `is_active` a `false`. |

DTO de creación: `name` string, `isoCode` string de exactamente 2 caracteres, `phoneCode` opcional e `isActive` opcional. Los nombres de propiedades HTTP son camelCase; el repositorio los mapea a columnas snake_case.

Los controllers de `companies`, `provinces`, `cities` y `currencies` declaran CRUD convencional, pero trabajan con IDs convertidos a `number` y servicios de plantilla que devuelven strings; esto es incompatible con el modelo Prisma, que usa UUID. No considerarlos APIs funcionales ni copiarlos como patrón de dominio. Su verbo de actualización es `PATCH`, mientras que countries usa `PUT`: la estandarización está pendiente.

## 7. Arquitectura que se debe respetar

La dirección aceptada es arquitectura modular por dominio y capas:

```text
HTTP request -> Controller -> Service -> Repository -> PrismaService -> PostgreSQL
```

Reglas:

1. Controllers delgados: reciben HTTP, DTOs y delegan. Sin reglas de negocio ni acceso a Prisma.
2. Services: reglas de negocio, autorización/orquestación y excepciones de Nest; no dependen de `Request`/`Response` de Express.
3. Repositories: acceso a Prisma. El patrón está implementado en `countries` y debe ser la referencia para módulos nuevos.
4. DTOs: toda entrada se valida con `class-validator`/`class-transformer`; no hacer validación manual dispersa.
5. No cambiar el esquema de base de datos ni aplicar migraciones salvo pedido explícito.
6. Convenciones de código: clases PascalCase, variables camelCase, archivos kebab-case, REST con sustantivos plurales.
7. APIs nuevas deben documentarse con Swagger y mantener el sobre de respuesta global.
8. No generar CRUDs masivos ni módulos completos por defecto: implementar solo lo solicitado.

La documentación antigua indica a veces que los services acceden a Prisma directamente; la regla vigente y el código de countries favorecen Repository Pattern. Para código nuevo, usar repositorios.

## 8. Modelo de datos Prisma

Fuente de verdad: `pampa-api/prisma/schema.prisma`. Todas las tablas actuales usan nombres singulares y snake_case; sus IDs son UUID de PostgreSQL generados con `gen_random_uuid()`. En el código TypeScript los delegates de Prisma conservan nombres como `prisma.country` y los campos usan snake_case.

Modelos presentes:

```text
Geografía y catálogos: country, state, city, currency, company_type, tax_condition
Organización: company, branch, address
Seguridad: user, role, permission, user_role, role_permission
CRM: client
Catálogo/inventario: product_category, product, warehouse, stock, stock_movement
Ventas/finanzas: sale, sale_item, invoice, payment, payment_item
```

Relaciones y restricciones de mayor relevancia:

- Geografía: `country -> state -> city`; `address` pertenece a `city`.
- Organización: una `company` tiene branches, users, clients, productos, roles, warehouses y sales; una `branch` pertenece a company y address.
- Seguridad: `user` pertenece a company y opcionalmente branch; roles son por company; relaciones usuario-rol y rol-permiso son tablas puente con PK compuesta.
- Inventario: `product` pertenece a company y puede pertenecer a categoría; `warehouse` pertenece a company y branch; `stock` es único por `(warehouse_id, product_id)`; movimientos registran producto, depósito y usuario creador opcional.
- Ventas: `sale` vincula company, branch, user y cliente opcional; tiene ítems, pagos e invoice opcional. `invoice.sale_id` es único; cada ítem de venta es único por `(sale_id, line_number)`.
- Soft delete no es uniforme en el esquema. Algunos catálogos usan `is_active`; no agregar `deleted_at` indiscriminadamente sin cambio de esquema solicitado.
- Existen `unique`, índices y claves foráneas ya modelados. Hay restricciones CHECK y comentarios de base que Prisma advierte que requieren cuidado adicional si se generan migraciones.

## 9. Decisiones arquitectónicas documentadas

Los ADR aceptados bajo `docs/architecture/` fijan estas decisiones:

- Inventario: stock por depósito y movimientos como historial/auditoría; no almacenar stock solo a nivel de empresa.
- Base de datos: inglés, `snake_case`, tablas singulares, relaciones con FK e integridad en PostgreSQL.
- IDs: la documentación define una estrategia diferenciada para datos maestros y de negocio; el esquema Prisma actual usa UUID en todos los modelos existentes. Ante conflicto, no cambiar el esquema sin instrucción y confirmar la decisión antes de ampliar modelos.
- Multi-sucursal: una empresa puede tener varias sucursales y el diseño debe conservar ese alcance.
- Master data: los catálogos deben ser homogéneos (`id`, código/nombre/descripción, activo y timestamps, con excepciones justificadas).
- Geografía global y fiscal local: geografía ISO y jerarquía Country → State → City; ARCA y demás autoridades fiscales serán integraciones desacopladas, nunca dependencia del Core.
- Database Integrity First: una regla que PostgreSQL pueda garantizar debe existir también en la base de datos; la aplicación complementa, no reemplaza, esa protección.

## 10. Roadmap, no implementación actual

La secuencia proyectada es: seguridad; administración; CRM; catálogo; inventario; compras; ventas; finanzas; contabilidad; reportes; integraciones (ARCA, Mercado Libre, Tiendanube, WhatsApp, Gmail/calendario/bancos); ATLAS AI; e infraestructura (Docker, CI/CD, observabilidad). Tratarlo como visión, no como requerimiento implícito de cada tarea.

## 11. Riesgos y deuda técnica que ChatGPT debe considerar

- Los archivos de README de raíz y de `pampa-api` son plantillas de Next/Nest y no describen el producto.
- Hay texto con problemas de codificación visible como `gestiÃ³n` en algunos archivos. Al modificar texto en español, guardarlo correctamente en UTF-8 y evitar propagar mojibake.
- La documentación anterior menciona modelos/módulos que no están implementados o difiere del esquema real (por ejemplo `province` vs `state`).
- `AppModule` no carga los esqueletos core salvo countries; antes de “arreglar” ese punto, confirmar si el pedido incluye activarlos y completarlos.
- Ciertos controllers tienen logs de consola y formato irregular; no tomarlo como estándar de calidad.
- No hay CORS, prefijo `/api/v1`, configuración de puerto, health check, rate limiting, guards, refresh tokens ni estrategia de despliegue configurados en el código actual.
- No exponer secretos: `DATABASE_URL`, JWT secrets y otros valores van exclusivamente en variables de entorno.

## 12. Prompt operativo sugerido

Al recibir una tarea sobre PAMPA, responde y actúa con estas prioridades:

1. Identifica si afecta frontend (raíz) o backend (`pampa-api`) y trabaja en la aplicación correcta.
2. Verifica el código existente y el esquema Prisma antes de asumir modelos, endpoints o rutas.
3. Distingue lo implementado de la visión del roadmap.
4. Para backend, conserva Controller → Service → Repository → Prisma y DTOs validados; para frontend, conserva App Router, TypeScript estricto, Tailwind v4 y componentes locales.
5. Evita cambios de esquema, dependencias, infraestructura o autenticación global si no fueron solicitados explícitamente.
6. Si un pedido es ambiguo entre una corrección pequeña y una nueva funcionalidad, propone el alcance mínimo y señala cualquier decisión de producto que falte.
