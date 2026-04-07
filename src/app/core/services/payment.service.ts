import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class PaymentService {
  private http = inject(HttpClient);
  private baseUrl = 'https://skillsync.mooo.com/api/payments'; // Updated to your API IP

  initiatePayment(sessionId: number): Observable<any> {
    return this.http.post(`${this.baseUrl}/initiate`, { sessionId });
  }

  verifyPayment(data: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/verify`, data);
  }

  getMyPayments(): Observable<any[]> {
    return this.http.get<any[]>(`${this.baseUrl}/my`);
  }
}
