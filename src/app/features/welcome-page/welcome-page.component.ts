import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-welcome',
  standalone: true,
  imports: [CommonModule, RouterModule, MatButtonModule, MatIconModule],
  templateUrl: './welcome-page.component.html',
  styleUrls: ['./welcome-page.component.scss']
})
export class WelcomeComponent {
  features = [
    {
      icon: 'school',
      title: 'Expert Mentorship',
      description: 'Connect with industry professionals who have walked the path and can guide your journey with real-world insights.'
    },
    {
      icon: 'trending_up',
      title: 'Accelerate Growth',
      description: 'Upskill faster through personalized 1-on-1 sessions, structured feedback, and goal-driven learning plans.'
    },
    {
      icon: 'groups',
      title: 'Vibrant Community',
      description: 'Join a network of driven learners and mentors collaborating, sharing knowledge, and building the future together.'
    },
    {
      icon: 'verified',
      title: 'Vetted Mentors',
      description: 'Every mentor is reviewed and approved by our team so you get quality guidance from genuinely skilled professionals.'
    },
    {
      icon: 'calendar_month',
      title: 'Flexible Scheduling',
      description: 'Book sessions that fit your schedule. Connect from anywhere, on your terms, at your own pace.'
    },
    {
      icon: 'star',
      title: 'Peer Reviews',
      description: 'Read honest reviews from other learners to find the right mentor match for your goals and learning style.'
    }
  ];
}
