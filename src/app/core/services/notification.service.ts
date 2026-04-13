import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from 'src/environments/environment';
import { CacheService } from './cache.service';

export interface NotificationResponse {
  id: number;
  userId: number;
  type: string;
  message: string;
  isRead: boolean;
  createdAt: string;
}

const TTL = 60 * 1000; // 1 minute — notifications are user-specific and time-sensitive

@Injectable({ providedIn: 'root' })
export class NotificationService {
  private http  = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = environment.apiUrl;

  getForUser(userId: number): Observable<NotificationResponse[]> {
    const key = `notifications:${userId}`;
    return this.cache.wrap<NotificationResponse[]>(
      key,
      this.http.get<NotificationResponse[]>(`${this.baseUrl}/notifications/user/${userId}`),
      TTL
    );
  }

  markRead(notificationId: number): Observable<string> {
    return this.http.put<string>(`${this.baseUrl}/notifications/${notificationId}/read`, {}).pipe(
      tap(() => this.cache.invalidatePrefix('notifications:'))  // stale — bust the cache
    );
  }
}
