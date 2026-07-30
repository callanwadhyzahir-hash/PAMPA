# Bootstrap RBAC de PAMPA

Este procedimiento crea el catálogo tenant, los roles de sistema por empresa
activa, sincroniza su matriz y permite asignar explícitamente el primer OWNER.
No corre automáticamente al iniciar la API.

## Requisitos y comprobaciones

Ejecutar desde `pampa-api/` con la configuración local de desarrollo ya
existente. No copiar valores de `.env` a comandos, logs o documentación.

Antes de migrar:

- verificar que la conexión corresponde a la base local;
- revisar que no existan códigos de sistema duplicados;
- revisar asignaciones `user_role` entre empresas;
- revisar el SQL de la migración;
- realizar respaldo cuando el entorno contenga datos importantes.

## Migración

```text
npx prisma validate
npx prisma migrate status
npx prisma migrate deploy
```

La migración `20260729120000_add_role_system_code` agrega:

```text
role.system_code VARCHAR(30) NULL
UNIQUE (company_id, system_code)
```

No borra ni renombra roles. PostgreSQL admite varios `NULL` en la restricción
compuesta, de modo que roles personalizados distintos pueden conservar
`system_code = NULL`.

## Bootstrap idempotente

```text
npm run rbac:bootstrap
```

Puede ejecutarse nuevamente después de:

- activar una empresa;
- desplegar una versión que agregue metadata o permisos aprobados;
- necesitar reparar la matriz estándar.

La sincronización elimina de roles de sistema las relaciones que no están en la
matriz versionada. No usar roles de sistema para personalizaciones locales;
esas variantes deben implementarse como roles personalizados.

## Asignación inicial de OWNER

Primero ejecutar el bootstrap. Después:

```text
npm run rbac:assign-owner -- --email=<correo-del-usuario>
```

El argumento es temporal y explícito. No incluir el correo real en archivos
versionados ni hardcodear UUID de usuario, empresa o rol. El comando:

- normaliza el correo;
- exige usuario y empresa activos;
- busca OWNER en la misma empresa;
- usa upsert;
- no modifica la contraseña;
- puede repetirse para confirmar el resultado.

Tras la asignación, cerrar sesión e iniciar sesión nuevamente porque el JWT
emitido anteriormente no contiene los nuevos roles y permisos.

## Diagnóstico seguro

```text
npx prisma migrate status
npm run rbac:bootstrap
```

Interpretación:

- `USER_NOT_FOUND`: revisar el argumento sin publicarlo.
- usuario o empresa inactivos: corregir el estado mediante un flujo aprobado,
  no mediante este comando.
- `OWNER_ROLE_UNAVAILABLE`: ejecutar el bootstrap y revisar que la empresa esté
  activa.
- conflicto de nombre: existe un rol personalizado con la etiqueta reservada;
  detenerse y revisar manualmente, sin renombrarlo en silencio.

No registrar contraseñas, JWT, cadenas de conexión, correos reales ni UUID.

## Reversión

La migración es aditiva. No se recomienda revertirla después del bootstrap
porque `system_code` identifica roles ya utilizados. En un entorno local
descartable y sólo después de confirmar que no hay datos RBAC que conservar, la
reversión conceptual es eliminar primero el índice
`uq_role_company_system_code` y luego la columna `role.system_code`.

No ejecutar esa reversión sobre datos reales. En un entorno compartido, crear
una migración compensatoria revisada y un respaldo; nunca editar la baseline ni
usar un reset destructivo.
# Administración posterior al bootstrap

El bootstrap sigue siendo idempotente y conserva los ocho roles de sistema. Los roles personalizados usan `system_code = null`; los roles de sistema son inmutables. Sólo OWNER puede delegar `users.assign_roles` y `roles.assign_permissions`, asignar OWNER o retirar OWNER cuando permanece al menos otro OWNER activo.

Los endpoints administrativos nunca aceptan `companyId`. Las asignaciones de roles se ejecutan con advisory lock y transacción, validan que usuario y roles pertenezcan al mismo tenant e incrementan `token_version`.
