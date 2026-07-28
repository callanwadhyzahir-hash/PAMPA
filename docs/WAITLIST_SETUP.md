# Lista de espera de PAMPA

La landing envía el formulario a `POST /api/waitlist`. Ese Route Handler guarda la solicitud con la service role de Supabase y, solo para registros nuevos, envía una confirmación con Resend.

## Supabase

1. Creá un proyecto de Supabase y abrí **SQL Editor**.
2. Copiá y ejecutá el contenido de [`sql/waitlist_entries.sql`](./sql/waitlist_entries.sql).
3. Copiá la URL del proyecto en `SUPABASE_URL` y la **service_role key** en `SUPABASE_SERVICE_ROLE_KEY`.

La service role es secreta: no debe publicarse, estar en el frontend ni tener prefijo `NEXT_PUBLIC`.

## Resend

1. Verificá el dominio o subdominio remitente en Resend.
2. Configurá `RESEND_API_KEY` y `WAITLIST_FROM_EMAIL` con un remitente verificado.
3. Si querés recibir respuestas, configurá `WAITLIST_REPLY_TO_EMAIL`.

Resend mostrará los registros DNS exactos requeridos para la verificación. Copialos tal como los entregue: no se deben inventar valores de SPF, DKIM o DMARC.

## Variables en Vercel

Configurá estas variables en **Settings > Environment Variables** para Production y Preview, según corresponda:

| Variable | Visibilidad |
| --- | --- |
| `NEXT_PUBLIC_SITE_URL` | Pública |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Pública |
| `SUPABASE_URL` | Servidor |
| `SUPABASE_SERVICE_ROLE_KEY` | Secreta |
| `RESEND_API_KEY` | Secreta |
| `WAITLIST_FROM_EMAIL` | Servidor |
| `WAITLIST_REPLY_TO_EMAIL` | Servidor |

Cada cambio de variables en Vercel requiere un nuevo despliegue.

## Limitación anti-spam

El endpoint combina honeypot, tiempo mínimo de formulario, límite de body, validación estricta y un límite de cinco solicitudes por minuto por IP. El rate limit usa memoria del proceso: es útil como capa mínima, pero no es distribuido ni global entre instancias serverless. Si el volumen crece, reemplazarlo por Vercel KV, Upstash u otra capa compartida.
