import { Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { FormBuilder, ReactiveFormsModule, Validators, AbstractControl, ValidationErrors } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from 'src/app/core/auth/auth.service';

function passwordsMatch(control: AbstractControl): ValidationErrors | null {
  const pw  = control.get('newPassword')?.value;
  const cpw = control.get('confirmPassword')?.value;
  return pw && cpw && pw !== cpw ? { mismatch: true } : null;
}

const PASSWORD_PATTERN = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,}$/;

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [
    CommonModule, RouterModule, ReactiveFormsModule,
    MatButtonModule, MatFormFieldModule, MatInputModule,
    MatIconModule, MatProgressSpinnerModule,
  ],
  templateUrl: './reset-password.component.html',
  styleUrls: ['./reset-password.component.scss'],
})
export class ResetPasswordComponent implements OnInit {
  private fb          = inject(FormBuilder);
  private authService = inject(AuthService);
  private route       = inject(ActivatedRoute);

  token       = signal('');
  loading     = signal(false);
  done        = signal(false);
  errorMsg    = signal('');
  showPw      = signal(false);
  showConfirm = signal(false);

  form = this.fb.group({
    newPassword:     ['', [Validators.required, Validators.pattern(PASSWORD_PATTERN)]],
    confirmPassword: ['', Validators.required],
  }, { validators: passwordsMatch });

  get newPw()    { return this.form.controls.newPassword; }
  get confirmPw(){ return this.form.controls.confirmPassword; }

  ngOnInit() {
    const t = this.route.snapshot.queryParamMap.get('token') ?? '';
    this.token.set(t);
    if (!t) {
      this.errorMsg.set('Invalid or missing reset token. Please request a new link.');
    }
  }

  onSubmit() {
    if (this.form.invalid || !this.token()) return;
    this.loading.set(true);
    this.errorMsg.set('');

    this.authService.resetPassword(this.token(), this.newPw.value!).subscribe({
      next: () => { this.loading.set(false); this.done.set(true); },
      error: (err) => {
        this.loading.set(false);
        this.errorMsg.set(err.error?.message || 'Reset link is invalid or expired. Please request a new one.');
      },
    });
  }
}
