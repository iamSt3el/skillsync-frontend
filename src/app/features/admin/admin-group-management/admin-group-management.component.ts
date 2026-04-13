import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminService } from 'src/app/core/services/admin.service';

export interface GroupAdminDTO {
  id: number;
  name: string;
  description: string;
  createdBy: number;
  memberCount: number | null | undefined;
  active: boolean;
  createdAt: string;
}

@Component({
  selector: 'app-admin-group-management',
  standalone: true,
  imports: [
    CommonModule, FormsModule,
    MatCardModule, MatIconModule, SkeletonComponent,
    MatButtonModule, MatFormFieldModule, MatInputModule, MatDialogModule,
  ],
  templateUrl: './admin-group-management.component.html',
  styleUrl: './admin-group-management.component.scss',
})
export class AdminGroupManagementComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private destroy$     = new Subject<void>();

  groups  = signal<GroupAdminDTO[]>([]);
  loading = signal(true);
  error   = signal(false);

  searchQuery = signal('');
  actionError = signal('');

  // Pagination
  currentPage    = signal(0);
  totalPages     = signal(0);
  totalElements  = signal(0);
  readonly pageSize = 15;

  filteredGroups = computed(() => {
    const q = this.searchQuery().toLowerCase().trim();
    return this.groups().filter(g =>
      !q ||
      g.name.toLowerCase().includes(q) ||
      (g.description || '').toLowerCase().includes(q)
    );
  });

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
    this.adminService.getAllGroups(page, this.pageSize)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: (data: any) => {
          // Support both paginated and plain array responses
          if (data && typeof data === 'object' && 'content' in data) {
            this.groups.set(data.content);
            this.currentPage.set(data.number ?? page);
            this.totalPages.set(data.totalPages ?? 1);
            this.totalElements.set(data.totalElements ?? data.content.length);
          } else {
            const list: GroupAdminDTO[] = Array.isArray(data) ? data : [];
            this.groups.set(list);
            this.currentPage.set(0);
            this.totalPages.set(1);
            this.totalElements.set(list.length);
          }
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

  deactivate(group: GroupAdminDTO) {
    if (group.active === false) return;
    this.actionError.set('');
    this.adminService.deactivateGroup(group.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.groups.update(gs => gs.map(g => g.id === group.id ? { ...g, active: false } : g));
        },
        error: () => this.actionError.set('Failed to deactivate group.'),
      });
  }

  deleteGroup(group: GroupAdminDTO) {
    if (!confirm(`Delete group "${group.name}"? This cannot be undone.`)) return;
    this.actionError.set('');
    this.adminService.deleteGroup(group.id)
      .pipe(takeUntil(this.destroy$))
      .subscribe({
        next: () => {
          this.groups.update(gs => gs.filter(g => g.id !== group.id));
        },
        error: () => this.actionError.set('Failed to delete group.'),
      });
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
