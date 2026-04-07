import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { AuthService } from 'src/app/core/auth/auth.service';
import { SessionResponse, SessionService, SessionStatus } from 'src/app/core/services/session.service';

type FilterTab = 'all' | 'upcoming' | 'pending' | 'completed' | 'cancelled';

@Component({
  selector: 'app-my-sessions',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, SkeletonComponent],
  templateUrl: './my-sessions.component.html',
  styleUrls: ['./my-sessions.component.scss'],
})
export class MySessionsComponent implements OnInit {
  private authService    = inject(AuthService);
  private sessionService = inject(SessionService);

  get user() { return this.authService.currentUser!; }
  get isLearner() { return this.user.role?.toUpperCase().includes('LEARNER'); }
  get isMentor()  { return this.user.role?.toUpperCase().includes('MENTOR'); }

  sessions = signal<SessionResponse[]>([]);
  loading  = signal(true);
  activeTab = signal<FilterTab>('all');

  filtered = computed(() => {
    const tab = this.activeTab();
    const all = this.sessions();
    const base = this.isMentor
      ? all.filter(s => s.learnerId !== this.user.id)
      : all;
    // PENDING_PAYMENT = awaiting payment confirmation
    // REQUESTED       = payment done, awaiting mentor acceptance
    // ACCEPTED        = mentor confirmed, session is booked
    if (tab === 'pending')   return base.filter(s => s.status === 'PENDING_PAYMENT');
    if (tab === 'upcoming')  return base.filter(s => s.status === 'REQUESTED' || s.status === 'ACCEPTED');
    if (tab === 'completed') return base.filter(s => s.status === 'COMPLETED');
    if (tab === 'cancelled') return base.filter(s => s.status === 'CANCELLED' || s.status === 'REJECTED');
    return base;
  });

  pendingCount = computed(() =>
    this.sessions().filter(s => s.status === 'PENDING_PAYMENT').length
  );

  tabs: { key: FilterTab; label: string }[] = [
    { key: 'all',       label: 'All'             },
    { key: 'upcoming',  label: 'Upcoming'         },
    { key: 'pending',   label: 'Pending Payment'  },
    { key: 'completed', label: 'Completed'        },
    { key: 'cancelled', label: 'Cancelled'        },
  ];

  ngOnInit() {
    this.sessionService.getUserSessions(this.user.id).subscribe({
      next: data => { this.sessions.set(data); this.loading.set(false); },
      error: ()   => { this.loading.set(false); },
    });
  }

  cancel(sessionId: number) {
    this.sessionService.cancel(sessionId).subscribe({
      next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
    });
  }

  accept(sessionId: number) {
    this.sessionService.accept(sessionId).subscribe({
      next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
    });
  }

  reject(sessionId: number) {
    this.sessionService.reject(sessionId).subscribe({
      next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
    });
  }

  complete(sessionId: number) {
    this.sessionService.complete(sessionId).subscribe({
      next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
    });
  }

  canCancel(s: SessionResponse)   { return this.isLearner && (s.status === 'PENDING_PAYMENT' || s.status === 'REQUESTED' || s.status === 'ACCEPTED'); }
  canAccept(s: SessionResponse)   { return this.isMentor  && s.status === 'REQUESTED'; }
  canReject(s: SessionResponse)   { return this.isMentor  && s.status === 'REQUESTED'; }
  canComplete(s: SessionResponse) { return this.isMentor  && s.status === 'ACCEPTED'; }

  formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  statusClass(status: SessionStatus) {
    const map: Record<SessionStatus, string> = {
      PENDING_PAYMENT: 'badge--pending',
      REQUESTED:       'badge--requested',
      ACCEPTED:        'badge--accepted',
      COMPLETED:       'badge--completed',
      REJECTED:        'badge--rejected',
      CANCELLED:       'badge--cancelled',
    };
    return map[status] ?? '';
  }
}
