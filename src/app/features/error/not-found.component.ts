import { Component, inject } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from 'src/app/core/auth/auth.service';

@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [MatButtonModule, MatIconModule],
  template: `
    <div class="error-page">

      <div class="glitch-wrap">
        <span class="glitch" data-text="404">404</span>
      </div>

      <div class="error-body">
        <h1 class="error-title">Page not found</h1>
        <p class="error-sub">
          The page you're looking for doesn't exist or has been moved.
        </p>

        <div class="error-actions">
          <button mat-flat-button class="home-btn" (click)="goHome()">
            <mat-icon>home</mat-icon>
            Go Home
          </button>
          <button mat-stroked-button class="back-btn" (click)="goBack()">
            <mat-icon>arrow_back</mat-icon>
            Go Back
          </button>
        </div>
      </div>

    </div>
  `,
  styles: `
    :host { display: block; }

    .error-page {
      min-height: 100vh;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      background: #f8fafc;
      gap: 2rem;
      padding: 2rem;
      text-align: center;
    }

    /* ── Glitch number ── */
    .glitch-wrap {
      position: relative;
      user-select: none;
    }

    .glitch {
      font-size: clamp(6rem, 20vw, 12rem);
      font-weight: 900;
      color: #dd0031;
      letter-spacing: -0.05em;
      line-height: 1;
      position: relative;
      display: inline-block;
    }

    .glitch::before,
    .glitch::after {
      content: attr(data-text);
      position: absolute;
      inset: 0;
      overflow: hidden;
    }

    .glitch::before {
      color: #1e40af;
      clip-path: polygon(0 0, 100% 0, 100% 35%, 0 35%);
      animation: glitch-top 3s infinite linear;
      opacity: 0.7;
    }

    .glitch::after {
      color: #0f172a;
      clip-path: polygon(0 65%, 100% 65%, 100% 100%, 0 100%);
      animation: glitch-bot 3s infinite linear;
      opacity: 0.7;
    }

    @keyframes glitch-top {
      0%, 90%, 100% { transform: translate(0); }
      92%            { transform: translate(-4px, -2px); }
      94%            { transform: translate(4px, 2px); }
      96%            { transform: translate(-2px, 0); }
    }

    @keyframes glitch-bot {
      0%, 90%, 100% { transform: translate(0); }
      92%            { transform: translate(4px, 2px); }
      94%            { transform: translate(-4px, -2px); }
      96%            { transform: translate(2px, 0); }
    }

    /* ── Text & actions ── */
    .error-body {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1rem;
      max-width: 480px;
    }

    .error-title {
      font-size: 2rem;
      font-weight: 800;
      color: #0f172a;
      margin: 0;
    }

    .error-sub {
      font-size: 1rem;
      color: #64748b;
      margin: 0;
      line-height: 1.6;
    }

    .error-actions {
      display: flex;
      gap: 1rem;
      margin-top: 0.5rem;
      flex-wrap: wrap;
      justify-content: center;
    }

    .home-btn {
      background: #dd0031 !important;
      color: #fff !important;
      height: 44px !important;
      border-radius: 10px !important;
      font-weight: 600 !important;
      padding: 0 1.5rem !important;
      gap: 6px;
    }

    .back-btn {
      height: 44px !important;
      border-radius: 10px !important;
      font-weight: 600 !important;
      padding: 0 1.5rem !important;
      gap: 6px;
    }
  `,
})
export class NotFoundComponent {
  private router    = inject(Router);
  private auth      = inject(AuthService);

  goHome() {
    this.router.navigate([this.auth.currentUser ? '/dashboard' : '/']);
  }

  goBack() {
    history.back();
  }
}
