import { CommonModule } from '@angular/common';
import { Component, Input, numberAttribute } from '@angular/core';

/**
 * Lightweight placeholder block with the shimmer animation. Drop in
 * place of "Cargando…" spinners when we know the eventual content
 * shape — feels snappier and keeps layout from jumping when the data
 * arrives.
 *
 * Examples:
 *   <dp-skeleton variant="text" />               <!-- single line  -->
 *   <dp-skeleton variant="text" lines="3" />     <!-- 3 lines      -->
 *   <dp-skeleton variant="card" height="120" />  <!-- block        -->
 *   <dp-skeleton variant="circle" size="36" />   <!-- avatar       -->
 */
@Component({
  selector: 'dp-skeleton',
  standalone: true,
  imports: [CommonModule],
  template: `
    @if (variant === 'text') {
      @for (_ of placeholderLines; track $index) {
        <span
          class="dp-skel dp-skel--text"
          [style.width]="$last && lines > 1 ? '65%' : '100%'"
        ></span>
      }
    } @else if (variant === 'circle') {
      <span
        class="dp-skel dp-skel--circle"
        [style.width.px]="size"
        [style.height.px]="size"
      ></span>
    } @else {
      <span
        class="dp-skel dp-skel--block"
        [style.height.px]="height"
        [style.width]="width"
      ></span>
    }
  `,
  styleUrl: './skeleton.scss',
})
export class SkeletonComponent {
  @Input() variant: 'text' | 'card' | 'circle' = 'card';
  // Inputs accept string literals so callers can write `lines="3"` directly
  // in the template without needing the property-binding syntax.
  @Input({ transform: numberAttribute }) lines = 1;
  @Input({ transform: numberAttribute }) height = 80;
  @Input({ transform: numberAttribute }) size = 32;
  @Input() width = '100%';

  /** Iterable for @for in the template (avoid generating arrays in the binding). */
  protected get placeholderLines(): unknown[] {
    return Array.from({ length: Math.max(1, this.lines) });
  }
}
