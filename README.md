# Come en Girardota — Directorio Girardota

Directorio gastronómico de Girardota, Antioquia. Los negocios se registran, gestionan su catálogo y reciben pedidos por WhatsApp; los usuarios navegan el directorio, arman pedidos y califican productos.

## Stack

- **Frontend:** Angular 19 (standalone components, signals, control flow `@if`/`@for`), desplegado en Vercel
- **Backend:** Supabase (Postgres + Auth + Storage + Edge Functions)
- **Mapas:** Google Maps JavaScript API
- **Captcha:** Cloudflare Turnstile
- **Correo transaccional:** Resend
- **Monitoreo de errores:** Sentry

## Requisitos previos

- Node.js 20+
- Una cuenta de Supabase con acceso al proyecto (o uno nuevo para desarrollo)
- [Supabase CLI](https://supabase.com/docs/guides/cli) si vas a desplegar Edge Functions o correr migraciones vía CLI (en este proyecto las migraciones se aplican manualmente por el SQL Editor, ver abajo)

## Setup local

```bash
npm install
```

Copia `src/environments/environment.ts` y completa las variables (ver tabla abajo). Para desarrollo local, `sentryDsn` y `turnstileSiteKey` pueden quedar vacíos — el código los trata como "desactivado" cuando están vacíos, no rompe nada.

```bash
npm start
```

Abre `http://localhost:4200`.

## Variables de entorno

Viven en `src/environments/environment.ts` (desarrollo) y `environment.prod.ts` (producción) — **no en un `.env`**, es la convención estándar de Angular.

| Variable | Dónde se obtiene | Vacía en dev está bien? |
|---|---|---|
| `supabaseUrl` / `supabaseAnonKey` | Supabase → Settings → API | No |
| `googleMapsApiKey` | Google Cloud Console → Credentials, restringida por HTTP referrer | No (el mapa no carga sin ella) |
| `turnstileSiteKey` | Cloudflare → Turnstile | Sí |
| `sentryDsn` | Sentry.io → Settings del proyecto → Client Keys (DSN) | Sí — Sentry no se inicializa si está vacío |

`environment.prod.ts` **no debe llevar placeholders sin reemplazar** al desplegar — si `googleMapsApiKey` queda como texto de relleno, el mapa no carga en producción (ya pasó una vez, ver historial de commits).

## Estructura del proyecto

```
src/app/
  core/       servicios transversales (auth, sesión, storage, guards)
  features/   admin, auth, business, client, directory — una carpeta por área funcional
  layouts/    layouts de auth
  shared/     componentes, pipes y directivas reutilizables entre features
supabase/
  migrations/ SQL versionado, ver convención abajo
  functions/  Edge Functions (Deno)
```

## Base de datos — migraciones

Las migraciones en `supabase/migrations/` **no se aplican con `supabase db push`** — este proyecto se maneja copiando y pegando cada archivo en el **SQL Editor de Supabase**, en orden numérico. `supabase migration list` confirma que ninguna está en el tracking remoto de Supabase; son un registro histórico versionado en el repo, no un pipeline automático.

Convención de nombres: `NNN_descripcion.sql`, secuencial. Excepción: `002a_jwt_trigger.sql` y `002b_rls_policies.sql` — se insertaron entre `002` y `003` sin renumerar todo lo posterior (ver commit `62763a7` para el porqué).

Al aplicar una migración nueva, verifica el archivo mismo — algunas traen notas de "correr también esto en Vault" o pasos manuales adicionales (ej. `024_expiry_warning_cron.sql`).

## Edge Functions

En `supabase/functions/`:

- `verify-turnstile` — valida el captcha en el servidor durante el registro
- `send-upgrade-request` — negocio pide ampliar su plan; guarda la solicitud y notifica al admin por correo
- `send-expiry-warning` — cron diario que avisa a un negocio antes de que venza su plan ampliado
- `_shared/` — helpers compartidos (cliente admin de Supabase, envío de correo vía Resend) — no se despliega como función propia

Desplegar una función:

```bash
supabase functions deploy <nombre-de-la-funcion>
```

Secrets que necesitan (`supabase secrets set NOMBRE=valor`, no van en el repo):

```
RESEND_API_KEY
RESEND_FROM
ADMIN_NOTIFICATION_EMAIL
```

`send-expiry-warning` además depende de un cron (`pg_cron` + `pg_net`, configurado en `024_expiry_warning_cron.sql`) que necesita el Service Role Key guardado en Supabase Vault — ver el comentario al inicio de esa migración.

## Desarrollo

```bash
npm start                # servidor de desarrollo, http://localhost:4200
npm run build             # build de producción en dist/
npm run watch              # build en modo watch (desarrollo)
npm test                   # tests unitarios (Karma/Jasmine) — cobertura mínima hoy
```

## Seguridad

`vercel.json` define headers de seguridad (CSP, HSTS, etc.) para todo el sitio. Si agregas un servicio externo nuevo (otro SDK, otra API de terceros), probablemente necesites sumar su dominio al `Content-Security-Policy` ahí — si no, el navegador lo bloquea en producción aunque funcione perfecto en local (ya pasó con Google Maps y Sentry).

Hay un pipeline de CI en `.github/workflows/security.yml` (npm audit, SAST con Semgrep, detección de secrets con Gitleaks) que corre en cada push a `main`.

## Deploy

Vercel despliega automáticamente cada push a `main`. No hay ambiente de staging separado — los cambios van directo a producción al hacer push.
