# API Standards

## Objetivo

Definir un estándar único para el desarrollo de todas las APIs del proyecto PAMPA.

Todo endpoint deberá seguir las mismas reglas para mantener consistencia, legibilidad y escalabilidad.

---

# Arquitectura

Toda petición seguirá el siguiente flujo:

Cliente

↓

Controller

↓

Service

↓

PrismaService

↓

PostgreSQL

Nunca un Controller accederá directamente a la base de datos.

---

# Controllers

Los Controllers deben ser extremadamente simples.

Responsabilidades:

- Recibir solicitudes HTTP
- Validar DTOs
- Invocar Services
- Devolver respuestas

No deben contener:

- Lógica de negocio
- Consultas SQL
- Acceso a Prisma

Ejemplo:

GET /companies

↓

CompanyController

↓

CompanyService.findAll()

---

# Services

Toda la lógica de negocio vive aquí.

Responsabilidades:

- Validaciones de negocio
- Acceso a Prisma
- Reglas empresariales
- Integraciones externas

Los Services nunca deberán acceder directamente al Request ni al Response de Express.

---

# DTO

Todo dato recibido por la API utilizará DTOs.

Se utilizarán:

- class-validator
- class-transformer

Ejemplo:

CreateUserDto

UpdateUserDto

LoginDto

CreateProductDto

---

# Validaciones

Todas las validaciones se realizarán mediante decoradores.

Ejemplo:

- @IsString()
- @IsEmail()
- @IsUUID()
- @IsOptional()
- @IsBoolean()
- @IsDateString()
- @Min()
- @Max()

No se realizarán validaciones manuales.

---

# Nombres de Endpoints

Se utilizará REST.

Ejemplos:

GET /users

GET /users/:id

POST /users

PATCH /users/:id

DELETE /users/:id

Nunca utilizar verbos.

Incorrecto:

/getUsers

/createUser

/deleteProduct

---

# Respuestas HTTP

200 OK

201 Created

204 No Content

400 Bad Request

401 Unauthorized

403 Forbidden

404 Not Found

409 Conflict

500 Internal Server Error

---

# Swagger

Todos los endpoints deberán documentarse.

Se utilizarán:

@ApiTags()

@ApiOperation()

@ApiResponse()

@ApiBearerAuth()

---

# Manejo de Errores

Siempre utilizar HttpException de NestJS.

Nunca devolver errores manualmente.

Ejemplo:

throw new NotFoundException();

throw new BadRequestException();

throw new UnauthorizedException();

---

# Seguridad

Todas las rutas privadas utilizarán:

JwtAuthGuard

RolesGuard

PermissionsGuard (futuro)

---

# Versionado

La API utilizará versionado.

Ejemplo:

/api/v1/users

/api/v1/products

/api/v2/...

---

# Formato JSON

Respuesta correcta:

{
  "success": true,
  "data": {}
}

Respuesta con error:

{
  "success": false,
  "message": "User not found"
}

---

# Convenciones

Variables:

camelCase

Clases:

PascalCase

Archivos:

kebab-case

DTO:

CreateUserDto

Services:

UserService

Controllers:

UserController

Modules:

UserModule

---

# Filosofía

Una API debe ser:

- Consistente
- Predecible
- Segura
- Documentada
- Fácil de mantener