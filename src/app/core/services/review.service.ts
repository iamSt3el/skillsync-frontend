import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { Observable } from "rxjs";
import { environment } from 'src/environments/environment';

export interface ReviewResponseDTO {
  id: number;
  mentorId: number;
  userId: number;
  rating: number;
  comment: string;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class ReviewService {
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  getForMentor(mentorId: number): Observable<ReviewResponseDTO[]> {
    return this.http.get<ReviewResponseDTO[]>(`${this.baseUrl}/reviews/mentor/${mentorId}`);
  }

  submit(payload: { mentorId: number; userId: number; rating: number; comment: string }): Observable<ReviewResponseDTO> {
    return this.http.post<ReviewResponseDTO>(`${this.baseUrl}/reviews`, payload);
  }
}
