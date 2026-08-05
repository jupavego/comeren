import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import * as Sentry from '@sentry/angular';
import { catchError, throwError } from 'rxjs';
import { SessionService } from '../services/session.service';

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const router  = inject(Router);
  const session = inject(SessionService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      switch (error.status) {
        case 401:
          // Token expirado o inválido — esperado, no es un bug
          router.navigate(['/auth/login']);
          break;

        case 403:
          // Sin permiso para este recurso — esperado, no es un bug
          router.navigate(['/']);
          break;

        case 0:
          // Sin conexión
          console.error('Sin conexión al servidor');
          break;

        default:
          // 5xx, 4xx inesperados — esto sí es un bug real, se reporta
          console.error(`Error ${error.status}:`, error.message);
          Sentry.captureException(error, {
            extra: { url: req.url, method: req.method, status: error.status },
          });
      }

      return throwError(() => error);
    })
  );
};