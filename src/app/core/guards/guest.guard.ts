import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../auth/auth-state.service';
import { TokenService } from '../auth/token.service';

export const guestGuard: CanActivateFn = () => {
  const auth = inject(AuthStateService);
  const token = inject(TokenService);
  const router = inject(Router);

  if (auth.isAuthenticated() || token.get()) {
    return router.createUrlTree(['/app/dashboard']);
  }
  return true;
};
