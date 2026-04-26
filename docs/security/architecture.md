# Arquitectura de Seguridad — Comer en

> Documento vivo. Actualizar cuando cambie el stack, se agreguen controles, o se identifiquen nuevas superficies de ataque.
>
> Última actualización: 2026-04-26

---

## Stack y Modelo de Confianza

```
┌─────────────────────────────────────────────────────────┐
│                  INTERNET / USUARIOS                    │
└─────────────────────────┬───────────────────────────────┘
                          │ HTTPS
          ┌───────────────▼───────────────┐
          │   CDN / WAF (Cloudflare)      │  ← Headers de seguridad,
          │                               │    DDoS protection, bot rules
          └───────────────┬───────────────┘
                          │
          ┌───────────────▼───────────────┐
          │   Angular 19 SPA (browser)    │  ← XSS protegido por defecto
          │   • Escape automático en templates    CSP enforced
          │   • Guards de ruta (client-side UX)  Input sanitization
          └───────────────┬───────────────┘
                          │ HTTPS + JWT
          ┌───────────────▼───────────────┐
          │   Supabase BaaS               │
          │   ┌─────────────┐             │
          │   │ Auth (JWT)  │  ← Tokens firmados HS256
          │   │             │    Role en app_metadata (server-only)
          │   └──────┬──────┘
          │          │
          │   ┌──────▼──────┐             │
          │   │ PostgreSQL  │  ← RLS en todas las tablas
          │   │ + RLS       │    get_my_role() lee del JWT
          │   └──────┬──────┘             │
          │          │                    │
          │   ┌──────▼──────┐             │
          │   │ Storage     │  ← Path-based ownership
          │   │             │    auth.uid() como prefijo
          │   └─────────────┘             │
          └───────────────────────────────┘
```

## Modelo de Roles

| Rol | Asignable en signup | Asignable por admin | Capacidades |
|-----|---------------------|---------------------|-------------|
| `client` | ✅ (default) | ✅ | Ver directorio, hacer pedidos |
| `business` | ✅ (via selector) | ✅ | + Gestionar perfil de negocio |
| `admin` | ❌ (whitelist en trigger) | ✅ (via dashboard) | Acceso total |

**Flujo de rol:**
1. Usuario se registra → `raw_user_meta_data.role` máximo `client` o `business`
2. Trigger `handle_new_user` valida whitelist → inserta en `profiles`
3. Si admin cambia rol → trigger `handle_profile_role_change` → actualiza `raw_app_meta_data`
4. Usuario hace re-login → JWT nuevo con rol correcto en `app_metadata`

## Superficies de Ataque y Controles

### Frontend
| Riesgo | Control | Estado |
|--------|---------|--------|
| XSS | Angular template escaping (por defecto) | ✅ Activo |
| Clickjacking | `X-Frame-Options: SAMEORIGIN` | ⚙️ Pendiente (CDN config) |
| MIME sniffing | `X-Content-Type-Options: nosniff` | ⚙️ Pendiente (CDN config) |
| Info leakage en errores | Error mapping sin raw messages | ✅ Phase 1 |
| Input injection | Sanitización en search query | ✅ Phase 1 |
| File upload abuso | MIME + extensión + tamaño validados | ✅ Phase 1 |

### Autenticación
| Riesgo | Control | Estado |
|--------|---------|--------|
| Admin role self-assignment | Whitelist en trigger `handle_new_user` | ✅ Phase 1 |
| Brute force login | Rate limiting Supabase Auth | ✅ Nativo |
| Weak passwords | Mínimo 8 chars | ✅ Phase 1 |
| Account takeover | MFA disponible (activar en dashboard) | ⚙️ Recomendado |
| OAuth token interception | Redirect URLs en allowlist Supabase | ⚙️ Verificar dashboard |

### Base de Datos (RLS)
| Tabla | RLS | Política principal |
|-------|-----|-------------------|
| `profiles` | ✅ | Users ven su propio perfil; admin ve todos |
| `accounts` | ✅ | Public SELECT si `approved`; owner CRUD |
| `catalog_items` | ✅ | Public SELECT si `active`; owner CRUD |
| `order_logs` | ✅ | Authenticated INSERT; owner/admin SELECT |
| `home_config` | ✅ | Public SELECT; admin ALL |
| `home_featured` | ✅ | Public SELECT; admin ALL |

### Funciones SECURITY DEFINER
| Función | Role Guard | SET search_path |
|---------|------------|-----------------|
| `handle_new_user` | N/A (trigger) | ✅ |
| `handle_profile_role_change` | N/A (trigger) | N/A |
| `get_admin_stats` | ✅ Phase 1 | ✅ Phase 1 |
| `get_all_orders_admin` | ✅ Phase 1 | ✅ Phase 1 |
| `get_order_stats` | ✅ Phase 1 | ✅ Phase 1 |
| `get_my_role` | N/A (helper) | ✅ |

### Storage
| Bucket | Acceso read | Acceso write | Validación |
|--------|-------------|--------------|------------|
| `avatars` | Public | `auth.uid()` como prefijo | MIME + extensión + 5MB |
| `accounts` | Public | `auth.uid()` como prefijo | MIME + extensión + 5MB |
| `catalog` | Public | `auth.uid()` como prefijo | MIME + extensión + 5MB |

## Headers HTTP de Seguridad (Objetivo)

```
Content-Security-Policy: default-src 'self';
  connect-src 'self' https://*.supabase.co wss://*.supabase.co;
  font-src 'self' https://fonts.gstatic.com;
  style-src 'self' https://fonts.googleapis.com 'unsafe-inline';
  img-src 'self' data: blob: https://*.supabase.co;
  frame-ancestors 'none';

X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: strict-origin-when-cross-origin
Permissions-Policy: camera=(), microphone=(), geolocation=(self)
Strict-Transport-Security: max-age=31536000; includeSubDomains
```

## Decisiones de Arquitectura

Ver carpeta `docs/security/decisions/` para los ADRs (Architecture Decision Records).

## Pipeline de Seguridad (CI/CD)

```
Push / PR
    │
    ├── dependency-audit (npm audit --audit-level=high)
    ├── sast-scan (Semgrep: angular + typescript + owasp-top-ten)
    └── secrets-scan (Gitleaks, historial completo)
```

Todos los jobs deben pasar antes de hacer merge a `main`.
