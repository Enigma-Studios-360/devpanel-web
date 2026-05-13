import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'dp-stats-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="dp-stats">
      <header class="dp-stats__head">
        <i [class]="'pi ' + icon" [style.color]="iconColor"></i>
        <span class="dp-stats__label">{{ label }}</span>
      </header>
      <div class="dp-stats__value">{{ value }}</div>
      @if (hint) {
        <div class="dp-stats__hint">{{ hint }}</div>
      }
    </article>
  `,
  styleUrl: './stats-card.scss',
})
export class StatsCardComponent {
  @Input({ required: true }) label!: string;
  @Input({ required: true }) value!: string | number;
  @Input() icon = 'pi-chart-bar';
  @Input() iconColor = 'var(--dp-accent-blue)';
  @Input() hint?: string;
}
