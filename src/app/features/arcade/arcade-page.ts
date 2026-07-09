import { CommonModule } from '@angular/common';
import { Component, computed, inject, signal } from '@angular/core';
import { DomSanitizer, type SafeResourceUrl } from '@angular/platform-browser';

import { PageHeaderComponent } from '../../shared/components/page-header/page-header';
import { LearnMoreCardComponent } from '../../shared/components/learn-more-card/learn-more-card';
import { TPipe } from '../../core/i18n/t.pipe';
import {
  ArcadeService,
  type ArcadeProgress,
} from '../../core/services/arcade.service';

/**
 * Public URL of the DevCrafting WebGL build. The game is deployed with our
 * own Deploy Wizard (dogfooding); this page simply embeds that deployment.
 * Without query params the game runs 100% offline — scores sync from the
 * desktop build or when the game is served with an `?api=` config.
 */
const GAME_URL = 'https://devcrafting.vercel.app';

@Component({
  selector: 'dp-arcade-page',
  standalone: true,
  imports: [CommonModule, PageHeaderComponent, LearnMoreCardComponent, TPipe],
  templateUrl: './arcade-page.html',
  styleUrl: './arcade-page.scss',
})
export class ArcadePageComponent {
  private readonly sanitizer = inject(DomSanitizer);
  private readonly arcadeApi = inject(ArcadeService);

  protected readonly gameUrl = GAME_URL;
  protected readonly gameSrc: SafeResourceUrl =
    this.sanitizer.bypassSecurityTrustResourceUrl(GAME_URL);

  protected readonly loadGame = signal(false);

  protected readonly progress = signal<ArcadeProgress | null>(null);
  protected readonly top = signal<ArcadeProgress[]>([]);

  protected readonly hasPlayed = computed(() => this.progress() !== null);

  constructor() {
    this.arcadeApi.progress().subscribe({
      next: (p) => this.progress.set(p),
      error: () => this.progress.set(null),
    });
    this.arcadeApi.leaderboard().subscribe({
      next: (entries) => this.top.set(entries),
      error: () => this.top.set([]),
    });
  }

  playerName(entry: ArcadeProgress): string {
    const u = entry.user;
    if (u && typeof u === 'object') return u.name;
    return 'Jugador';
  }
}
