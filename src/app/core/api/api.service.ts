import { HttpClient } from "@angular/common/http";
import { inject, Injectable } from "@angular/core";
import { environment } from 'src/environments/environment';

@Injectable({providedIn: 'root'})
export class ApiService{
  private http = inject(HttpClient);
  private baseUrl = environment.apiUrl;

  get<T>(path: string){
    return this.http.get<T>(`${this.baseUrl}${path}`);
  }

  post<T>(path: string, body: unknown){
    return this.http.post<T>(`${this.baseUrl}${path}`, body);
  }

  put<T>(path: string, body: unknown){
    return this.http.put<T>(`${this.baseUrl}${path}`, body);
  }

  delete<T>(path: string){
    return this.http.delete<T>(`${this.baseUrl}${path}`);
  }
}

