import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthStateService } from '../auth/auth-state.service';
import { TokenService } from '../auth/token.service';

export const authGuard: CanActivateFn = (_route, state) => {
  const auth = inject(AuthStateService);
  const token = inject(TokenService);
  const router = inject(Router);

  // The token may exist but the user signal may not be hydrated yet during
  // the very first navigation — the bootstrap initializer fills it shortly
  // after. Letting the route activate is safe because the API will reject
  // requests with bad tokens and the error interceptor will redirect.
  if (auth.isAuthenticated() || token.get()) {
    return true;
  }

  return router.createUrlTree(['/auth/login'], {
    queryParams: { redirect: state.url },
  });
};
