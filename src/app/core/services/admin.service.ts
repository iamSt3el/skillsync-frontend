import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { environment } from 'src/environments/environment';
import { UserDTO } from '../auth/auth.model';
import { MentorResponse, Page } from './mentor.service';
import { catchError } from 'rxjs/operators';
import { Observable, of } from 'rxjs';
import { SkillResponse } from './skill.service';


@Injectable({ providedIn: 'root' })
export class AdminService {
  private http = inject(HttpClient);
  private base = environment.apiUrl;

  getAllUsers(page = 0, size = 20): Observable<Page<UserDTO>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<UserDTO>>(`${this.base}/admin/users`, { params });
  }

  getAllMentors(page = 0, size = 15): Observable<Page<MentorResponse>> {
    const params = new HttpParams().set('page', page).set('size', size);
    return this.http.get<Page<MentorResponse>>(`${this.base}/admin/mentors`, { params }).pipe(
      catchError(() => this.http.get<Page<MentorResponse>>(`${this.base}/mentors`, { params }))
    );
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

  getAllGroups(): Observable<any[]> {
    return this.http.get<any[]>(`${this.base}/admin/groups`);
  }

  deactivateGroup(groupId: number): Observable<unknown> {
    return this.http.put(`${this.base}/admin/groups/${groupId}/deactivate`, {});
  }

  deleteGroup(groupId: number): Observable<unknown> {
    return this.http.delete(`${this.base}/admin/groups/${groupId}`);
  }
}
