import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from 'src/app/core/auth/auth.service';
import { AdminService, UserStatsDTO, MentorStatsDTO } from 'src/app/core/services/admin.service';
import { UserDTO } from 'src/app/core/auth/auth.model';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';

@Component({
  selector: 'app-admin-overview',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, MatButtonModule, SkeletonComponent],
  templateUrl: './admin-overview.component.html',
  styleUrl: './admin-overview.component.scss',
})
export class AdminOverviewComponent implements OnInit, OnDestroy {
  private authService  = inject(AuthService);
  private adminService = inject(AdminService);
  private destroy$     = new Subject<void>();

  get user() { return this.authService.currentUser!; }

  userInitials = computed(() => {
    const name = this.user?.name || this.user?.username || 'A';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  recentUsers  = signal<UserDTO[]>([]);
  userStats    = signal<UserStatsDTO | null>(null);
  mentorStats  = signal<MentorStatsDTO | null>(null);
  loading      = signal(true);

  // Convenience accessors used by the template distribution bars
  totalUsersCount = computed(() => this.userStats()?.total    ?? 0);
  learners        = computed(() => this.userStats()?.learners ?? 0);
  mentorUsers     = computed(() => this.userStats()?.mentors  ?? 0);
  adminUsers      = computed(() => this.userStats()?.admins   ?? 0);
  activeMentors   = computed(() => this.mentorStats()?.active ?? 0);
  totalMentors    = computed(() => this.mentorStats()?.total  ?? 0);

  stats = computed(() => [
    { label: 'Total Users',       value: this.totalUsersCount(), sub: 'All accounts',    icon: 'group',      color: '#4285f4', bg: '#e8f0fe' },
    { label: 'Learners',          value: this.learners(),        sub: 'Active learners', icon: 'school',     color: '#34a853', bg: '#e6f4ea' },
    { label: 'Mentors',           value: this.mentorUsers(),     sub: 'Mentor accounts', icon: 'psychology', color: '#f9a825', bg: '#fff8e1' },
    { label: 'Pending Approvals', value: this.mentorStats()?.pending ?? 0, sub: 'Awaiting review', icon: 'pending', color: '#dd0031', bg: '#fce4ec' },
  ]);

  today = new Date().toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  ngOnInit() {
    // Stats endpoints return DB-level counts — no pagination needed.
    this.adminService.getUserStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: stats => { this.userStats.set(stats); this.loading.set(false); },
      error: () => this.loading.set(false),
    });

    this.adminService.getMentorStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: stats => this.mentorStats.set(stats),
      error: () => {},
    });

    // Small page just for the "Recent Users" list — we don't need role counts from here.
    this.adminService.getAllUsers(0, 5).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => this.recentUsers.set(data.content),
      error: () => {},
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  roleColor(role: string): string {
    const map: Record<string, string> = {
      LEARNER: '#4285f4',
      MENTOR:  '#34a853',
      ADMIN:   '#dd0031',
    };
    return map[role] ?? '#6b7280';
  }

  roleBg(role: string): string {
    const map: Record<string, string> = {
      LEARNER: '#e8f0fe',
      MENTOR:  '#e6f4ea',
      ADMIN:   '#fce4ec',
    };
    return map[role] ?? '#f3f4f6';
  }

  userAvatar(user: UserDTO): string {
    const name = user.name || user.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  formatDate(date: string): string {
    return new Date(date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }
}
