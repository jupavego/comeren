import {
  HttpErrorResponse,
  HttpHandlerFn,
  HttpInterceptorFn,
  HttpRequest,
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
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
          // Token expirado o inválido
          router.navigate(['/auth/login']);
          break;

        case 403:
          // Sin permiso para este recurso
          router.navigate(['/']);
          break;

        case 0:
          // Sin conexión
          console.error('Sin conexión al servidor');
          break;

        default:
          console.error(`Error ${error.status}:`, error.message);
      }

      return throwError(() => error);
    })
  );
};