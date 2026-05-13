import { CommonModule } from '@angular/common';
import { Component, Input, computed, signal } from '@angular/core';

export type StatusKind = 'project' | 'task' | 'api' | 'plain';

@Component({
  selector: 'dp-status-badge',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="dp-badge" [style.--badge-color]="color()">
      <span class="dp-badge__dot"></span>
      <span class="dp-badge__label">{{ label }}</span>
    </span>
  `,
  styleUrl: './status-badge.scss',
})
export class StatusBadgeComponent {
  @Input({ required: true }) status!: string;
  @Input() kind: StatusKind = 'plain';
  @Input() label = '';

  readonly color = computed(() => this.resolveColor());

  private resolveColor(): string {
    const s = (this.status ?? '').toUpperCase();
    if (this.kind === 'project') {
      switch (s) {
        case 'PLANNING':    return 'var(--dp-text-muted)';
        case 'DEVELOPMENT': return 'var(--dp-accent-blue)';
        case 'TESTING':     return 'var(--dp-accent-yellow)';
        case 'PRODUCTION':  return 'var(--dp-accent-green)';
        case 'ARCHIVED':    return '#4B5563';
      }
    }
    if (this.kind === 'task') {
      switch (s) {
        case 'TODO':        return '#6B7280';
        case 'IN_PROGRESS': return 'var(--dp-accent-blue)';
        case 'REVIEW':      return 'var(--dp-accent-purple)';
        case 'BLOCKED':     return 'var(--dp-accent-red)';
        case 'DONE':        return 'var(--dp-accent-green)';
      }
    }
    if (this.kind === 'api') {
      return s === 'CONNECTED' ? 'var(--dp-accent-green)' : 'var(--dp-accent-red)';
    }
    return 'var(--dp-text-muted)';
  }
}
