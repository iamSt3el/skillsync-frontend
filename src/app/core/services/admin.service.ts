import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { UserDTO } from '../auth/auth.model';
import { MentorResponse, Page } from './mentor.service';
import { catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { SkillResponse } from './skill.service';

export interface UserStatsDTO {
  total: number;
  learners: number;
  mentors: number;
  admins: number;
}

export interface MentorStatsDTO {
  total: number;
  active: number;
  pending: number;
  rejected: number;
  avgRating: number;
  avgHourlyRate: number;
  totalReviews: number;
}


@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getAllUsers(page = 0, size = 20): Observable<Page<UserDTO>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<UserDTO>>(`${this.base}/admin/users`, { params });
  }

  getUserStats(): Observable<UserStatsDTO> {
    return this.http.get<UserStatsDTO>(`${this.base}/admin/users/stats`);
  }

  getAllMentors(page = 0, size = 15): Observable<Page<MentorResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<MentorResponse>>(`${this.base}/admin/mentors`, { params }).pipe(
      catchError(() => this.http.get<Page<MentorResponse>>(`${this.base}/mentors`, { params }))
    );
  }

  getMentorStats(): Observable<MentorStatsDTO> {
    return this.http.get<MentorStatsDTO>(`${this.base}/admin/mentors/stats`);
  }

  approveMentor(mentorId: number): Observable<unknown> {
    return this.http.put(`${this.base}/admin/mentors/${mentorId}/approve`, {});
  }

  rejectMentor(mentorId: number): Observable<unknown> {
    return this.http.put(`${this.base}/admin/mentors/${mentorId}/reject`, {});
  }

  addSkill(skill: {name: string, category: string}): Observable<SkillResponse>{
    return this.http.post<SkillResponse>(`${this.base}/admin/skills`, skill);
  }

  deleteSkill(skillId: number): Observable<unknown>{
    return this.http.delete(`${this.base}/admin/skills/${skillId}`);
  }

  getAllGroups(page = 0, size = 15): Observable<any> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<any>(`${this.base}/admin/groups`, { params });
  }

  deactivateGroup(groupId: number): Observable<unknown> {
    return this.http.put(`${this.base}/admin/groups/${groupId}/deactivate`, {});
  }

  deleteGroup(groupId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/admin/groups/${groupId}`);
  }
}
