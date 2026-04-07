import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';
import { HttpClient } from '@angular/common/http';
import { environment } from 'src/environments/environment';

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSlideToggleModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './settings.component.html',
  styleUrls: ['./settings.component.scss'],
})
export class SettingsComponent {
  private authService = inject(AuthService);
  private http        = inject(HttpClient);
  private fb          = inject(FormBuilder);

  get user() { return this.authService.currentUser!; }

  /* ── Password change ── */
  showCurrentPwd = signal(false);
  showNewPwd     = signal(false);
  showConfirmPwd = signal(false);
  pwdSaving      = signal(false);
  pwdSuccess     = signal(false);
  pwdError       = signal('');

  pwdForm = this.fb.group({
    currentPassword: ['', Validators.required],
    newPassword:     ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required],
  }, { validators: this.passwordsMatch });

  private passwordsMatch(g: any) {
    return g.get('newPassword')?.value === g.get('confirmPassword')?.value
      ? null : { mismatch: true };
  }

  changePassword() {
    if (this.pwdForm.invalid) return;
    this.pwdSaving.set(true);
    this.pwdError.set('');
    this.pwdSuccess.set(false);
    const { currentPassword, newPassword } = this.pwdForm.value;
    this.http.put(`${environment.apiUrl}/auth/change-password`, { currentPassword, newPassword }).subscribe({
      next: () => {
        this.pwdSaving.set(false);
        this.pwdSuccess.set(true);
        this.pwdForm.reset();
      },
      error: (err) => {
        this.pwdSaving.set(false);
        this.pwdError.set(err?.error?.message || 'Failed to change password.');
      },
    });
  }

  /* ── Danger zone ── */
  deleteConfirmText = signal('');
  deleteError       = signal('');

  deleteAccount() {
    if (this.deleteConfirmText() !== 'DELETE') return;
    this.deleteError.set('');
    this.http.delete(`${environment.apiUrl}/users/me`).subscribe({
      next: () => this.authService.logout(),
      error: (err) => this.deleteError.set(err?.error?.message || 'Failed to delete account.'),
    });
  }
}
