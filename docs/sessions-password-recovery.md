# Sesiones y recuperación de acceso

## Sesiones

PAMPA entrega un access token de 15 minutos y un refresh token opaco de 30 días en cookies HttpOnly. El JWT sólo contiene `sub`, `companyId`, `sessionId` y `tokenVersion`; issuer, audience, emisión y expiración son claims estándar. Roles y permisos se resuelven desde PostgreSQL en cada request.

El refresh se guarda únicamente como SHA-256. Cada uso revoca la fila anterior y crea una nueva dentro de la misma familia. Reutilizar un token revocado, vencido o perteneciente a un usuario o empresa inactivos revoca toda la familia. `logout` revoca la sesión actual; `logout-all`, cambios de contraseña, roles o permisos invalidan sesiones mediante revocación o `token_version`.

Las cookies usan `SameSite=Lax`, `Secure` en producción y no admiten acceso desde JavaScript. Esto requiere servir web y API como sitios del mismo dominio registrable. Si se elige una arquitectura cross-site deberá incorporarse un token CSRF y cambiar la política de cookie de manera explícita.

## Recuperación

`POST /auth/forgot-password` siempre responde de forma neutral. Para cuentas activas crea un token criptográfico de 48 bytes, guarda sólo su hash, invalida enlaces anteriores y lo vence a los 30 minutos. Resend recibe el token únicamente para construir el enlace; no se imprime ni se devuelve.

`POST /auth/reset-password` consume el token una sola vez dentro de una transacción, actualiza el hash bcrypt con costo 12, incrementa `token_version` y revoca todas las sesiones. `POST /auth/change-password` exige la contraseña actual y aplica la misma invalidación.

Variables:

- `DATABASE_URL`
- `JWT_SECRET`
- `FRONTEND_URL`
- `NODE_ENV`
- `PORT`
- `ENABLE_SWAGGER`
- `RESEND_API_KEY`
- `PASSWORD_RESET_FROM`
- `NEXT_PUBLIC_API_URL`

## Operación y deploy

```powershell
cd pampa-api
npm.cmd ci
npx.cmd prisma migrate deploy
npm.cmd run build
npm.cmd run start:prod
```

En producción, Swagger queda deshabilitado salvo `ENABLE_SWAGGER=true`. `FRONTEND_URL` admite una lista separada por comas. El proxy confiable se limita a un salto. La API emite HSTS, bloqueo de framing, `nosniff`, política de referrer y política de permisos.

Checklist previo:

- usar HTTPS en web y API;
- generar `JWT_SECRET` de al menos 32 caracteres;
- verificar que web y API sean same-site;
- ejecutar `prisma migrate deploy`, nunca `migrate dev`;
- configurar Resend sin exponer la API key;
- comprobar CORS con el origen productivo exacto;
- mantener Swagger cerrado;
- ejecutar tests, builds, `git diff --check` y búsqueda de secretos.

## Rollback

Las migraciones son aditivas. Antes de revertir, detener la aplicación y respaldar PostgreSQL. Para volver al binario anterior pueden conservarse las tablas/columnas nuevas sin afectar el esquema previo. Eliminar manualmente tablas o constraints sólo debe hacerse mediante una migración de rollback revisada y después de confirmar que no contienen sesiones o evidencia de auditoría necesaria.
