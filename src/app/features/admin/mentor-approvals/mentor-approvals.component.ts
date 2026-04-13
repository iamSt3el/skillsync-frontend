import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { AdminService } from 'src/app/core/services/admin.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { MentorResponse } from 'src/app/core/services/mentor.service';

@Component({
  selector: 'app-mentor-approvals',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatButtonModule, SkeletonComponent],
  templateUrl: './mentor-approvals.component.html',
  styleUrl: './mentor-approvals.component.scss',
})
export class MentorApprovalsComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private destroy$     = new Subject<void>();

  mentors  = signal<MentorResponse[]>([]);
  loading  = signal(true);
  error    = signal(false);
  actionInProgress = signal<number | null>(null);
  toastMsg = signal<string | null>(null);

  // Pagination
  currentPage   = signal(0);
  totalPages    = signal(0);
  totalElements = signal(0);
  readonly pageSize = 15;

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

  pending  = computed(() => this.mentors().filter(m => m.status === 'PENDING'));
  active   = computed(() => this.mentors().filter(m => m.status === 'ACTIVE'));
  rejected = computed(() => this.mentors().filter(m => m.status === 'REJECTED'));

  get rangeStart() { return this.currentPage() * this.pageSize + 1; }
  get rangeEnd()   { return Math.min((this.currentPage() + 1) * this.pageSize, this.totalElements()); }

  ngOnInit() {
    this.loadPage(0);
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  loadPage(page: number) {
    this.loading.set(true);
    this.error.set(false);
    this.adminService.getAllMentors(page, this.pageSize).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => {
        this.mentors.set(data.content);
        this.currentPage.set(data.number);
        this.totalPages.set(data.totalPages);
        this.totalElements.set(data.totalElements);
        this.loading.set(false);
      },
      error: () => { this.error.set(true); this.loading.set(false); },
    });
  }

  goToPage(page: number | '...') {
    if (page === '...') return;
    if (page < 0 || page >= this.totalPages()) return;
    this.loadPage(page);
  }

  approve(mentor: MentorResponse) {
    this.actionInProgress.set(mentor.id);
    this.adminService.approveMentor(mentor.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.mentors.update(list =>
          list.map(m => m.id === mentor.id ? { ...m, status: 'ACTIVE' } : m)
        );
        this.showToast('Mentor approved successfully.');
        this.actionInProgress.set(null);
      },
      error: () => {
        this.showToast('Failed to approve mentor.');
        this.actionInProgress.set(null);
      },
    });
  }

  reject(mentor: MentorResponse) {
    this.actionInProgress.set(mentor.id);
    this.adminService.rejectMentor(mentor.id).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.mentors.update(list =>
          list.map(m => m.id === mentor.id ? { ...m, status: 'REJECTED' } : m)
        );
        this.showToast('Mentor application rejected.');
        this.actionInProgress.set(null);
      },
      error: () => {
        this.showToast('Failed to reject mentor.');
        this.actionInProgress.set(null);
      },
    });
  }

  private showToast(msg: string) {
    this.toastMsg.set(msg);
    setTimeout(() => this.toastMsg.set(null), 3000);
  }

  statusColor(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: '#065f46', PENDING: '#92400e', REJECTED: '#991b1b',
    };
    return map[status] ?? '#374151';
  }

  statusBg(status: string): string {
    const map: Record<string, string> = {
      ACTIVE: '#d1fae5', PENDING: '#fef3c7', REJECTED: '#fee2e2',
    };
    return map[status] ?? '#f3f4f6';
  }

  avatarColor(id: number): string {
    const colors = ['#e53935', '#43a047', '#1e88e5', '#8e24aa', '#f9a825', '#0097a7'];
    return colors[id % colors.length];
  }

  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
