# Supabase — Plan de ejecución

## Orden obligatorio

Ejecutar en Supabase Dashboard → SQL Editor, en este orden exacto:

1. `jwt_trigger.sql`   — triggers y función get_my_role()
2. `rls_policies.sql`  — todas las policies de tablas y storage

---

## Por qué este orden

`rls_policies.sql` usa la función `get_my_role()` que se define en
`jwt_trigger.sql`. Si ejecutás las policies primero, fallan porque
la función no existe aún.

---

## Qué resuelve cada archivo

### jwt_trigger.sql
- Crea `get_my_role()`: lee el rol desde el JWT en vez de hacer
  un SELECT a profiles → elimina la recursión infinita
- Trigger `on_profile_role_change`: cuando el admin cambia el rol
  de un usuario en profiles, lo sincroniza al JWT automáticamente
- Trigger `on_auth_user_created`: crea el perfil automáticamente
  al registrarse un usuario nuevo
- Sincronización manual: actualiza el JWT de usuarios ya existentes

### rls_policies.sql
- Habilita RLS en profiles, accounts, catalog_items
- Elimina TODAS las policies existentes (incluyendo la rota)
- Crea policies nuevas sin recursión para las 3 tablas
- Crea/configura los 3 buckets de storage (avatars, accounts, catalog)
- Crea policies de storage por carpeta de usuario

---

## Matriz de permisos resultante

### profiles
| Operación | Cliente | Business | Admin |
|-----------|---------|----------|-------|
| SELECT    | solo el suyo | solo el suyo | todos |
| INSERT    | solo el suyo | solo el suyo | todos |
| UPDATE    | solo el suyo | solo el suyo | todos |
| DELETE    | NO | NO | NO |

### accounts
| Operación | Anónimo | Cliente | Business | Admin |
|-----------|---------|---------|----------|-------|
| SELECT    | solo aprobados/activos | solo aprobados/activos | los propios + aprobados | todos |
| INSERT    | NO | NO | solo como owner | todos |
| UPDATE    | NO | NO | solo los propios | todos |
| DELETE    | NO | NO | NO | todos |

### catalog_items
| Operación | Anónimo | Cliente | Business | Admin |
|-----------|---------|---------|----------|-------|
| SELECT    | activos de negocios aprobados | ídem | los propios (activos e inactivos) | todos |
| INSERT    | NO | NO | en sus negocios | todos |
| UPDATE    | NO | NO | en sus negocios | todos |
| DELETE    | NO | NO | en sus negocios | todos |

### storage (avatars / accounts / catalog)
| Operación | Anónimo | Cualquier usuario |
|-----------|---------|-------------------|
| SELECT    | SI (buckets públicos) | SI |
| INSERT    | NO | solo en su carpeta userId/ |
| UPDATE    | NO | solo en su carpeta userId/ |
| DELETE    | NO | solo en su carpeta userId/ |

---

## Verificación post-ejecución

Después de correr ambos archivos, ejecutar esta query para
confirmar que las policies quedaron bien:

```sql
SELECT tablename, policyname, cmd
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('profiles', 'accounts', 'catalog_items')
ORDER BY tablename, cmd;
```

Debería mostrar exactamente estas policies:
- profiles: 3 (SELECT, INSERT, UPDATE)
- accounts: 4 (SELECT, INSERT, UPDATE, DELETE)
- catalog_items: 4 (SELECT, INSERT, UPDATE, DELETE)



# Supabase — Come en Girardota

Documentación de infraestructura de base de datos y storage.

## Orden de ejecución

Ejecutar los migrations en el SQL Editor de Supabase en este orden exacto:

```
001_schema.sql        → tablas, tipos e índices
002_rls_policies.sql  → políticas de seguridad por fila
003_triggers.sql      → automatizaciones (perfil, rol, active)
004_storage.sql       → buckets e imágenes
seed.sql              → solo en proyecto nuevo (opcional)
```

## Configuración requerida en Supabase Dashboard

### Authentication → URL Configuration
| Campo | Valor desarrollo | Valor producción |
|---|---|---|
| Site URL | `http://localhost:4200` | `https://tudominio.com` |
| Redirect URLs | `http://localhost:4200/auth/reset-password` | `https://tudominio.com/auth/reset-password` |
| Redirect URLs | `http://localhost:4200/auth/confirm` | `https://tudominio.com/auth/confirm` |

### Authentication → Email Templates
Personalizar los templates de:
- **Confirm signup** → apuntar a `/auth/confirm`
- **Reset Password** → apuntar a `/auth/reset-password`

## Estructura de tablas

```
auth.users          (Supabase interno)
    │
    └── profiles    (1:1 — creado por trigger)
            │
            └── accounts    (1:1 — un negocio por usuario business)
                    │
                    └── catalog_items   (1:N — productos del negocio)
```

## Estructura de Storage

```
avatars/
  {userId}/
    avatar.jpg

accounts/
  {userId}/
    logo.jpg
    cover.jpg

catalog/
  {userId}/
    {uuid}.jpg     (imágenes de productos)
```

## Roles y permisos

| Rol | profiles | accounts | catalog_items | storage |
|---|---|---|---|---|
| anónimo | ✗ | solo aprobados | solo activos | solo lectura |
| client | propio | solo aprobados | solo activos | propio avatar |
| business | propio | propio + aprobados | propios + activos | propios |
| admin* | todos | todos | todos | todos |

*El admin usa `service_role` key desde el dashboard de Supabase — bypasea RLS.

## Ciclo de vida de un Account

```
[setup] → pending → [admin aprueba] → approved → visible en directorio
                  → [admin rechaza] → rejected
                  → [admin suspende] → suspended
```

El trigger `on_account_status_change` sincroniza `active = (status = 'approved')`
automáticamente en cada cambio de status.

## Variables de entorno requeridas

Crear `src/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  supabaseUrl: 'https://XXXXXXXXXXXXXXXX.supabase.co',
  supabaseAnonKey: 'eyJ...',
};
```

Los valores se encuentran en Supabase Dashboard → Settings → API.