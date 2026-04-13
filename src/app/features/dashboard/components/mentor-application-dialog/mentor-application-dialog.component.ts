import { Component, OnDestroy, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, Validators, ReactiveFormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SkillService, SkillResponse } from 'src/app/core/services/skill.service';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { MentorService } from 'src/app/core/services/mentor.service';
import { ToastService } from 'src/app/core/services/toast.service';

@Component({
  selector: 'app-mentor-application-dialog',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './mentor-application-dialog.component.html',
  styleUrls: ['./mentor-application-dialog.component.scss']
})
export class MentorApplicationDialogComponent implements OnInit, OnDestroy {
  private dialogRef    = inject(MatDialogRef<MentorApplicationDialogComponent>);
  private fb           = inject(FormBuilder);
  private skillService = inject(SkillService);
  private mentorService = inject(MentorService);
  private toast        = inject(ToastService);

  isSubmitting = signal(false);
  private destroy$ = new Subject<void>();

  // Store fetched skills
  availableSkills = signal<SkillResponse[]>([]);

  applicationForm: FormGroup = this.fb.group({
    skills: [[], Validators.required], // Updated to an array for multiple skills
    experience: ['', [Validators.required, Validators.min(1)]],
    hourlyRate: ['', [Validators.required, Validators.min(0)]],
    bio: ['', Validators.required],
  });

  ngOnInit() {
    this.skillService.getAll().pipe(takeUntil(this.destroy$)).subscribe({
      next: (skills) => this.availableSkills.set(skills),
      error: () => this.toast.error('Failed to load skills. Please close and try again.'),
    });
  }

  ngOnDestroy() {
    this.destroy$.next();
    this.destroy$.complete();
  }

  // Helper to get full skill objects based on selected IDs
  getSelectedSkills() {
    const selectedIds = this.applicationForm.get('skills')?.value || [];
    return this.availableSkills().filter(skill => selectedIds.includes(skill.id));
  }

  // Remove a skill when clicking the 'X' on a droplet
  removeSkill(skillId: number) {
    const currentSkills = this.applicationForm.get('skills')?.value || [];
    this.applicationForm.patchValue({
      skills: currentSkills.filter((id: number) => id !== skillId)
    });
  }

  submitApplication() {
    if (!this.applicationForm.valid) {
      // Show all field errors instead of silently doing nothing
      this.applicationForm.markAllAsTouched();
      return;
    }
    this.isSubmitting.set(true);
    this.mentorService.applyMentor(this.applicationForm.value).pipe(takeUntil(this.destroy$)).subscribe({
      next: () => {
        this.toast.success('Application submitted! Awaiting admin review.');
        this.dialogRef.close(true);
        this.isSubmitting.set(false);
      },
      error: () => {
        this.toast.error('Failed to submit application. Please try again.');
        this.isSubmitting.set(false);
      },
    });
  }

  close() {
    this.dialogRef.close();
  }
}
