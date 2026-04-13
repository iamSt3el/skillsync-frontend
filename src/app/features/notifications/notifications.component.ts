import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { AuthService } from 'src/app/core/auth/auth.service';
import { NotificationResponse, NotificationService } from 'src/app/core/services/notification.service';

@Component({
  selector: 'app-notifications',
  standalone: true,
  imports: [CommonModule, MatButtonModule, MatIconModule, SkeletonComponent],
  templateUrl: './notifications.component.html',
  styleUrls: ['./notifications.component.scss'],
})
export class NotificationsComponent implements OnInit, OnDestroy {
  private authService         = inject(AuthService);
  private notificationService = inject(NotificationService);
  private destroy$            = new Subject<void>();

  get user() { return this.authService.currentUser!; }

  notifications = signal<NotificationResponse[]>([]);
  loading       = signal(true);

  // Pagination
  currentPage    = signal(0);
  readonly pageSize = 10;

  unreadCount = computed(() => this.notifications().filter(n => !n.isRead).length);

  paginated = computed(() => {
    const page = this.currentPage();
    return this.notifications().slice(page * this.pageSize, (page + 1) * this.pageSize);
  });

  totalPages = computed(() => Math.max(1, Math.ceil(this.notifications().length / this.pageSize)));

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

  get rangeStart() { return this.currentPage() * this.pageSize + 1; }
  get rangeEnd()   { return Math.min((this.currentPage() + 1) * this.pageSize, this.notifications().length); }

  ngOnInit() {
    this.notificationService.getForUser(this.user.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          const list: NotificationResponse[] = Array.isArray(data) ? data : (data?.content ?? []);
          this.notifications.set(list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()));
          this.loading.set(false);
        },
        error: () => { this.loading.set(false); },
      });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  goToPage(page: number | '...') {
    if (page === '...' || page < 0 || page >= this.totalPages()) return;
    this.currentPage.set(page);
  }

  markRead(id: number) {
    this.notificationService.markRead(id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => this.notifications.update(list =>
          list.map(n => n.id === id ? { ...n, isRead: true } : n)
        ),
      });
  }

  markAllRead() {
    const unread = this.notifications().filter(n => !n.isRead);
    unread.forEach(n => this.markRead(n.id));
  }

  formatDate(d: string) {
    return new Date(d).toLocaleString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
  }

  typeIcon(type: string): string {
    const map: Record<string, string> = {
      SESSION_BOOKED:    'calendar_today',
      SESSION_ACCEPTED:  'check_circle',
      SESSION_REJECTED:  'cancel',
      SESSION_CANCELLED: 'event_busy',
      REVIEW_RECEIVED:   'star',
    };
    return map[type] ?? 'notifications';
  }
}
