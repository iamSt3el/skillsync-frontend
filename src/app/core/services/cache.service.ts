import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { tap } from 'rxjs/operators';

interface CacheEntry<T> {
  data: T;
  expires: number;
}

@Injectable({ providedIn: 'root' })
export class CacheService {
  private store = new Map<string, CacheEntry<any>>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expires) {
      this.store.delete(key);
      return null;
    }
    return entry.data as T;
  }

  set<T>(key: string, data: T, ttlMs = 5 * 60 * 1000): void {
    this.store.set(key, { data, expires: Date.now() + ttlMs });
  }

  /** Wraps an HTTP observable: returns cached data or fetches and caches the result. */
  wrap<T>(key: string, source$: Observable<T>, ttlMs = 5 * 60 * 1000): Observable<T> {
    const cached = this.get<T>(key);
    if (cached !== null) return of(cached);
    return source$.pipe(tap(data => this.set(key, data, ttlMs)));
  }

  invalidate(key: string): void {
    this.store.delete(key);
  }

  /** Removes all cache entries whose key starts with the given prefix. */
  invalidatePrefix(prefix: string): void {
    for (const key of Array.from(this.store.keys())) {
      if (key.startsWith(prefix)) this.store.delete(key);
    }
  }

  clearAll(): void {
    this.store.clear();
  }
}
