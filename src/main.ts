import { bootstrapApplication } from '@angular/platform-browser';
import * as Sentry from '@sentry/angular';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { environment } from './environments/environment';

// Sin DSN (desarrollo, o si aún no se configuró en producción) Sentry
// simplemente no se inicializa — no bloquea nada, solo no reporta.
if (environment.sentryDsn) {
  Sentry.init({
    dsn: environment.sentryDsn,
    environment: environment.production ? 'production' : 'development',
    // Sin performance tracing — solo errores. Mantiene el consumo bajo
    // el free tier de Sentry (5,000 errores/mes) sin gastarlo en trazas.
    tracesSampleRate: 0,
  });
}

bootstrapApplication(AppComponent, appConfig)
  .catch((err) => console.error(err));
