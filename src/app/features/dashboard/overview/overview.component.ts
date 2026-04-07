import { Component, inject } from '@angular/core';
import { AuthService } from 'src/app/core/auth/auth.service';
import { LearnerDashboardComponent } from '../learner-dashboard/learner-dashboard.component';
import { MentorDashboardComponent } from '../mentor-dashboard/mentor-dashboard.component';

@Component({
  selector: 'app-overview',
  standalone: true,
  imports: [LearnerDashboardComponent, MentorDashboardComponent],
  template: `
    @if (isLearner) { <app-learner-dashboard /> }
    @else if (isMentor) { <app-mentor-dashboard /> }
  `,
})
export class OverviewComponent {
  private auth = inject(AuthService);
  get isLearner() { return this.auth.currentUser?.role?.toUpperCase().includes('LEARNER'); }
  get isMentor()  { return this.auth.currentUser?.role?.toUpperCase().includes('MENTOR'); }
}
