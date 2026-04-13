import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable, tap } from "rxjs";
import { environment } from 'src/environments/environment';
import { CacheService } from './cache.service';

export interface GroupResponseDTO {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  active: boolean;
  createdAt: string;
}

const TTL = 2 * 60 * 1000; // 2 minutes

@Injectable({ providedIn: 'root' })
export class GroupService {
  private http  = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = environment.apiUrl;

  getAll(): Observable<GroupResponseDTO[]> {
    return this.cache.wrap<GroupResponseDTO[]>(
      'groups:all',
      this.http.get<GroupResponseDTO[]>(`${this.baseUrl}/groups`),
      TTL
    );
  }

  getJoined(): Observable<GroupResponseDTO[]> {
    return this.cache.wrap<GroupResponseDTO[]>(
      'groups:joined',
      this.http.get<GroupResponseDTO[]>(`${this.baseUrl}/groups/joined`),
      TTL
    );
  }

  create(payload: { name: string; description: string; createdBy: number }): Observable<GroupResponseDTO> {
    return this.http.post<GroupResponseDTO>(`${this.baseUrl}/groups`, payload).pipe(
      tap(() => this.cache.invalidatePrefix('groups:'))  // new group — bust all group caches
    );
  }

  join(groupId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/groups/${groupId}/join`, { userId }).pipe(
      tap(() => this.cache.invalidatePrefix('groups:'))  // joined state changed
    );
  }

  leave(groupId: number, userId: number): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/groups/${groupId}/leave`, { userId }).pipe(
      tap(() => this.cache.invalidatePrefix('groups:'))  // joined state changed
    );
  }
}
