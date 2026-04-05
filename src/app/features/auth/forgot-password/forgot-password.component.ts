import { Component, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss'],
})
export class ForgotPasswordComponent {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);

  loading  = signal(false);
  sent     = signal(false);
  errorMsg = signal('');

  form = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
  });

  get email() { return this.form.controls.email; }

  onSubmit() {
    if (this.form.invalid) return;
    this.loading.set(true);
    this.errorMsg.set('');

    this.authService.forgotPassword(this.email.value!).subscribe({
      next: () => { this.loading.set(false); this.sent.set(true); },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Something went wrong. Please try again.');
      },
    });
  }
}
