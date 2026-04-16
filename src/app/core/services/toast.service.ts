import { Injectable, signal } from '@angular/core';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface Toast {
  id: number;
  type: ToastType;
  message: string;
}

@Injectable({ providedIn: 'root' })
export class ToastService {
  private nextId = 0;
  toasts = signal<Toast[]>([]);

  show(message: string, type: ToastType = 'info', duration = 4000) {
    const id = ++this.nextId;
    queueMicrotask(() => {
      this.toasts.update(list => [...list, { id, type, message }]);
      setTimeout(() => this.dismiss(id), duration);
    });
  }

  success(message: string) { this.show(message, 'success'); }
  error(message: string)   { this.show(message, 'error',   5000); }
  warning(message: string) { this.show(message, 'warning'); }
  info(message: string)    { this.show(message, 'info'); }

  dismiss(id: number) {
    this.toasts.update(list => list.filter(t => t.id !== id));
  }
}
