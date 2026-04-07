import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-skeleton',
  standalone: true,
  template: `
    <div
      class="skeleton-block"
      [style.width]="width"
      [style.height]="height"
      [style.border-radius]="borderRadius"
    ></div>
  `,
  styles: `
    :host { display: block; }

    .skeleton-block {
      background: linear-gradient(
        90deg,
        #f0f0f0 25%,
        #e4e4e4 50%,
        #f0f0f0 75%
      );
      background-size: 200% 100%;
      animation: sk-shimmer 1.5s infinite linear;
    }

    @keyframes sk-shimmer {
      0%   { background-position: 200% 0; }
      100% { background-position: -200% 0; }
    }
  `,
})
export class SkeletonComponent {
  @Input() width  = '100%';
  @Input() height = '16px';
  @Input() borderRadius = '4px';
}
