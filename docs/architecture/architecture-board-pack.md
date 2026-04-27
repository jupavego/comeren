# Architecture Board Pack — Come en Girardota
**Versión:** 1.0 | **Fecha:** 2026-04-26 | **Autor:** Juan Pablo Velásquez / Claude Sonnet 4.6
**Stack:** Angular 19 · Supabase · Vercel · Cloudflare · GitHub Actions

---

## Índice

1. [System Context Diagram (C4-L1)](#1-system-context-diagram-c4-l1)
2. [Container Diagram (C4-L2)](#2-container-diagram-c4-l2)
3. [Component Diagram (C4-L3)](#3-component-diagram-c4-l3)
4. [Data Flow Diagram — PII y Órdenes](#4-data-flow-diagram--pii-y-órdenes)
5. [Security Architecture Diagram](#5-security-architecture-diagram)
6. [Trust Boundary / STRIDE Threat Model](#6-trust-boundary--stride-threat-model)
7. [Resiliencia y Recovery](#7-resiliencia-y-recovery)
8. [Puntos Críticos y Single Points of Failure](#8-puntos-críticos-y-single-points-of-failure)

---

## 1. System Context Diagram (C4-L1)

> Visión de 30.000 pies. El sistema en relación con sus usuarios y sistemas externos.

```mermaid
graph TB
    subgraph USERS["👥 Actores"]
        ANON["Visitante anónimo<br/>(explorar directorio)"]
        CLIENT["Cliente registrado<br/>(pedir por WhatsApp,<br/>valorar negocios)"]
        BUSINESS["Dueño de negocio<br/>(gestionar perfil,<br/>catálogo, pedidos)"]
        ADMIN["Administrador<br/>(aprobar negocios,<br/>gestionar plataforma)"]
    end

    subgraph SYSTEM["🏠 Come en Girardota"]
        APP["Directorio gastronómico<br/>Angular 19 SPA + Supabase BaaS<br/>comeren-ten.vercel.app"]
    end

    subgraph EXTERNAL["🌐 Sistemas Externos"]
        GOOGLE["Google OAuth 2.0<br/>(autenticación social)"]
        CLOUDFLARE["Cloudflare Turnstile<br/>(anti-bot registro)"]
        WHATSAPP["WhatsApp Business API<br/>(canal de pedidos)"]
        SENTRY["Sentry<br/>(error tracking — pendiente)"]
        GITHUB["GitHub<br/>(repositorio + CI/CD)"]
    end

    ANON -->|"Navega directorio,<br/>ve negocios"| APP
    CLIENT -->|"Se registra, hace pedidos,<br/>deja valoraciones"| APP
    BUSINESS -->|"Publica negocio,<br/>ve métricas"| APP
    ADMIN -->|"Modera, aprueba,<br/>configura home"| APP

    APP -->|"OAuth flow"| GOOGLE
    APP -->|"Verifica token anti-bot"| CLOUDFLARE
    APP -->|"Redirige pedido"| WHATSAPP
    APP -->|"Reporta errores<br/>(producción)"| SENTRY
    GITHUB -->|"Deploy automático"| APP
```

---

## 2. Container Diagram (C4-L2)

> Tecnologías y responsabilidades de cada contenedor del sistema.

```mermaid
graph TB
    subgraph VERCEL["☁️ Vercel — CDN Global"]
        SPA["Angular 19 SPA<br/>TypeScript · SCSS<br/>Lazy-loaded routes<br/>Security headers (vercel.json)"]
    end

    subgraph SUPABASE["🟢 Supabase — BaaS"]
        AUTH["Supabase Auth<br/>JWT · Google OAuth<br/>Email/Password<br/>Rate limiting nativo"]
        DB["PostgreSQL 15<br/>RLS habilitado<br/>Triggers · RPCs<br/>audit_logs"]
        STORAGE["Supabase Storage<br/>Imágenes de negocios<br/>MIME validation<br/>5MB limit"]
        EDGE["Edge Functions (Deno)<br/>verify-turnstile<br/>Región: us-east-1"]
    end

    subgraph CLOUDFLARE_C["☁️ Cloudflare"]
        TURNSTILE["Turnstile API<br/>challenges.cloudflare.com<br/>Token verification"]
    end

    subgraph GITHUB_C["🐙 GitHub"]
        REPO["Repositorio<br/>Branch: main + security"]
        ACTIONS["GitHub Actions CI/CD<br/>npm audit · Semgrep SAST<br/>Gitleaks secrets scan<br/>Dependabot weekly"]
    end

    subgraph GOOGLE_C["🔵 Google"]
        OAUTH["Google OAuth 2.0<br/>accounts.google.com"]
    end

    SPA -->|"REST + Realtime WebSocket<br/>anon key (JWT)"| AUTH
    SPA -->|"PostgREST API<br/>anon key + user JWT"| DB
    SPA -->|"Signed URLs"| STORAGE
    SPA -->|"invoke() HTTP"| EDGE
    EDGE -->|"POST siteverify"| TURNSTILE
    AUTH -->|"OAuth redirect"| OAUTH
    REPO -->|"Push trigger"| ACTIONS
    ACTIONS -->|"Deploy on merge"| VERCEL
```

---

## 3. Component Diagram (C4-L3)

> Internos del contenedor Angular SPA.

```mermaid
graph TB
    subgraph ANGULAR["Angular 19 SPA"]

        subgraph CORE["Core Layer"]
            SUPABASE_SVC["SupabaseService<br/>(client singleton,<br/>auth lock config)"]
            AUTH_SVC["AuthService<br/>(login, register,<br/>logout, mapAuthError)"]
            SESSION_SVC["SessionService<br/>(perfil reactivo,<br/>role signal)"]
            STORAGE_SVC["StorageService<br/>(upload + validateImageFile)"]
            TURNSTILE_SVC["TurnstileService<br/>(verify via Edge Fn)"]
            AUTHGATE_SVC["AuthGateService<br/>(modal auth required)"]
        end

        subgraph GUARDS["Guards"]
            AUTH_G["authGuard<br/>(requiere sesión)"]
            ROLE_G["roleGuard<br/>(requiere rol específico)"]
            PUBLIC_G["publicOnlyGuard<br/>(bloquea si logueado)"]
            SETUP_G["setupGuard<br/>(redirige si negocio existe)"]
        end

        subgraph FEATURES["Feature Modules (lazy-loaded)"]
            DIRECTORY["Directory<br/>home · negocio/:id<br/>búsqueda · carrusel<br/>reseñas · carrito"]
            AUTH_F["Auth<br/>login · register<br/>recover · reset-password"]
            BUSINESS["Business Panel<br/>setup · dashboard<br/>account · catalog<br/>ratings · orders"]
            ADMIN["Admin Panel<br/>dashboard · users<br/>accounts · catalog<br/>reports · ratings · orders · home"]
            CLIENT_F["Client<br/>profile-edit"]
        end

        subgraph SHARED["Shared Components"]
            HEADER["Header + UserWidget"]
            FOOTER["Footer"]
            CONSENT["ConsentBanner<br/>(Ley 1581)"]
            TURNSTILE_C["TurnstileComponent<br/>(widget Cloudflare)"]
            AUTHGATE_C["AuthGateComponent<br/>(modal)"]
            PRIVACY["PrivacyPage /privacidad"]
            SECURITY_P["SecurityDisclosurePage /security"]
        end

        subgraph INTERCEPTORS["Interceptors"]
            ERROR_INT["errorInterceptor<br/>(HTTP errors)"]
        end
    end

    AUTH_SVC --> SUPABASE_SVC
    SESSION_SVC --> SUPABASE_SVC
    STORAGE_SVC --> SUPABASE_SVC
    TURNSTILE_SVC --> SUPABASE_SVC
    AUTH_G --> SESSION_SVC
    ROLE_G --> SESSION_SVC
    PUBLIC_G --> SESSION_SVC
    DIRECTORY --> AUTH_SVC
    DIRECTORY --> TURNSTILE_SVC
    AUTH_F --> AUTH_SVC
    AUTH_F --> TURNSTILE_C
    BUSINESS --> STORAGE_SVC
    ADMIN --> SUPABASE_SVC
```

---

## 4. Data Flow Diagram — PII y Órdenes

### 4.1 Flujo de Registro (PII sensible)

```mermaid
sequenceDiagram
    actor U as Usuario
    participant SPA as Angular SPA
    participant CF as Cloudflare Turnstile
    participant EF as Edge Function<br/>verify-turnstile
    participant AUTH as Supabase Auth
    participant DB as PostgreSQL

    U->>SPA: Completa formulario<br/>(nombre, email, password, rol)
    SPA->>CF: Renderiza widget
    CF-->>U: Challenge (invisible/managed)
    U-->>CF: Interacción
    CF-->>SPA: Token (30 min TTL)
    SPA->>EF: POST {token}
    EF->>CF: POST siteverify {secret, token}
    CF-->>EF: {success: true/false}
    EF-->>SPA: {success: true}
    SPA->>AUTH: signUp {email, password, metadata: {full_name, role}}
    AUTH->>DB: TRIGGER handle_new_user()<br/>CASE role IN ('client','business')<br/>→ INSERT profiles(id, role, full_name)
    AUTH-->>SPA: {user, session}
    AUTH->>U: Email de confirmación
    Note over DB: PII almacenada: nombre, email, rol<br/>NO se almacena: password (hash en Auth)
```

### 4.2 Flujo de Pedido por WhatsApp (PII en tránsito)

```mermaid
sequenceDiagram
    actor C as Cliente
    participant SPA as Angular SPA
    participant GATE as AuthGateService
    participant DB as PostgreSQL<br/>order_logs
    participant WA as WhatsApp

    C->>SPA: Clic "Hacer pedido"
    SPA->>GATE: requireAuth()
    alt No autenticado
        GATE-->>C: Modal "Inicia sesión"
        C->>SPA: Login
    end
    C->>SPA: Selecciona productos<br/>(CartService)
    SPA->>SPA: Construye mensaje WhatsApp
    SPA->>DB: INSERT order_logs<br/>{account_id, buyer_id, buyer_name,<br/>buyer_phone, total, payment}<br/>RLS: buyer_id = auth.uid()<br/>Rate limit: max 10/hora
    DB-->>SPA: OK
    SPA->>WA: window.open(wa.me/57{phone})<br/>PII en URL: nombre + detalle pedido
    Note over WA: ⚠️ PII sale del sistema<br/>hacia WhatsApp (fuera de control)
    Note over DB: Registro guardado para<br/>métricas del negocio
```

### 4.3 Flujo de Acceso Admin (datos sensibles)

```mermaid
sequenceDiagram
    actor A as Admin
    participant SPA as Angular SPA
    participant DB as PostgreSQL
    participant RPC as RPCs SECURITY DEFINER

    A->>SPA: Login (email + password)
    SPA->>DB: auth.signInWithPassword()
    DB-->>SPA: JWT {app_metadata: {role: 'admin'}}
    A->>SPA: Accede /admin/dashboard
    SPA->>RPC: get_admin_stats()
    RPC->>RPC: IF get_my_role() ≠ 'admin'<br/>RAISE EXCEPTION 'Access denied'
    RPC->>DB: SELECT COUNT(*) FROM profiles, accounts, order_logs
    RPC-->>SPA: JSON agregado (sin PII individual)
    A->>SPA: Accede /admin/orders
    SPA->>RPC: get_all_orders_admin()
    RPC->>RPC: Role guard check
    RPC->>DB: SELECT con buyer_name, buyer_phone
    RPC-->>SPA: PII visible solo para admin
    Note over DB: audit_logs registra<br/>acciones privilegiadas
```

---

## 5. Security Architecture Diagram

> Controles de seguridad implementados por capa.

```mermaid
graph TB
    subgraph INTERNET["🌐 Internet (Untrusted)"]
        ATTACKER["Atacante / Bot"]
        USER_I["Usuario legítimo"]
    end

    subgraph EDGE_LAYER["🛡️ Edge Layer — Vercel CDN"]
        HEADERS["Security Headers<br/>━━━━━━━━━━━━━━━<br/>HSTS: 2 años + preload<br/>CSP: allowlist explícita<br/>X-Frame-Options: DENY<br/>Permissions-Policy<br/>X-Content-Type-Options: nosniff<br/>Referrer-Policy: strict-origin"]
    end

    subgraph APP_LAYER["⚙️ Application Layer — Angular SPA"]
        TURNSTILE_L["Cloudflare Turnstile<br/>━━━━━━━━━━━━━━━<br/>Anti-bot en registro<br/>Token 30min TTL<br/>Verificación server-side"]
        AUTH_MAP["Error Mapping<br/>━━━━━━━━━━━━━━━<br/>mapAuthError()<br/>Sin raw errors al UI<br/>OWASP A02"]
        CONSENT_L["Consent Banner<br/>━━━━━━━━━━━━━━━<br/>Ley 1581 Colombia<br/>localStorage persistence"]
        VALIDATORS["Input Validation<br/>━━━━━━━━━━━━━━━<br/>sanitizeQuery()<br/>validateImageFile()<br/>MIME + ext + 5MB"]
    end

    subgraph API_LAYER["🔌 API Layer — PostgREST + Supabase Auth"]
        JWT_L["JWT Validation<br/>━━━━━━━━━━━━━━━<br/>Supabase verifica cada request<br/>app_metadata.role en token<br/>Expiración automática"]
        RATE_L["Rate Limiting<br/>━━━━━━━━━━━━━━━<br/>Auth: nativo Supabase<br/>order_logs: 10/hora RLS<br/>Turnstile: por IP"]
    end

    subgraph DB_LAYER["🗄️ Database Layer — PostgreSQL + RLS"]
        RLS_L["Row Level Security<br/>━━━━━━━━━━━━━━━<br/>get_my_role() centralizado<br/>Todas las tablas con RLS<br/>Política por rol y owner"]
        TRIGGER_L["Trigger Whitelist<br/>━━━━━━━━━━━━━━━<br/>handle_new_user()<br/>role IN ('client','business')<br/>Admin NO asignable vía API"]
        RPC_L["RPC Guards<br/>━━━━━━━━━━━━━━━<br/>get_admin_stats()<br/>get_all_orders_admin()<br/>get_order_stats()<br/>Role check + SET search_path"]
        AUDIT_L["Audit Log<br/>━━━━━━━━━━━━━━━<br/>audit_logs inmutable<br/>actor_id = auth.uid()<br/>Sin UPDATE/DELETE policy"]
    end

    subgraph CICD_LAYER["🔄 CI/CD Layer — GitHub Actions"]
        NPM_L["npm audit<br/>--audit-level=high"]
        SEMGREP_L["Semgrep SAST<br/>Angular · OWASP rules"]
        GITLEAKS_L["Gitleaks<br/>Historial completo"]
        DEPENDABOT_L["Dependabot<br/>Weekly · agrupado"]
    end

    ATTACKER -->|"Bloqueado por headers CSP"| HEADERS
    ATTACKER -->|"Bloqueado por Turnstile"| TURNSTILE_L
    USER_I --> HEADERS
    HEADERS --> APP_LAYER
    APP_LAYER --> API_LAYER
    API_LAYER --> DB_LAYER
    CICD_LAYER -.->|"Escanea en cada push"| APP_LAYER
```

---

## 6. Trust Boundary / STRIDE Threat Model

### 6.1 Trust Boundaries

```mermaid
graph LR
    subgraph TB0["🔴 Trust Boundary 0 — Sin confianza"]
        ANON_U["Visitante anónimo"]
        BOT["Bot / Atacante"]
    end

    subgraph TB1["🟡 Trust Boundary 1 — Confianza baja<br/>(autenticado, sin rol verificado)"]
        AUTH_U["Usuario autenticado<br/>(JWT válido)"]
    end

    subgraph TB2["🟠 Trust Boundary 2 — Confianza media<br/>(rol client/business verificado en DB)"]
        CLIENT_U["Cliente (role=client)"]
        BIZ_U["Negocio (role=business)"]
    end

    subgraph TB3["🔵 Trust Boundary 3 — Confianza alta<br/>(rol admin en app_metadata + DB)"]
        ADMIN_U["Admin (role=admin)"]
    end

    subgraph TB4["🟢 Trust Boundary 4 — Confianza total<br/>(service_role / dashboard directo)"]
        SERVICE["Supabase service_role<br/>(solo developer)"]
    end

    ANON_U -->|"Supera Turnstile + email confirm"| AUTH_U
    AUTH_U -->|"RLS valida rol en profiles"| CLIENT_U
    AUTH_U -->|"RLS valida rol en profiles"| BIZ_U
    SERVICE -->|"Asignación manual en Dashboard"| ADMIN_U
    Note1["⚠️ Admin NUNCA se asigna vía API pública<br/>Solo vía service_role en Dashboard"]
```

### 6.2 STRIDE Threat Matrix

| ID | Amenaza (STRIDE) | Componente | Mitigación implementada | Riesgo residual |
|----|---|---|---|---|
| T-01 | **S** Spoofing — Impersonar otro usuario | Auth / JWT | JWT firmado por Supabase, expiración automática | Bajo |
| T-02 | **S** Spoofing — Registro como admin | `handle_new_user()` | CASE whitelist: solo `client`/`business` asignables | Muy bajo |
| T-03 | **S** Spoofing — Cuenta comprometida | Auth | Password mínimo 8 chars, rate limiting nativo, MFA admin | Medio |
| T-04 | **T** Tampering — Modificar datos de otro usuario | PostgreSQL | RLS: `owner_id = auth.uid()` en todas las tablas | Bajo |
| T-05 | **T** Tampering — Inyección en búsqueda | DirectoryService | `sanitizeQuery()`: trim, maxLength(100), strip `(),'` | Bajo |
| T-06 | **T** Tampering — Upload de archivo malicioso | StorageService | `validateImageFile()`: MIME + ext + 5MB | Bajo |
| T-07 | **R** Repudiation — Negar acción de pedido | `order_logs` | `buyer_id = auth.uid()`, timestamp inmutable, audit_logs | Bajo |
| T-08 | **R** Repudiation — Negar acción de admin | `audit_logs` | Sin política UPDATE/DELETE, actor_id registrado | Bajo |
| T-09 | **I** Information Disclosure — Raw errors al UI | AuthService | `mapAuthError()`: 12 patrones mapeados, fallback genérico | Muy bajo |
| T-10 | **I** Information Disclosure — PII en órdenes admin | RPCs | Role guard en `get_all_orders_admin()`, `get_order_stats()` | Bajo |
| T-11 | **I** Information Disclosure — Secrets en repo | Git / CI | Gitleaks historial completo, `.gitignore` env files | Muy bajo |
| T-12 | **D** Denial of Service — Spam en order_logs | RLS WITH CHECK | Rate limit: 10 inserts/hora por `auth.uid()` | Bajo |
| T-13 | **D** Denial of Service — Abuso de registro | Auth + Turnstile | Turnstile server-side + rate limiting Supabase Auth | Bajo |
| T-14 | **D** Denial of Service — Clickjacking | Headers | `X-Frame-Options: DENY`, `CSP: frame-ancestors 'none'` | Muy bajo |
| T-15 | **E** Elevation of Privilege — Escalar a admin vía API | Trigger + RLS | Whitelist en trigger, admin solo vía Dashboard | Muy bajo |
| T-16 | **E** Elevation of Privilege — RPC bypass | RPCs | `get_my_role()` check al inicio, `SET search_path = public` | Muy bajo |
| T-17 | **E** Elevation of Privilege — Dep. vulnerable | npm packages | Dependabot semanal, `npm audit` en CI | Medio |

### 6.3 Attack Surface Map

```mermaid
graph LR
    subgraph SURFACES["Superficies de Ataque"]
        S1["🔴 Alta exposición<br/>━━━━━━━━━━<br/>/auth/register<br/>/auth/login<br/>/auth/recover"]
        S2["🟠 Media exposición<br/>━━━━━━━━━━<br/>Búsqueda directorio<br/>Upload imágenes<br/>Formulario pedido"]
        S3["🟡 Baja exposición<br/>━━━━━━━━━━<br/>/admin/* (authGuard+roleGuard)<br/>/business/* (authGuard+roleGuard)<br/>RPCs admin"]
        S4["🟢 Mínima exposición<br/>━━━━━━━━━━<br/>Supabase Dashboard<br/>(service_role, solo developer)"]
    end

    S1 -->|"Turnstile + rate limit + mapAuthError"| CTRL1["Controles activos"]
    S2 -->|"sanitizeQuery + validateImageFile + RLS"| CTRL2["Controles activos"]
    S3 -->|"JWT + RLS + RPC guards"| CTRL3["Controles activos"]
    S4 -->|"MFA admin + acceso directo"| CTRL4["Controles activos"]
```

---

## 7. Resiliencia y Recovery

| Escenario | Impacto | Tiempo de detección | Procedimiento de recovery |
|---|---|---|---|
| **Supabase down** | 100% — app inaccesible | Inmediato (Supabase Status Page) | Esperar SLA Supabase (99.9% uptime). No hay failover activo. |
| **Vercel down** | 100% — SPA inaccesible | Inmediato | Vercel CDN redundante globalmente. SPOF bajo. |
| **Corrupción de datos** | Alto | Manual (revisión de soporte) | Backup manual antes de cada migración. Pro plan para PITR. |
| **Secret expuesto** | Crítico | Gitleaks en CI / manual | Rotar con `supabase secrets set`. Rotar anon key en Dashboard. |
| **Cuenta admin comprometida** | Crítico | Manual | Ban user en Auth. Revocar sesiones. Reasignar rol vía service_role. |
| **Dependency vulnerable** | Medio | Dependabot PR / npm audit CI | Merge Dependabot PR. `npm audit fix`. |
| **Deploy roto** | Alto | Vercel build log | Rollback en Vercel Dashboard → Deployments → Redeploy anterior. |

### Recovery Time Objectives (RTO)

| Escenario | RTO objetivo | Método |
|---|---|---|
| Deploy roto | < 5 min | Rollback Vercel 1-click |
| Secret comprometido | < 15 min | CLI: `supabase secrets set` |
| Cuenta admin comprometida | < 30 min | Dashboard: ban + reassign |
| Corrupción de datos | < 4 horas | Restore desde backup manual |
| Supabase outage | Dependiente de Supabase SLA | Espera + status.supabase.com |

---

## 8. Puntos Críticos y Single Points of Failure

```mermaid
graph TB
    subgraph SPOF["⚠️ Single Points of Failure"]
        SPOF1["🔴 Supabase (BaaS completo)<br/>Auth + DB + Storage + Edge<br/>Sin fallback activo<br/>Mitigación: SLA 99.9%, plan Pro para soporte prioritario"]
        SPOF2["🟠 Cuenta Admin única<br/>Si se compromete: acceso total<br/>Mitigación: MFA activo, password fuerte,<br/>solo accesible vía Dashboard"]
        SPOF3["🟡 anon key en cliente<br/>Expuesta en bundle Angular<br/>Mitigación: RLS limita daño,<br/>no da acceso a service_role"]
        SPOF4["🟡 Vercel deploy pipeline<br/>GitHub → Vercel<br/>Si GitHub Actions falla: no deploy<br/>Mitigación: rollback manual disponible"]
    end

    subgraph RESILIENT["✅ Componentes resilientes"]
        R1["CDN Vercel<br/>Global edge network<br/>Alta disponibilidad"]
        R2["RLS en todas las tablas<br/>Sin RLS = sin datos<br/>Defense in depth"]
        R3["CI/CD gates<br/>npm audit bloquea<br/>vulnerabilidades críticas"]
        R4["Security headers<br/>Cero dependencia de código<br/>Aplicados en edge"]
    end
```

### Matriz de riesgo residual

| Componente | Probabilidad | Impacto | Riesgo | Acción |
|---|---|---|---|---|
| Supabase outage | Baja | Crítico | **Medio** | Monitorear status page |
| Cuenta admin comprometida | Muy baja | Crítico | **Medio** | MFA activo ✅ |
| Dependency crítica | Media | Alto | **Medio** | Dependabot + CI audit ✅ |
| Breach de datos | Muy baja | Crítico | **Bajo** | RLS + guards + audit_logs ✅ |
| Deploy roto | Baja | Alto | **Bajo** | Rollback 1-click Vercel ✅ |
| Bot abuse registro | Baja | Medio | **Muy bajo** | Turnstile server-side ✅ |
| XSS / Clickjacking | Muy baja | Alto | **Muy bajo** | CSP + X-Frame-Options ✅ |
| Privilege escalation | Muy baja | Crítico | **Muy bajo** | Trigger whitelist + RPC guards ✅ |

---

## Resumen ejecutivo

El sistema implementa **defense in depth** en 5 capas independientes. Un atacante necesita comprometer simultáneamente múltiples controles para causar daño significativo:

```
Internet → [Headers CSP/HSTS] → [Turnstile anti-bot] → [JWT Auth]
        → [RLS por rol] → [RPC guards] → [Trigger whitelist] → datos
```

**Fortalezas del diseño:**
- Supabase RLS como red de seguridad final: incluso con un bug en el frontend, los datos no son accesibles sin el rol correcto
- Admin nunca asignable vía API pública — requiere acceso directo al Dashboard
- Security headers aplicados en edge, sin dependencia del código Angular
- CI/CD bloquea vulnerabilidades críticas antes de llegar a producción

**Riesgo principal a gestionar:**
- Dependencia total en Supabase como BaaS único — sin failover activo. Aceptable para etapa inicial; evaluar redundancia si el negocio escala a nivel que justifique el costo.
