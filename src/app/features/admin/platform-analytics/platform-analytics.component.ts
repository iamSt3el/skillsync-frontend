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
import { BaseChartDirective } from 'ng2-charts';
import { ChartData, ChartOptions } from 'chart.js';

@Component({
  selector: 'app-platform-analytics',
  standalone: true,
  imports: [CommonModule, MatCardModule, MatIconModule, SkeletonComponent, BaseChartDirective],
  templateUrl: './platform-analytics.component.html',
  styleUrl: './platform-analytics.component.scss',
})
export class PlatformAnalyticsComponent implements OnInit, OnDestroy {
  private adminService = inject(AdminService);
  private destroy$     = new Subject<void>();

  users       = signal<UserDTO[]>([]);
  mentors     = signal<MentorResponse[]>([]);
  loading     = signal(true);

  userStats   = signal<UserStatsDTO | null>(null);
  mentorStats = signal<MentorStatsDTO | null>(null);

  // ── Scalar metrics ──────────────────────────────────────────
  totalUsers    = computed(() => this.userStats()?.total    ?? 0);
  learnerCount  = computed(() => this.userStats()?.learners ?? 0);
  mentorCount   = computed(() => this.userStats()?.mentors  ?? 0);
  adminCount    = computed(() => this.userStats()?.admins   ?? 0);

  activeMentors  = computed(() => this.mentorStats()?.active      ?? 0);
  pendingMentors = computed(() => this.mentorStats()?.pending      ?? 0);
  avgRating      = computed(() => this.mentorStats()?.avgRating    ?? 0);
  totalReviews   = computed(() => this.mentorStats()?.totalReviews ?? 0);
  avgHourlyRate  = computed(() => this.mentorStats()?.avgHourlyRate ?? 0);

  // ── KPI cards ────────────────────────────────────────────────
  kpis = computed(() => [
    { label: 'Total Users',       value: this.totalUsers(),                                 icon: 'group',        color: '#4285f4', bg: '#e8f0fe' },
    { label: 'Active Mentors',    value: this.activeMentors(),                              icon: 'psychology',   color: '#34a853', bg: '#e6f4ea' },
    { label: 'Avg Rating',        value: (this.avgRating() as number).toFixed(1),           icon: 'star',         color: '#f9a825', bg: '#fff8e1' },
    { label: 'Total Reviews',     value: this.totalReviews(),                               icon: 'rate_review',  color: '#8e24aa', bg: '#f3e5f5' },
    { label: 'Pending Approvals', value: this.pendingMentors(),                             icon: 'pending',      color: '#dd0031', bg: '#fce4ec' },
    { label: 'Avg Hourly Rate',   value: '₹' + (this.avgHourlyRate() as number).toFixed(0), icon: 'payments',    color: '#0097a7', bg: '#e0f7fa' },
  ]);

  // ── Doughnut — User Role Breakdown ──────────────────────────
  roleChartData = computed<ChartData<'doughnut'>>(() => ({
    labels: ['Learners', 'Mentors', 'Admins'],
    datasets: [{
      data: [this.learnerCount(), this.mentorCount(), this.adminCount()],
      backgroundColor: ['#4285f4', '#34a853', '#dd0031'],
      hoverBackgroundColor: ['#3367d6', '#2a8a44', '#b5001f'],
      borderWidth: 2,
      borderColor: '#ffffff',
      hoverBorderColor: '#ffffff',
    }],
  }));

  roleChartOptions: ChartOptions<'doughnut'> = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '68%',
    plugins: {
      legend: {
        position: 'bottom',
        labels: {
          padding: 20,
          font: { size: 13, weight: 500 },
          usePointStyle: true,
          pointStyleWidth: 10,
        },
      },
      tooltip: {
        callbacks: {
          label: ctx => {
            const total = (ctx.dataset.data as number[]).reduce((a, b) => a + b, 0);
            const val   = ctx.parsed as number;
            const pct   = total ? ((val / total) * 100).toFixed(1) : '0';
            return ` ${ctx.label}: ${val} (${pct}%)`;
          },
        },
      },
    },
  };

  // ── Bar — Registration Trend ─────────────────────────────────
  regChartData = computed<ChartData<'bar'>>(() => {
    const sorted = this._regSorted();
    return {
      labels: sorted.map(e => e.label),
      datasets: [{
        label: 'New Users',
        data: sorted.map(e => e.count),
        backgroundColor: 'rgba(221, 0, 49, 0.80)',
        hoverBackgroundColor: '#dd0031',
        borderRadius: 6,
        borderSkipped: false,
      }],
    };
  });

  regChartOptions: ChartOptions<'bar'> = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: ctx => ` ${ctx.parsed.y} registrations` },
      },
    },
    scales: {
      x: {
        grid: { display: false },
        ticks: { font: { size: 12 }, color: '#64748b' },
      },
      y: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 12 }, color: '#64748b', stepSize: 1 },
      },
    },
  };

  // ── Horizontal Bar — Top Skills ───────────────────────────────
  skillsChartData = computed<ChartData<'bar'>>(() => {
    const skills = this._topSkillsRaw();
    return {
      labels: skills.map(s => s.label),
      datasets: [{
        label: 'Mentors',
        data: skills.map(s => s.count),
        backgroundColor: [
          'rgba(66,133,244,0.85)',
          'rgba(52,168,83,0.85)',
          'rgba(251,188,5,0.85)',
          'rgba(234,67,53,0.85)',
          'rgba(142,36,170,0.85)',
          'rgba(0,151,167,0.85)',
        ],
        borderRadius: 5,
        borderSkipped: false,
      }],
    };
  });

  skillsChartOptions: ChartOptions<'bar'> = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { display: false },
      tooltip: {
        callbacks: { label: ctx => ` ${ctx.parsed.x} mentor${ctx.parsed.x !== 1 ? 's' : ''}` },
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        grid: { color: '#f1f5f9' },
        ticks: { font: { size: 12 }, color: '#64748b', stepSize: 1 },
      },
      y: {
        grid: { display: false },
        ticks: { font: { size: 13, weight: 500 }, color: '#374151' },
      },
    },
  };

  // ── Internal helpers ─────────────────────────────────────────
  private _regSorted = computed(() => {
    const counts: Record<string, { date: Date; count: number }> = {};
    this.users().forEach(u => {
      if (!u.createdAt) return;
      const d   = new Date(u.createdAt);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!counts[key]) counts[key] = { date: new Date(d.getFullYear(), d.getMonth(), 1), count: 0 };
      counts[key].count++;
    });
    return Object.values(counts)
      .sort((a, b) => a.date.getTime() - b.date.getTime())
      .slice(-6)
      .map(e => ({
        label: e.date.toLocaleDateString('en-US', { month: 'short', year: '2-digit' }),
        count: e.count,
      }));
  });

  private _topSkillsRaw = computed(() => {
    const counts: Record<string, number> = {};
    this.mentors().forEach(m => {
      (m.skills ?? []).forEach((s: string) => { counts[s] = (counts[s] ?? 0) + 1; });
    });
    return Object.entries(counts)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)
      .map(([label, count]) => ({ label, count }));
  });

  hasRegData   = computed(() => this._regSorted().length > 0);
  hasSkillData = computed(() => this._topSkillsRaw().length > 0);

  // ── Lifecycle ────────────────────────────────────────────────
  ngOnInit() {
    this.adminService.getUserStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: stats => { this.userStats.set(stats); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
    this.adminService.getMentorStats().pipe(takeUntil(this.destroy$)).subscribe({
      next: stats => this.mentorStats.set(stats),
      error: () => {},
    });
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
}
