import { CommonModule } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { SkeletonComponent } from 'src/app/shared/skeleton/skeleton.component';
import { AuthService } from 'src/app/core/auth/auth.service';
import { PaymentService } from 'src/app/core/services/payment.service';

export interface PaymentHistory {
  id: number;
  sessionId: number;
  amount: number;
  currency: string;
  status: string;
  gatewayPaymentId: string;
  createdAt: string;
}

@Component({
  selector: 'app-profile',
  standalone: true,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
    SkeletonComponent,
  ],
  templateUrl: './profile.component.html',
  styleUrls: ['./profile.component.scss'],
})
export class ProfileComponent implements OnInit {
  private authService   = inject(AuthService);
  private paymentService = inject(PaymentService);
  private fb            = inject(FormBuilder);

  get user() { return this.authService.currentUser!; }

  editing      = signal(false);
  saving       = signal(false);
  success      = signal(false);
  errorMsg     = signal('');
  uploadingPic = signal(false);
  picError     = signal('');

  payments        = signal<PaymentHistory[]>([]);
  loadingPayments = signal(true);
  activeTab       = signal<'info' | 'payments'>('info');

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    name:     [''],
  });

  ngOnInit() {
    this.form.patchValue({
      username: this.user.username,
      name:     this.user.name,
    });

    this.paymentService.getMyPayments().subscribe({
      next: (data: any) => {
        this.payments.set(Array.isArray(data) ? data : []);
        this.loadingPayments.set(false);
      },
      error: () => this.loadingPayments.set(false),
    });
  }

  startEdit() {
    this.editing.set(true);
    this.success.set(false);
    this.errorMsg.set('');
  }

  cancelEdit() {
    this.editing.set(false);
    this.form.patchValue({ username: this.user.username, name: this.user.name });
  }

  save() {
    if (this.form.invalid) return;
    this.saving.set(true);
    this.errorMsg.set('');
    this.authService.updateProfile(this.form.value as any).subscribe({
      next: () => { this.saving.set(false); this.editing.set(false); this.success.set(true); },
      error: (err) => { this.saving.set(false); this.errorMsg.set(err?.error?.message || 'Failed to update profile.'); },
    });
  }

  onFileSelected(event: Event) {
    const file = (event.target as HTMLInputElement).files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) { this.picError.set('Please select an image file.'); return; }
    this.picError.set('');
    this.uploadingPic.set(true);
    this.resizeAndUpload(file);
  }

  private resizeAndUpload(file: File) {
    const reader = new FileReader();
    reader.onload = (e) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX = 256;
        const ratio = Math.min(MAX / img.width, MAX / img.height);
        canvas.width  = Math.round(img.width  * ratio);
        canvas.height = Math.round(img.height * ratio);
        canvas.getContext('2d')!.drawImage(img, 0, 0, canvas.width, canvas.height);
        this.uploadPicture(canvas.toDataURL('image/jpeg', 0.8));
      };
      img.src = e.target!.result as string;
    };
    reader.readAsDataURL(file);
  }

  private uploadPicture(dataUrl: string) {
    this.authService.updateProfilePicture(dataUrl).subscribe({
      next: () => { this.uploadingPic.set(false); this.success.set(true); },
      error: () => { this.uploadingPic.set(false); this.picError.set('Upload failed. Please try again.'); },
    });
  }

  get roleLabel()    { return this.user.role.charAt(0) + this.user.role.slice(1).toLowerCase(); }
  get userInitials() {
    const name = this.user.name || this.user.username || 'U';
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
  }
  get joinedDate() {
    return new Date(this.user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' });
  }

  paymentStatusClass(status: string): string {
    const map: Record<string, string> = {
      SUCCESS: 'badge--success',
      FAILED:  'badge--failed',
      INITIATED: 'badge--pending',
    };
    return map[status] ?? 'badge--pending';
  }

  formatAmount(amount: number, currency: string): string {
    return new Intl.NumberFormat('en-IN', { style: 'currency', currency: currency ?? 'INR', maximumFractionDigits: 0 }).format(amount);
  }

  formatDate(dateStr: string): string {
    return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  }

  get totalSpent(): number {
    return this.payments()
      .filter(p => p.status === 'SUCCESS')
      .reduce((sum, p) => sum + p.amount, 0);
  }
}
