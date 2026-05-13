import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { PageHeaderComponent } from '../shared/components/page-header/page-header';
import { EmptyStateComponent } from '../shared/components/empty-state/empty-state';
import { LearnMoreCardComponent } from '../shared/components/learn-more-card/learn-more-card';

@Component({
  selector: 'dp-coming-soon',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, EmptyStateComponent, LearnMoreCardComponent],
  template: `
    <dp-page-header [title]="title" [subtitle]="subtitle"></dp-page-header>
    <div class="dp-cs">
      <dp-empty-state
        [title]="'Disponible en la ' + phase"
        [description]="description"
        icon="pi-clock"
      ></dp-empty-state>
      @if (learnTitle) {
        <dp-learn-more-card [title]="learnTitle" [body]="learnBody"></dp-learn-more-card>
      }
    </div>
  `,
  styles: [
    `
      .dp-cs {
        display: grid;
        grid-template-columns: 2fr 1fr;
        gap: 1rem;
        align-items: start;

        @media (max-width: 900px) { grid-template-columns: 1fr; }
      }
    `,
  ],
})
export class ComingSoonComponent {
  @Input({ required: true }) title!: string;
  @Input() subtitle?: string;
  @Input({ required: true }) phase!: string;
  @Input() description = 'Esta funcionalidad se entregará en una fase posterior. La estructura ya está preparada para conectarla.';
  @Input() learnTitle?: string;
  @Input() learnBody = '';
}
