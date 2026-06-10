import { CommonModule } from '@angular/common';
import {
  Component,
  HostListener,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { Router } from '@angular/router';
import {
  NotificationsService,
  type NotificationRecord,
  type NotificationType,
} from '../../services/notifications.service';
import { AuthStateService } from '../../auth/auth-state.service';

/**
 * Topbar bell + dropdown.
 *
 * Lifecycle:
 *
 *   1. On mount + every 30s, ask the backend for the unread count
 *      (super cheap GET). Polling is paused while the dropdown is
 *      open so we don't fight the user's perception of state.
 *
 *   2. On dropdown open, fetch the latest 20 notifications. They're
 *      cached in a signal until the user closes + reopens, at which
 *      point we refresh.
 *
 *   3. Clicking an item:
 *      - calls `markRead` (best-effort),
 *      - decrements unread locally for snappy UX,
 *      - navigates to `action.url` if it looks internal.
 *
 *   4. "Marcar todas como leídas" sets every unread → read in one call.
 */
@Component({
  selector: 'dp-notification-bell',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './notification-bell.html',
  styleUrl: './notification-bell.scss',
})
export class NotificationBellComponent {
  private readonly api = inject(NotificationsService);
  private readonly router = inject(Router);
  private readonly authState = inject(AuthStateService);

  protected readonly open = signal(false);
  protected readonly loading = signal(false);
  protected readonly unread = signal(0);
  protected readonly notifications = signal<NotificationRecord[]>([]);

  protected readonly hasItems = computed(() => this.notifications().length > 0);
  protected readonly hasUnread = computed(() => this.unread() > 0);
  protected readonly badgeLabel = computed(() => {
    const n = this.unread();
    if (n <= 0) return '';
    return n > 99 ? '99+' : String(n);
  });

  /** Local polling timer id so we can cancel on destroy. */
  private pollTimer: ReturnType<typeof setInterval> | null = null;
  private static readonly POLL_MS = 30_000;

  constructor() {
    // Sync polling lifecycle with auth state — don't hammer the API on
    // the public landing or auth screens (no token, would 401 anyway).
    effect(() => {
      if (this.authState.isAuthenticated()) {
        this.startPolling();
        this.refreshCount();
      } else {
        this.stopPolling();
        this.notifications.set([]);
        this.unread.set(0);
        this.open.set(false);
      }
    });
  }

  // -- UI hooks --------------------------------------------------------------

  toggle(): void {
    if (this.open()) this.close();
    else this.openDropdown();
  }

  openDropdown(): void {
    this.open.set(true);
    this.refreshList();
    this.stopPolling(); // pause while open; we'll resume on close
  }

  close(): void {
    this.open.set(false);
    if (this.authState.isAuthenticated()) {
      this.refreshCount();
      this.startPolling();
    }
  }

  /** Click anywhere outside the bell to dismiss. */
  @HostListener('document:click', ['$event'])
  onDocClick(evt: MouseEvent): void {
    if (!this.open()) return;
    const target = evt.target as HTMLElement | null;
    if (!target?.closest('.dp-bell')) this.close();
  }

  // -- Polling ---------------------------------------------------------------

  private startPolling(): void {
    if (this.pollTimer) return;
    this.pollTimer = setInterval(
      () => this.refreshCount(),
      NotificationBellComponent.POLL_MS,
    );
  }

  private stopPolling(): void {
    if (this.pollTimer) {
      clearInterval(this.pollTimer);
      this.pollTimer = null;
    }
  }

  private refreshCount(): void {
    if (!this.authState.isAuthenticated()) return;
    this.api.unreadCount().subscribe({
      next: (count) => this.unread.set(count),
      error: () => {
        /* network blip — keep the previous count */
      },
    });
  }

  private refreshList(): void {
    this.loading.set(true);
    this.api.list({ page: 1, perPage: 20 }).subscribe({
      next: (res) => {
        this.notifications.set(res.data);
        this.loading.set(false);
        // Re-sync the badge with what we just received — covers the
        // edge case where someone marked notifications read from a
        // different tab while this one was idle.
        const unreadFromList = res.data.filter((n) => !n.readAt).length;
        const meta = res.meta;
        // If there are unread items on later pages too, the count from
        // /unread-count is still authoritative; trust the larger number.
        this.unread.set(Math.max(this.unread(), unreadFromList));
        // Edge: total === 0 → ensure badge clears.
        if (meta.total === 0) this.unread.set(0);
      },
      error: () => this.loading.set(false),
    });
  }

  // -- Item handling ---------------------------------------------------------

  protected readonly trackId = (_i: number, n: NotificationRecord): string => n._id;

  openItem(n: NotificationRecord): void {
    if (!n.readAt) {
      this.api.markRead(n._id).subscribe({
        next: (updated) => this.applyLocalRead(updated),
        error: () => this.applyLocalRead({ ...n, readAt: new Date().toISOString() }),
      });
    }
    this.close();
    const url = n.action?.url;
    if (!url) return;
    if (url.startsWith('/')) {
      void this.router.navigateByUrl(url);
    } else {
      window.open(url, '_blank', 'noopener');
    }
  }

  markAllRead(): void {
    if (!this.hasUnread()) return;
    this.api.markAllRead().subscribe({
      next: () => {
        this.notifications.update((arr) =>
          arr.map((n) => (n.readAt ? n : { ...n, readAt: new Date().toISOString() })),
        );
        this.unread.set(0);
      },
    });
  }

  /** Replace the in-memory record so the dot disappears immediately. */
  private applyLocalRead(updated: NotificationRecord): void {
    this.notifications.update((arr) =>
      arr.map((n) => (n._id === updated._id ? updated : n)),
    );
    if (this.unread() > 0) this.unread.update((c) => c - 1);
  }

  // -- View helpers ----------------------------------------------------------

  iconFor(type: NotificationType): string {
    switch (type) {
      case 'TASK_ASSIGNED':  return 'pi-user-plus';
      case 'TASK_COMMENT':   return 'pi-comment';
      case 'DEPLOY_READY':   return 'pi-check-circle';
      case 'DEPLOY_FAILED':  return 'pi-exclamation-triangle';
      case 'INVITATION':     return 'pi-envelope';
      case 'SYSTEM':
      default:               return 'pi-bell';
    }
  }

  toneFor(type: NotificationType): string {
    switch (type) {
      case 'DEPLOY_READY':  return 'success';
      case 'DEPLOY_FAILED': return 'danger';
      case 'TASK_ASSIGNED': return 'info';
      case 'TASK_COMMENT':  return 'info';
      default:              return 'muted';
    }
  }

  relativeTime(iso: string): string {
    const diff = Date.now() - new Date(iso).getTime();
    const m = Math.floor(diff / 60000);
    if (m < 1) return 'ahora';
    if (m < 60) return `hace ${m} min`;
    const h = Math.floor(m / 60);
    if (h < 24) return `hace ${h} h`;
    const d = Math.floor(h / 24);
    return `hace ${d} d`;
  }
}
