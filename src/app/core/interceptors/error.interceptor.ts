import { HttpErrorResponse, HttpInterceptorFn } from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import { catchError, throwError } from 'rxjs';
import { AuthStateService } from '../auth/auth-state.service';
import { TokenService } from '../auth/token.service';

export const errorInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authState = inject(AuthStateService);
  const token = inject(TokenService);

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401) {
        token.clear();
        authState.clear();
        // Avoid redirect loops on the auth pages themselves
        if (!router.url.startsWith('/auth')) {
          void router.navigate(['/auth/login']);
        }
      }
      return throwError(() => error);
    }),
  );
};
