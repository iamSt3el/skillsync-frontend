import { Component, inject } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { MatBadgeModule } from '@angular/material/badge';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [MatIconModule, MatBadgeModule, RouterLink, RouterLinkActive],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss',
})
export class SidebarComponent {
  private authService = inject(AuthService);

  get userInitials() {
    const name = this.authService.currentUser?.name
      || this.authService.currentUser?.username
      || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  get isAdmin()  { return this.authService.currentUser?.role?.toUpperCase().includes('ADMIN'); }
  get isMentor() { return this.authService.currentUser?.role?.toUpperCase().includes('MENTOR'); }

  navItems = [
    { label: 'Dashboard',       icon: 'dashboard', link: '/dashboard/overview'     },
    { label: 'Find Mentors',    icon: 'search',    link: '/dashboard/find-mentors' },
    { label: 'My Sessions',     icon: 'event',     link: '/dashboard/sessions'     },
    { label: 'Learning Groups', icon: 'groups',    link: '/dashboard/groups'       },
    { label: 'Reviews',         icon: 'star',      link: '/dashboard/reviews'      },
  ];

  mentorNavItems = [
    { label: 'Dashboard',       icon: 'dashboard', link: '/dashboard/overview'      },
    { label: 'My Sessions',     icon: 'event',     link: '/dashboard/sessions'      },
    { label: 'Availability',    icon: 'schedule',  link: '/dashboard/availability'  },
    { label: 'Learning Groups', icon: 'groups',    link: '/dashboard/groups'        },
    { label: 'Reviews',         icon: 'star',      link: '/dashboard/reviews'       },
  ];

  adminNavItems = [
    { label: 'Overview',           icon: 'dashboard',       link: '/dashboard/admin/overview'      },
    { label: 'User Management',    icon: 'manage_accounts', link: '/dashboard/admin/users'         },
    { label: 'Mentor Approvals',   icon: 'verified_user',   link: '/dashboard/admin/approvals'     },
    { label: 'Group Management',   icon: 'groups',          link: '/dashboard/admin/groups'        },
    { label: 'Skill Catalog',      icon: 'handyman',        link: '/dashboard/admin/skill-catalog' },
    { label: 'Platform Analytics', icon: 'bar_chart',       link: '/dashboard/admin/analytics'     },
  ];

  accountItems = [
    { label: 'My Profile',    icon: 'person',        link: '/dashboard/profile'       },
    { label: 'Notifications', icon: 'notifications', link: '/dashboard/notifications' },
    { label: 'Settings',      icon: 'settings',      link: '/dashboard/settings'      },
  ];

  logout() {
    this.authService.logout();
  }
}
