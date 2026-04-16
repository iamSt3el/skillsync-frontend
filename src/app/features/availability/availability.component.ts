import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';
import { MentorResponse, MentorService } from 'src/app/core/services/mentor.service';

const ALL_SLOTS: { label: string; value: string }[] = Array.from({ length: 14 }, (_, i) => {
  const hour = i + 8;
  const value = `${String(hour).padStart(2, '0')}:00`;
  const period = hour < 12 ? 'AM' : 'PM';
  const display = hour === 12 ? 12 : hour > 12 ? hour - 12 : hour;
  return { label: `${display}:00 ${period}`, value };
});

@Component({
  selector: 'app-availability',
  standalone: true,
  imports: [
    CommonModule,
    MatButtonModule,
    MatIconModule,
    MatSnackBarModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './availability.component.html',
  styleUrl: './availability.component.scss',
})
export class AvailabilityComponent implements OnInit {
  private authService  = inject(AuthService);
  private mentorService = inject(MentorService);
  private snackBar      = inject(MatSnackBar);

  readonly allSlots = ALL_SLOTS;

  profile   = signal<MentorResponse | null>(null);
  loading   = signal(true);
  saving    = signal(false);

  selectedSlots     = signal<string[]>([]);
  savedAvailability = signal('');

  isDirty = computed(() => {
    const current = [...this.selectedSlots()].sort().join(',');
    return current !== this.savedAvailability();
  });

  ngOnInit() {
    const userId = this.authService.currentUser!.id;
    this.mentorService.getById(userId).subscribe({
      next: profile => {
        this.profile.set(profile);
        this._sync(profile?.availability ?? '');
        this.loading.set(false);
      },
      error: () => { this.loading.set(false); },
    });
  }

  isSelected(value: string): boolean {
    return this.selectedSlots().includes(value);
  }

  toggleSlot(value: string) {
    const current = this.selectedSlots();
    if (current.includes(value)) {
      this.selectedSlots.set(current.filter(s => s !== value));
    } else {
      this.selectedSlots.set([...current, value]);
    }
  }

  save() {
    const profile = this.profile();
    if (!profile || this.saving()) return;
    this.saving.set(true);

    const slots = [...this.selectedSlots()].sort();
    this.mentorService.updateAvailability(profile.id, slots).subscribe({
      next: updated => {
        this.profile.set(updated);
        this._sync(updated.availability ?? '');
        this.saving.set(false);
        this.snackBar.open(
          slots.length
            ? `${slots.length} slot${slots.length > 1 ? 's' : ''} saved`
            : 'Marked as unavailable',
          '',
          { duration: 2500 }
        );
      },
      error: () => {
        this.saving.set(false);
        this.snackBar.open('Failed to update availability', '', { duration: 3000 });
      },
    });
  }

  private _sync(raw: string) {
    const slots = raw ? raw.split(',').map(s => s.trim()).filter(Boolean) : [];
    this.selectedSlots.set(slots);
    this.savedAvailability.set([...slots].sort().join(','));
  }
}
