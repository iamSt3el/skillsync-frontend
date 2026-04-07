import { CommonModule } from "@angular/common";
import { Component, OnInit, inject } from "@angular/core";
import { FormBuilder, ReactiveFormsModule, Validators } from "@angular/forms";
import { MatButtonModule } from "@angular/material/button";
import { MatCardModule } from "@angular/material/card";
import { MatCheckboxModule } from "@angular/material/checkbox";
import { MatFormFieldModule } from "@angular/material/form-field";
import { MatIconModule } from "@angular/material/icon";
import { MatInputModule } from "@angular/material/input";
import { MatProgressSpinnerModule } from "@angular/material/progress-spinner";
import { Router, RouterLink } from "@angular/router";
import { AuthService } from "src/app/core/auth/auth.service";

// Google Identity Services global type
declare const google: any;

// Your Google OAuth Client ID — replace with actual value from Google Cloud Console
const GOOGLE_CLIENT_ID = '1047763196851-n54k1litelhu31840c4m10gerbk8608p.apps.googleusercontent.com';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    CommonModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatCheckboxModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  loginForm = this.fb.group({
    email:      ['', [Validators.required, Validators.email]],
    password:   ['', [Validators.required, Validators.minLength(6)]],
    rememberMe: [false],
  });

  loading       = false;
  googleLoading = false;
  errorMessage  = '';
  showPassword  = false;

  get email()    { return this.loginForm.get('email')!; }
  get password() { return this.loginForm.get('password')!; }

  ngOnInit() {
    // Initialize Google Identity Services when the GIS script is ready
    this.initGoogleSignIn();
  }

  private initGoogleSignIn() {
    const init = () => {
      if (typeof google === 'undefined' || !google?.accounts?.id) return;
      google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: (response: any) => this.handleGoogleCredential(response),
        auto_select: false,
      });
    };

    // GIS script loads async — wait for it
    if (typeof google !== 'undefined') {
      init();
    } else {
      const script = document.querySelector('script[src*="accounts.google.com/gsi/client"]');
      script?.addEventListener('load', init);
    }
  }

  /** Called when user clicks the Google button */
  signInWithGoogle() {
    if (typeof google === 'undefined' || !google?.accounts?.id) {
      this.errorMessage = 'Google Sign-In is not available. Please try again.';
      return;
    }
    google.accounts.id.prompt();
  }

  private handleGoogleCredential(response: { credential: string }) {
    this.googleLoading = true;
    this.errorMessage = '';

    this.authService.googleLogin(response.credential).subscribe({
      next: (user) => {
        this.googleLoading = false;
        const dest = user.role?.toUpperCase().includes('ADMIN') ? ['/dashboard/admin/overview'] : ['/dashboard'];
        this.router.navigate(dest);
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.googleLoading = false;
      },
    });
  }

  onSubmit(): void {
    if (this.loginForm.invalid) return;

    this.loading = true;
    this.errorMessage = '';

    const { email, password } = this.loginForm.value;
    this.authService.login({ email: email!, password: password! }).subscribe({
      next: (user) => {
        this.loading = false;
        const dest = user.role?.toUpperCase().includes('ADMIN') ? ['/dashboard/admin/overview'] : ['/dashboard'];
        this.router.navigate(dest);
      },
      error: (err: Error) => {
        this.errorMessage = err.message;
        this.loading = false;
      },
    });
  }
}
