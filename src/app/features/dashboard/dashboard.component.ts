import { AsyncPipe, CommonModule } from '@angular/common';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { Component, OnInit, OnDestroy, computed, inject, signal } from '@angular/core';
import { Subject } from 'rxjs';
import { filter, takeUntil } from 'rxjs/operators';
import { AuthService } from 'src/app/core/auth/auth.service';
import { NotificationService } from 'src/app/core/services/notification.service';
import { NotificationWebSocketService } from 'src/app/core/services/notification-websocket.service';
import { SidebarComponent } from 'src/app/core/layout/sidebar/sidebar.component';

// Keys are derived from the URL: last segment for regular routes,
// "admin-<segment>" for routes under /dashboard/admin/*
const PAGE_LABELS: Record<string, { label: string; icon: string }> = {
  overview:              { label: 'Dashboard',        icon: 'dashboard' },
  'find-mentors':        { label: 'Find Mentors',      icon: 'manage_search' },
  sessions:              { label: 'My Sessions',       icon: 'event_note' },
  groups:                { label: 'Learning Groups',   icon: 'groups' },
  reviews:               { label: 'Reviews',           icon: 'rate_review' },
  profile:               { label: 'My Profile',        icon: 'person' },
  notifications:         { label: 'Notifications',     icon: 'notifications' },
  settings:              { label: 'Settings',          icon: 'settings' },
  // Admin routes — prefixed with "admin-" to avoid collisions with user-facing routes
  'admin-overview':      { label: 'Admin Dashboard',   icon: 'admin_panel_settings' },
  'admin-users':         { label: 'User Management',   icon: 'manage_accounts' },
  'admin-approvals':     { label: 'Mentor Approvals',  icon: 'verified_user' },
  'admin-analytics':     { label: 'Analytics',         icon: 'analytics' },
  'admin-groups':        { label: 'Group Management',  icon: 'groups' },
  'admin-skill-catalog': { label: 'Skill Catalog',     icon: 'library_books' },
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [
    AsyncPipe,
    CommonModule,
    MatIconModule,
    MatButtonModule,
    RouterModule,
    SidebarComponent,
  ],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit, OnDestroy {
  authService          = inject(AuthService);
  private router       = inject(Router);
  private notifService = inject(NotificationService);
  private wsService    = inject(NotificationWebSocketService);

  activePage = 'overview';
  unreadCount = signal(0);
  mobileSidebarOpen = signal(false);
  private destroy$ = new Subject<void>();

  userInitials = computed(() => {
    const u = this.authService.currentUser;
    const name = u?.name || u?.username || 'U';
    return name.split(' ').map((n: string) => n[0]).join('').toUpperCase().slice(0, 2);
  });

  pageInfo = computed(() => PAGE_LABELS[this.activePage] ?? { label: 'SkillSync', icon: 'dashboard' });

  ngOnInit() {
    // Track active page from router URL so topbar title/icon stays in sync
    this.router.events.pipe(
      filter(e => e instanceof NavigationEnd),
      takeUntil(this.destroy$)
    ).subscribe((e: any) => {
      this.activePage = this.pageKeyFromUrl(e.urlAfterRedirects ?? e.url);
      if (this.activePage === 'notifications') this.unreadCount.set(0);
      this.mobileSidebarOpen.set(false);
    });
    // Set immediately for the initial navigation (event may have already fired)
    this.activePage = this.pageKeyFromUrl(this.router.url);

    if (!this.authService.currentUser && this.authService.token) {
      this.authService.fetchProfile().subscribe(user => {
        if (user.role?.toUpperCase().includes('ADMIN')) {
          this.router.navigate(['/dashboard/admin/overview'], { replaceUrl: true });
        }
      });
    } else if (this.authService.currentUser?.role?.toUpperCase().includes('ADMIN')) {
      // Admin landed on /dashboard directly (e.g. page refresh) — redirect to admin overview
      const url = this.router.url;
      if (url === '/dashboard' || url === '/dashboard/overview') {
        this.router.navigate(['/dashboard/admin/overview'], { replaceUrl: true });
      }
    }
    const userId = this.authService.currentUser?.id;
    if (userId) {
      // Load initial unread count from REST
      this.notifService.getForUser(userId).subscribe({
        next: (data: any) => {
          const list = Array.isArray(data) ? data : (data?.content ?? []);
          this.unreadCount.set(list.filter((n: any) => !n.isRead).length);
        },
        error: () => {},
      });

      // Open WebSocket for real-time notifications
      this.wsService.connect();
      this.wsService.notifications$.subscribe(() => {
        if (this.activePage !== 'notifications') {
          this.unreadCount.update(c => c + 1);
        }
      });
    }
  }

  ngOnDestroy() {
    this.wsService.disconnect();
    this.destroy$.next();
    this.destroy$.complete();
  }

  /** Derive the PAGE_LABELS key from a /dashboard/... URL. */
  private pageKeyFromUrl(url: string): string {
    // Strip query params / fragments
    const path = url.split('?')[0].split('#')[0];
    const segments = path.split('/').filter(Boolean); // e.g. ['dashboard', 'admin', 'users']
    if (segments[1] === 'admin') {
      // /dashboard/admin/<segment> → "admin-<segment>"
      return segments[2] ? `admin-${segments[2]}` : 'admin-overview';
    }
    return segments[1] || 'overview';
  }

  navigateTo(page: string) {
    this.activePage = page;
    if (page === 'notifications') this.unreadCount.set(0);
    this.mobileSidebarOpen.set(false);
  }

  get isLearner() { return this.authService.currentUser?.role?.toUpperCase().includes('LEARNER'); }
  get isMentor()  { return this.authService.currentUser?.role?.toUpperCase().includes('MENTOR'); }
  get isAdmin()   { return this.authService.currentUser?.role?.toUpperCase().includes('ADMIN'); }
}
