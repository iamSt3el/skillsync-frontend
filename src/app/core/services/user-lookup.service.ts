import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { map, tap } from 'rxjs/operators';

export interface UserBasic {
  id: number;
  username: string;
  name: string;
  profilePictureUrl?: string;
}

@Injectable({ providedIn: 'root' })
export class UserLookupService {
  private http = inject(HttpClient);
  private baseUrl = 'https://skillsync.mooo.com/api';

  // Simple in-memory cache so we don't re-fetch the same users
  private cache = new Map<number, UserBasic>();

  /** Batch-fetch user info for a list of IDs. Uses cache for known IDs. */
  batchFetch(ids: number[]): Observable<Map<number, UserBasic>> {
    const unknown = ids.filter(id => !this.cache.has(id));

    if (unknown.length === 0) {
      const result = new Map<number, UserBasic>();
      ids.forEach(id => { const u = this.cache.get(id); if (u) result.set(id, u); });
      return of(result);
    }

    return this.http.post<UserBasic[]>(`${this.baseUrl}/users/batch`, unknown).pipe(
      tap(users => users.forEach(u => this.cache.set(u.id, u))),
      map(users => {
        const result = new Map<number, UserBasic>();
        // Include both newly fetched and cached
        ids.forEach(id => {
          const u = this.cache.get(id);
          if (u) result.set(id, u);
        });
        return result;
      })
    );
  }

  displayName(user: UserBasic | undefined): string {
    if (!user) return 'Unknown';
    return user.name?.trim() || user.username;
  }
}
