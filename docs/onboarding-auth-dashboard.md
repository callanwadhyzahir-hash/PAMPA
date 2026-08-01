# PAMPA — Registro, onboarding y dashboard

Estado: aprobado para implementación el 30 de julio de 2026.

## Objetivo

Hacer que el primer acceso sea guiado y que el dashboard funcione como centro
de comando del ERP, sin presentar integraciones o automatizaciones que todavía
no existen.

## Registro público

`POST /auth/register` crea en una única transacción:

- empresa argentina con moneda ARS;
- usuario propietario activo;
- roles de sistema y sus permisos;
- asignación del rol `OWNER`.

El endpoint recibe nombre, apellido, nombre comercial, CUIT, email y contraseña.
Los identificadores de catálogos se resuelven en PostgreSQL y nunca se aceptan
desde el navegador. El alta aplica rate limiting, normalización, hash de
contraseña, conflicto neutral para email/CUIT y auditoría.

No se crea una sucursal, dirección ni depósito con información inventada. Esos
datos se completan desde el recorrido inicial.

## Primer acceso

El tutorial se identifica por usuario y versión. Puede iniciarse al entrar,
omitirse, cerrarse y repetirse desde la barra superior. Sus pasos enlazan a
funciones reales:

1. centro de comando;
2. métricas y alertas;
3. creación de producto;
4. registro de venta;
5. configuración de empresa y sucursales.

## Dashboard

El dashboard conserva sus métricas provenientes de PostgreSQL y agrega:

- bienvenida y contexto temporal;
- acciones rápidas según permisos;
- progreso inicial calculado con datos reales disponibles;
- alertas de stock accionables;
- ventas y movimientos recientes;
- filtros de período y sucursal.

Google OAuth, OCR de facturas, ARCA, marketplaces y asistente con IA quedan fuera
de esta entrega hasta disponer de contratos e infraestructura reales.
