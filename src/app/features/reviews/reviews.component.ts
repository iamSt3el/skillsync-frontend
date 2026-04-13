import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MatButtonModule } from '@angular/material/button';
import { MatCard } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { AuthService } from 'src/app/core/auth/auth.service';
import { MentorResponse, MentorService } from 'src/app/core/services/mentor.service';
import { ReviewResponseDTO, ReviewService } from 'src/app/core/services/review.service';
import { SessionResponse, SessionService } from 'src/app/core/services/session.service';
import { UserBasic, UserLookupService } from 'src/app/core/services/user-lookup.service';

@Component({
  selector: 'app-reviews',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatButtonModule,
    MatIconModule,
    MatFormFieldModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatCard,
    SkeletonComponent
  ],
  templateUrl: './reviews.component.html',
  styleUrls: ['./reviews.component.scss'],
})
export class ReviewsComponent implements OnInit, OnDestroy {
  private authService    = inject(AuthService);
  private sessionService = inject(SessionService);
  private mentorService  = inject(MentorService);
  private reviewService  = inject(ReviewService);
  private userLookup     = inject(UserLookupService);
  private destroy$       = new Subject<void>();

  get user() { return this.authService.currentUser!; }
  get isLearner() { return this.user.role?.toUpperCase().includes('LEARNER'); }

  // Shared
  loading = signal(true);

  // Learner: completed sessions + review form
  completedSessions = signal<SessionResponse[]>([]);
  myReviews         = signal<ReviewResponseDTO[]>([]);

  reviewingSession = signal<SessionResponse | null>(null);
  reviewRating  = signal(5);
  reviewComment = '';
  submitting    = signal(false);

  // Mentor: reviews received
  mentorProfile  = signal<MentorResponse | null>(null);
  reviews        = signal<ReviewResponseDTO[]>([]);
  reviewerUserMap = signal(new Map<number, UserBasic>());

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  ngOnInit() {
    if (this.isLearner) {
      this.sessionService.getUserSessions(this.user.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: data => {
          this.completedSessions.set(data.filter(s => s.status === 'COMPLETED'));
          this.loading.set(false);
        },
        error: () => { this.loading.set(false); },
      });
    } else {
      // mentor.id == userId by design, so getById(userId) fetches the mentor profile directly
      this.mentorService.getById(this.user.id).pipe(takeUntil(this.destroy$)).subscribe({
        next: (profile) => {
          this.mentorProfile.set(profile);
          if (profile) {
            this.reviewService.getForMentor(profile.id).pipe(takeUntil(this.destroy$)).subscribe({
              next: r => {
                this.reviews.set(r);
                this.loading.set(false);
                const userIds = [...new Set(r.map(rv => rv.userId))];
                if (userIds.length) {
                  this.userLookup.batchFetch(userIds).pipe(takeUntil(this.destroy$)).subscribe(map => this.reviewerUserMap.set(map));
                }
              },
              error: () => { this.loading.set(false); },
            });
          } else {
            this.loading.set(false);
          }
        },
        error: () => { this.mentorProfile.set(null); this.loading.set(false); },
      });
    }
  }

  startReview(session: SessionResponse) {
    this.reviewingSession.set(session);
    this.reviewRating.set(5);
    this.reviewComment = '';
  }

  cancelReview() { this.reviewingSession.set(null); }

  submitReview() {
    const session = this.reviewingSession();
    if (!session) return;
    this.submitting.set(true);
    this.reviewService.submit({
      mentorId: session.mentorId,
      userId: this.user.id,
      rating: this.reviewRating(),
      comment: this.reviewComment,
    }).pipe(takeUntil(this.destroy$)).subscribe({
        next: review => {
          this.myReviews.update(list => [...list, review]);
          this.reviewingSession.set(null);
          this.submitting.set(false);
        },
        error: () => { this.submitting.set(false); },
      });
  }

  alreadyReviewed(session: SessionResponse) {
    return this.myReviews().some(r => r.mentorId === session.mentorId);
  }

  setRating(r: number) { this.reviewRating.set(r); }

  stars(r: number) { return Array.from({ length: 5 }, (_, i) => i + 1 <= r); }

  formatDate(d: string) {
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  reviewerName(userId: number): string {
    return this.userLookup.displayName(this.reviewerUserMap().get(userId));
  }

  reviewerPicture(userId: number): string | undefined {
    return this.reviewerUserMap().get(userId)?.profilePictureUrl ?? undefined;
  }

  reviewerInitials(userId: number): string {
    const name = this.reviewerName(userId);
    if (name === 'Unknown') return `U${userId}`.slice(0, 2).toUpperCase();
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }

  learnerColor(id: number) {
    return ['#e53935','#1e88e5','#43a047','#8e24aa','#f59e0b'][id % 5];
  }
}
