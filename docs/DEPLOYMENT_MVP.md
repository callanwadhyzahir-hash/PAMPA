# Despliegue del MVP

> **LEGACY:** Este documento describe un despliegue en Render y ya no
> refleja la infraestructura definitiva de PAMPA. La arquitectura de
> producción es Vercel (frontend) + Railway (backend API + PostgreSQL).
> Se conserva como referencia histórica; no seguir estos pasos para
> desplegar.

## Alcance

La primera versión pública habilita el flujo operativo de clientes, productos y
ventas. ARCA y la operación con lectores o generación de códigos de barras no
forman parte de esta entrega.

## Arquitectura

- Frontend Next.js en Vercel.
- API NestJS en Render.
- PostgreSQL administrado y persistente.
- El navegador consume `/api/backend`; Next.js reenvía esas solicitudes a la
  API. Así las cookies HttpOnly permanecen en el mismo sitio del frontend.

## API y base de datos

1. Crear una base PostgreSQL persistente.
2. En Render, crear un Blueprint desde este repositorio usando `render.yaml`.
3. Completar `DATABASE_URL` con la conexión PostgreSQL.
4. Completar `FRONTEND_URL` con la URL final de Vercel.
5. Render ejecutará las migraciones versionadas durante el build y comprobará
   `GET /health` antes de publicar la instancia.

El plan gratuito de Render sirve para validar una beta, pero su servicio entra
en reposo por inactividad. No usar una base gratuita temporal para datos que
deban conservarse.

## Frontend

1. Importar el repositorio en Vercel con la raíz del proyecto como Root Directory.
2. Configurar `NEXT_PUBLIC_API_URL=/api/backend`.
3. Configurar `BACKEND_API_URL` con la URL HTTPS de la API de Render, sin barra final.
4. Desplegar y luego actualizar `FRONTEND_URL` en Render con el dominio de Vercel.

## Verificación obligatoria

1. `GET https://<api>/health` responde 200.
2. Registrar una empresa y luego iniciar sesión.
3. Configurar la sucursal y el depósito operativos iniciales.
4. Crear un cliente y un producto.
5. Registrar y confirmar una venta.
6. Verificar que la venta persiste después de cerrar sesión y volver a ingresar.
