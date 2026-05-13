import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'dp-empty-state',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dp-empty">
      <div class="dp-empty__icon">
        <i [class]="'pi ' + icon"></i>
      </div>
      <h3 class="dp-empty__title">{{ title }}</h3>
      @if (description) {
        <p class="dp-empty__desc">{{ description }}</p>
      }
      @if (actionLabel) {
        <button type="button" class="dp-empty__cta" (click)="action.emit()">
          {{ actionLabel }}
        </button>
      }
    </div>
  `,
  styleUrl: './empty-state.scss',
})
export class EmptyStateComponent {
  @Input({ required: true }) title!: string;
  @Input() description?: string;
  @Input() icon = 'pi-inbox';
  @Input() actionLabel?: string;
  @Output() action = new EventEmitter<void>();
}
