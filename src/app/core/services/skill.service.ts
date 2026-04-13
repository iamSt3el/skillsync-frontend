import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from 'src/environments/environment';
import { CacheService } from './cache.service';

export interface SkillResponse {
  id: number;
  name: string;
  category: string;
}

const CACHE_KEY = 'skills:all';
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes — skills rarely change

@Injectable({ providedIn: 'root' })
export class SkillService {
  private http  = inject(HttpClient);
  private cache = inject(CacheService);
  private baseUrl = environment.apiUrl;

  getAll(): Observable<SkillResponse[]> {
    return this.cache.wrap<SkillResponse[]>(
      CACHE_KEY,
      this.http.get<SkillResponse[]>(`${this.baseUrl}/skills`),
      CACHE_TTL
    );
  }
}
