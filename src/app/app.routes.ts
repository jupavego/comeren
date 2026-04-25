import { Routes } from '@angular/router';
import { authGuard, publicOnlyGuard, roleGuard } from './core';
import { setupGuard } from './core/guards/setup.guard';

export const routes: Routes = [

  // ── Directorio público ───────────────────────────────────────────────────
  {
    path: '',
    loadComponent: () =>
      import('./features/directory/pages/directory-home/directory-home.component')
        .then(m => m.DirectoryHomeComponent),
  },
  {
    path: 'negocio/:id',
    loadComponent: () =>
      import('./features/directory/pages/business-detail/business-detail.component')
        .then(m => m.BusinessDetailComponent),
  },
  {
    path: 'contacto',
    loadComponent: () =>
      import('./features/directory/pages/contact/contact.component')
        .then(m => m.ContactComponent),
  },

  // ── Perfil personal ──────────────────────────────────────────────────────
  {
    path: 'profile',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/client/pages/profile-edit/profile-edit.component')
        .then(m => m.ProfileEditComponent),
  },

  // ── Auth — layout propio, sin header global ──────────────────────────────
  {
    path: 'auth',
    loadComponent: () =>
      import('./layouts/auth-layout/auth-layout.component')
        .then(m => m.AuthLayoutComponent),
    children: [
      // Sin guard — Supabase establece sesión temporal con el token
      {
        path: 'reset-password',
        loadComponent: () =>
          import('./features/auth/pages/reset-password/reset-password.component')
            .then(m => m.ResetPasswordComponent),
      },
      // Callback de confirmación de email — también sin publicOnlyGuard
      {
        path: 'confirm',
        loadComponent: () =>
          import('../app/shared/pages/confirm/auth-confirm.component')
            .then(m => m.AuthConfirmComponent),
      },
      // Rutas solo para no logueados
      {
        path: '',
        canActivate: [publicOnlyGuard],
        children: [
          {
            path: 'login',
            loadComponent: () =>
              import('./features/auth/pages/login/login.component')
                .then(m => m.LoginComponent),
          },
          {
            path: 'register',
            loadComponent: () =>
              import('./features/auth/pages/register/register.component')
                .then(m => m.RegisterComponent),
          },
          {
            path: 'recover',
            loadComponent: () =>
              import('./features/auth/pages/recover/recover.component')
                .then(m => m.RecoverComponent),
          },
        ],
      },
    ],
  },

  // ── Panel negocio ────────────────────────────────────────────────────────
  {
    path: 'business',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['business'] },
    children: [
      {
        path: 'setup',
        // setupGuard redirige al dashboard si el negocio ya existe
        canActivate: [setupGuard],
        loadComponent: () =>
          import('./features/business/pages/account-setup/account-setup.component')
            .then(m => m.AccountSetupComponent),
      },
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/business/pages/business-dashboard/business-dashboard.component')
            .then(m => m.BusinessDashboardComponent),
      },
      {
        path: 'account',
        loadComponent: () =>
          import('./features/business/pages/account-edit/account-edit.component')
            .then(m => m.AccountEditComponent),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./features/business/pages/catalog/catalog.component')
            .then(m => m.CatalogComponent),
      },
      {
        path: 'ratings',
        loadComponent: () =>
          import('./features/business/pages/business-ratings/business-ratings.component')
            .then(m => m.BusinessRatingsComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/business/pages/business-orders/business-orders.component')
            .then(m => m.BusinessOrdersComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── Panel admin ──────────────────────────────────────────────────────────
  {
    path: 'admin',
    canActivate: [authGuard, roleGuard],
    data: { roles: ['admin'] },
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./features/admin/pages/admin-dashboard/admin-dashboard.component')
            .then(m => m.AdminDashboardComponent),
      },
      {
        path: 'users',
        loadComponent: () =>
          import('./features/admin/pages/users-list/users-list.component')
            .then(m => m.UsersListComponent),
      },
      {
        path: 'accounts',
        loadComponent: () =>
          import('./features/admin/pages/accounts-list/accounts-list.component')
            .then(m => m.AccountsListComponent),
      },
      {
        path: 'catalog',
        loadComponent: () =>
          import('./features/admin/pages/catalog-list/catalog-list.component')
            .then(m => m.CatalogListComponent),
      },
      {
        path: 'reports',
        loadComponent: () =>
          import('./features/admin/pages/reports/reports.component')
            .then(m => m.ReportsComponent),
      },
      {
        path: 'ratings',
        loadComponent: () =>
          import('./features/admin/pages/ratings-list/ratings-list.component')
            .then(m => m.RatingsListComponent),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./features/admin/pages/orders-list/orders-list.component')
            .then(m => m.OrdersListComponent),
      },
      {
        path: 'home',
        loadComponent: () =>
          import('./features/admin/pages/home-config/home-config.component')
            .then(m => m.HomeConfigComponent),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },

  // ── 404 ──────────────────────────────────────────────────────────────────
  {
    path: '**',
    loadComponent: () =>
      import('./shared/pages/not-found/not-found.component')
        .then(m => m.NotFoundComponent),
  },
];