import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
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
export class MySessionsComponent implements OnInit, OnDestroy {
  private authService    = inject(AuthService);
  private sessionService = inject(SessionService);
  private destroy$       = new Subject<void>();

  get user()      { return this.authService.currentUser!; }
  get isLearner() { return this.user.role?.toUpperCase().includes('LEARNER'); }
  get isMentor()  { return this.user.role?.toUpperCase().includes('MENTOR'); }

  sessions  = signal<SessionResponse[]>([]);
  loading   = signal(true);
  activeTab = signal<FilterTab>('all');

  // Pagination
  currentPage    = signal(0);
  readonly pageSize = 8;

  filtered = computed(() => {
    const tab = this.activeTab();
    const all = this.sessions();
    const base = this.isMentor
      ? all.filter(s => s.learnerId !== this.user.id)
      : all;
    if (tab === 'pending')   return base.filter(s => s.status === 'PENDING_PAYMENT');
    if (tab === 'upcoming')  return base.filter(s => s.status === 'REQUESTED' || s.status === 'ACCEPTED');
    if (tab === 'completed') return base.filter(s => s.status === 'COMPLETED');
    if (tab === 'cancelled') return base.filter(s => s.status === 'CANCELLED' || s.status === 'REJECTED');
    return base;
  });

  paginated = computed(() => {
    const page = this.currentPage();
    return this.filtered().slice(page * this.pageSize, (page + 1) * this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.filtered().length / this.pageSize)));

  pageNumbers = computed(() => {
    const total = this.totalPages();
    const cur   = this.currentPage();
    if (total <= 7) return Array.from({ length: total }, (_, i) => i);
    const pages: (number | '...')[] = [];
    if (cur <= 3) {
      pages.push(0, 1, 2, 3, 4, '...', total - 1);
    } else if (cur >= total - 4) {
      pages.push(0, '...', total - 5, total - 4, total - 3, total - 2, total - 1);
    } else {
      pages.push(0, '...', cur - 1, cur, cur + 1, '...', total - 1);
    }
    return pages;
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
    this.sessionService.getUserSessions(this.user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: data => { this.sessions.set(data); this.loading.set(false); },
        error: ()   => { this.loading.set(false); },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  setTab(tab: FilterTab) {
    this.activeTab.set(tab);
    this.currentPage.set(0);
  }

  goToPage(page: number | '...') {
    if (page === '...' || page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
  }

  get rangeStart() { return this.currentPage() * this.pageSize + 1; }
  get rangeEnd()   { return Math.min((this.currentPage() + 1) * this.pageSize, this.filtered().length); }

  cancel(sessionId: number) {
    this.sessionService.cancel(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
      });
  }

  accept(sessionId: number) {
    this.sessionService.accept(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
      });
  }

  reject(sessionId: number) {
    this.sessionService.reject(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: updated => this.sessions.update(list => list.map(s => s.id === sessionId ? updated : s)),
      });
  }

  complete(sessionId: number) {
    this.sessionService.complete(sessionId)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
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
