import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

@Component({
  selector: 'dp-learn-more-card',
  standalone: true,
  imports: [CommonModule],
  template: `
    <article class="dp-learn">
      <header class="dp-learn__head">
        <i class="pi pi-info-circle"></i>
        <span class="dp-learn__pill">Aprende más</span>
      </header>
      <h4 class="dp-learn__title">{{ title }}</h4>
      <p class="dp-learn__body">{{ body }}</p>
    </article>
  `,
  styleUrl: './learn-more-card.scss',
})
export class LearnMoreCardComponent {
  @Input({ required: true }) title!: string;
  @Input({ required: true }) body!: string;
}
