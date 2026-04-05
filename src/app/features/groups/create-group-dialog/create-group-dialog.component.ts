import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { MatDialogRef, MatDialogModule } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { GroupService } from 'src/app/core/services/group.service';
import { AuthService } from 'src/app/core/auth/auth.service';
import { ToastService } from 'src/app/core/services/toast.service';

@Component({
  selector: 'app-create-group-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './create-group-dialog.component.html',
  styleUrls: ['./create-group-dialog.component.scss'],
})
export class CreateGroupDialogComponent {
  private dialogRef    = inject(MatDialogRef<CreateGroupDialogComponent>);
  private groupService = inject(GroupService);
  private authService  = inject(AuthService);
  private toast        = inject(ToastService);

  name        = '';
  description = '';
  creating    = signal(false);

  get user() { return this.authService.currentUser!; }

  submit() {
    if (!this.name.trim()) return;
    this.creating.set(true);
    this.groupService.create({ name: this.name, description: this.description, createdBy: this.user.id }).subscribe({
      next: group => {
        this.toast.success(`Group "${group.name}" created!`);
        this.dialogRef.close(group);
      },
      error: () => {
        this.toast.error('Failed to create group. Please try again.');
        this.creating.set(false);
      },
    });
  }

  cancel() { this.dialogRef.close(); }
}
