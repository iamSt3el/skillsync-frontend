import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { AdminService, UserStatsDTO, MentorStatsDTO } from 'src/app/core/services/admin.service';
import { UserDTO } from 'src/app/core/auth/auth.model';
import { MentorResponse } from 'src/app/core/services/mentor.service';

@Component({
  selector: 'app-platform-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, SkeletonComponent],
  templateUrl: './platform-analytics.component.html',
  styleUrl: './platform-analytics.component.scss',
})
export class PlatformAnalyticsComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private destroy$     = new Subject<void>();

  // Full user/mentor records — only needed for registration trend and top skills charts.
  users      = signal<UserDTO[]>([]);
  mentors    = signal<MentorResponse[]>([]);
  loading    = signal(true);

  // Accurate counts from dedicated stats endpoints
  userStats   = signal<UserStatsDTO | null>(null);
  mentorStats = signal<MentorStatsDTO | null>(null);

  // User metrics (from stats endpoint)
  totalUsers    = computed(() => this.userStats()?.total    ?? 0);
  learnerCount  = computed(() => this.userStats()?.learners ?? 0);
  mentorCount   = computed(() => this.userStats()?.mentors  ?? 0);
  adminCount    = computed(() => this.userStats()?.admins   ?? 0);

  // Mentor metrics (from stats endpoint)
  activeMentors  = computed(() => this.mentorStats()?.active        ?? 0);
  pendingMentors = computed(() => this.mentorStats()?.pending        ?? 0);
  avgRating      = computed(() => this.mentorStats()?.avgRating      ?? 0);
  totalReviews   = computed(() => this.mentorStats()?.totalReviews   ?? 0);
  avgHourlyRate  = computed(() => this.mentorStats()?.avgHourlyRate  ?? 0);

  // Registration trend — sorted chronologically, last 6 months
  registrationByMonth = computed(() => {
    const counts: Record<string, { date: Date; count: number }> = {};
    this.users().forEach(u => {
      if (!u.createdAt) return;
      const d = new Date(u.createdAt);
      // Key as YYYY-MM so natural string sort is chronological
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!counts[key]) {
        counts[key] = {
          date: new Date(d.getFullYear(), d.getMonth(), 1),
          count: 0,
        };
      }
      counts[key].count++;
    });

    const sorted = Object.values(counts)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-6); // last 6 months chronologically

    const max = Math.max(...sorted.map(e => e.count), 1);
    return sorted.map(e => ({
      label: e.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
      count: e.count,
      pct: (e.count / max) * 100,
    }));
  });

  // Top skills across mentors
  topSkills = computed(() => {
    const counts: Record<string, number> = {};
    this.mentors().forEach(m => {
      (m.skills ?? []).forEach((s: string) => {
        counts[s] = (counts[s] ?? 0) + 1;
      });
    });
    const max = Math.max(...Object.values(counts), 1);
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count, pct: (count / max) * 100 }));
  });

  kpis = computed(() => [
    { label: 'Total Users',      value: this.totalUsers(),                           icon: 'group',       color: '#4285f4', bg: '#e8f0fe' },
    { label: 'Active Mentors',   value: this.activeMentors(),                        icon: 'psychology',  color: '#34a853', bg: '#e6f4ea' },
    { label: 'Avg Rating',       value: (this.avgRating() as number).toFixed(1),     icon: 'star',        color: '#f9a825', bg: '#fff8e1' },
    { label: 'Total Reviews',    value: this.totalReviews(),                         icon: 'rate_review', color: '#8e24aa', bg: '#f3e5f5' },
    { label: 'Pending Approvals',value: this.pendingMentors(),                       icon: 'pending',     color: '#dd0031', bg: '#fce4ec' },
    { label: 'Avg Hourly Rate',  value: '₹' + (this.avgHourlyRate() as number).toFixed(0), icon: 'payments', color: '#0097a7', bg: '#e0f7fa' },
  ]);

  ngOnInit() {
    // Stats endpoints give accurate counts without loading all records.
    this.adminService.getUserStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: stats => { this.userStats.set(stats); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.adminService.getMentorStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: stats => this.mentorStats.set(stats),
      error: () => {},
    });

    // Registration trend and top-skills charts still need actual records.
    // 200 is sufficient for chart data — these are visual approximations, not exact counts.
    this.adminService.getAllUsers(0, 200).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => this.users.set(data.content),
      error: () => {},
    });
    this.adminService.getAllMentors(0, 200).pipe(takeUntil(this.destroy$)).subscribe({
      next: data => this.mentors.set(data.content),
      error: () => {},
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  stars(rating: number) {
    return Array.from({ length: 5 }, (_, i) => i < Math.round(rating));
  }
}
