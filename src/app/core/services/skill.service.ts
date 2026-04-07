import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";

export interface SkillResponse {
  id: number;
  name: string;
  category: string;
}

@Injectable({ providedIn: 'root' })
export class SkillService {
  private http = inject(HttpClient);
  private baseUrl = 'https://skillsync.mooo.com/api';

  getAll(): Observable<SkillResponse[]> {
    return this.http.get<SkillResponse[]>(`${this.baseUrl}/skills`);
  }
}
