import { Injectable, inject, OnDestroy } from '@angular/core';
import { webSocket, WebSocketSubject } from 'rxjs/webSocket';
import { Subject, EMPTY } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { AuthService } from '../auth/auth.service';
import { NotificationResponse } from './notification.service';

@Injectable({ providedIn: 'root' })
export class NotificationWebSocketService implements OnDestroy {
  private authService = inject(AuthService);

  private socket$: WebSocketSubject<NotificationResponse> | null = null;
  private messages$ = new Subject<NotificationResponse>();

  get notifications$() {
    return this.messages$.asObservable();
  }

  connect() {
    const token = this.authService.token;
    if (!token || this.socket$) return;

    this.socket$ = webSocket<NotificationResponse>({
      url: `wss://skillsync.mooo.com/notifications/ws?token=${token}`,
      openObserver: {
        next: () => console.log('[WS] Notification socket connected'),
      },
      closeObserver: {
        next: () => {
          console.log('[WS] Notification socket disconnected');
          this.socket$ = null;
        },
      },
    });

    this.socket$.pipe(
      tap(msg => this.messages$.next(msg)),
      catchError(() => EMPTY),
    ).subscribe();
  }

  disconnect() {
    this.socket$?.complete();
    this.socket$ = null;
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
