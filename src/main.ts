import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

if (environment.production && environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: 'production',
    // 10 % de trazas de navegación — suficiente para un proyecto pequeño
    tracesSampleRate: 0.1,
    // No capturar errores de extensiones de navegador ni scripts externos
    denyUrls: [/extensions\//i, /^chrome:\/\//i],
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
