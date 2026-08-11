# Bootstrap de PLATFORM_ADMIN

`PLATFORM_ADMIN` es una autoridad global, completamente separada del RBAC
tenant (`role`/`permission`/`user_role`). No es un rol, no se asigna desde
`/dashboard/users`, y un OWNER no puede otorgarlo, editarlo ni retirarlo.

## Requisitos

- El usuario ya debe existir (creado por el flujo normal de registro).
- No se hardcodea ningún correo. El argumento `--email` es explícito y
  temporal, igual que en `rbac:assign-owner`.

## Ejecución local

```text
npx prisma migrate deploy
npm run platform-admin:bootstrap -- --email=<correo-del-usuario>
```

El comando:

- busca el `user` por correo exacto;
- falla con `USER_NOT_FOUND` si no existe;
- si ya es `PLATFORM_ADMIN`, confirma sin duplicar (idempotente);
- si no lo es, crea el registro en `platform_admin`.

No modifica contraseñas, roles ni permisos tenant del usuario.

## Ejecución en Railway (pendiente, no ejecutado en este sprint)

Cuando corresponda promover al primer administrador de plataforma en
producción:

```text
railway run --service pampa-api npm run platform-admin:bootstrap -- --email=<correo>
```

Revisar antes:

- que `DATABASE_URL` apunte a la base de producción correcta;
- que la migración `20260811140000_add_platform_management` ya esté aplicada
  (`npx prisma migrate status`);
- no registrar el correo real en logs versionados ni en este documento.

Este sprint no ejecuta el bootstrap en producción; queda documentado para un
paso posterior explícito.
