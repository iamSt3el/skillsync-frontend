import {
  HttpErrorResponse,
  HttpInterceptorFn,
  HttpRequest,
  HttpHandlerFn
} from '@angular/common/http';
import { inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  BehaviorSubject,
  catchError,
  filter,
  switchMap,
  take,
  throwError
} from 'rxjs';
import { AuthService } from '../auth/auth.service';
import { ToastService } from '../services/toast.service';

// Module-level flag so concurrent 401s share one refresh attempt.
let isRefreshing = false;
const refreshToken$ = new BehaviorSubject<string | null>(null);

const REFRESH_URL = '/auth/refresh';

function addToken(req: HttpRequest<unknown>, token: string): HttpRequest<unknown> {
  return req.clone({ setHeaders: { Authorization: `Bearer ${token}` } });
}

export const errorInterceptor: HttpInterceptorFn = (
  req: HttpRequest<unknown>,
  next: HttpHandlerFn
) => {
  const router = inject(Router);
  const auth   = inject(AuthService);
  const toast  = inject(ToastService);

  return next(req).pipe(
    catchError((err: HttpErrorResponse) => {
      // Don't attempt refresh for the refresh request itself — that would loop.
      if (err.status === 401 && !req.url.includes(REFRESH_URL)) {
        return handle401(req, next, auth, router);
      }

      switch (err.status) {
        case 403:
          router.navigate(['/forbidden']);
          break;
        case 500:
        case 502:
        case 503:
          router.navigate(['/server-error']);
          break;
        case 0:
          toast.error('Network error. Please check your internet connection.');
          break;
      }

      return throwError(() => err);
    })
  );
};

function handle401(
  req: HttpRequest<unknown>,
  next: HttpHandlerFn,
  auth: AuthService,
  router: Router
) {
  if (!isRefreshing) {
    isRefreshing = true;
    refreshToken$.next(null);   // signal "refresh in progress" to waiting requests

    return auth.refresh().pipe(
      switchMap((newToken: string) => {
        isRefreshing = false;
        refreshToken$.next(newToken);
        return next(addToken(req, newToken));
      }),
      catchError(refreshErr => {
        isRefreshing = false;
        auth.logout();
        router.navigate(['/login']);
        return throwError(() => refreshErr);
      })
    );
  }

  // Another request is already refreshing — wait for the new token then retry.
  return refreshToken$.pipe(
    filter((token): token is string => token !== null),
    take(1),
    switchMap(token => next(addToken(req, token)))
  );
}
