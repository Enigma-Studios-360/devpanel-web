import { CommonModule } from '@angular/common';
import { Component, Input, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { readWithMigration, safeSet } from '../../../core/storage/migrate';

/**
 * Each release bumps the ID. The banner only appears for users who
 * haven't dismissed THIS specific id, so future releases re-surface
 * automatically without us touching storage.
 */
export interface WhatsNewItem {
  id: string;
  /** Pi-icon class. */
  icon: string;
  title: string;
  description: string;
  /** Internal route to navigate when the card is clicked (optional). */
  route?: string[];
  /** Tone — currently visual only ('default' | 'ai'). */
  tone?: 'default' | 'ai';
}

/**
 * A dismissible "what's new" strip that lists recently shipped features.
 * Lives in the dashboard. Hides itself when the user has already
 * dismissed the active release id (kept in localStorage).
 */
@Component({
  selector: 'dp-whats-new',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './whats-new.html',
  styleUrl: './whats-new.scss',
})
export class WhatsNewComponent implements OnInit {
  private readonly router = inject(Router);

  /**
   * Bump this in the parent every time we ship something worth surfacing.
   * The banner re-appears the next time each user visits the dashboard.
   */
  @Input({ required: true }) releaseId!: string;
  @Input({ required: true }) headline!: string;
  @Input() items: WhatsNewItem[] = [];

  protected readonly dismissed = signal<boolean>(false);
  protected readonly visible = computed(() => !this.dismissed());

  ngOnInit(): void {
    this.dismissed.set(this.isDismissed(this.releaseId));
  }

  open(item: WhatsNewItem): void {
    if (item.route) {
      void this.router.navigate(item.route);
    }
  }

  dismiss(): void {
    this.dismissed.set(true);
    this.markDismissed(this.releaseId);
  }

  private storageKey(releaseId: string): { key: string; legacy: string } {
    return {
      key: `devhub.whatsnew.${releaseId}`,
      legacy: `devpanel.whatsnew.${releaseId}`,
    };
  }

  private isDismissed(releaseId: string): boolean {
    const { key, legacy } = this.storageKey(releaseId);
    return readWithMigration(key, legacy) === '1';
  }

  private markDismissed(releaseId: string): void {
    const { key } = this.storageKey(releaseId);
    safeSet(key, '1');
  }
}
