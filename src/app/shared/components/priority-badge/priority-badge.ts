import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

export type Priority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

@Component({
  selector: 'dp-priority-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="dp-pri" [class]="'dp-pri--' + (priority | lowercase)">
      {{ priority }}
    </span>
  `,
  styles: [
    `
      .dp-pri {
        display: inline-block;
        padding: 0.2rem 0.55rem;
        border-radius: 999px;
        font-size: 11.5px;
        font-weight: 600;
        letter-spacing: 0.02em;
        text-transform: uppercase;
        border: 1px solid transparent;
      }
      .dp-pri--low     { color: #94A3B8; border-color: #334155; background: rgba(148,163,184,.1); }
      .dp-pri--medium  { color: #F59E0B; border-color: rgba(245,158,11,.4); background: rgba(245,158,11,.12); }
      .dp-pri--high    { color: #FB923C; border-color: rgba(251,146,60,.4); background: rgba(251,146,60,.12); }
      .dp-pri--urgent  { color: #EF4444; border-color: rgba(239,68,68,.45); background: rgba(239,68,68,.14); }
    `,
  ],
})
export class PriorityBadgeComponent {
  @Input({ required: true }) priority!: Priority;
}
