import { CommonModule } from '@angular/common';
import { Component, HostListener, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { AuthStateService } from '../../auth/auth-state.service';
import { AuthService } from '../../auth/auth.service';

@Component({
  selector: 'dp-user-menu',
  standalone: true,
  imports: [CommonModule],
  template: `
    <div class="dp-user-menu" [attr.data-tour]="'user-menu'">
      <button type="button" class="dp-user-menu__trigger" (click)="toggle()" aria-haspopup="true">
        <div class="dp-user-menu__avatar">
          @if (auth.user()?.avatarUrl) {
            <img [src]="auth.user()!.avatarUrl!" alt="" />
          } @else {
            <span>{{ initial() }}</span>
          }
        </div>
        <div class="dp-user-menu__text">
          <div class="dp-user-menu__name">{{ auth.user()?.name ?? 'Invitado' }}</div>
          <div class="dp-user-menu__email">
            {{ auth.user()?.email ?? 'No has iniciado sesión' }}
          </div>
        </div>
        <i class="pi pi-angle-down dp-user-menu__chevron" aria-hidden="true"></i>
      </button>

      @if (open()) {
        <div class="dp-user-menu__pop" role="menu">
          <button class="dp-user-menu__item" (click)="logout()">
            <i class="pi pi-sign-out"></i>
            <span>Cerrar sesión</span>
          </button>
        </div>
      }
    </div>
  `,
  styles: [
    `
      .dp-user-menu { position: relative; }
      .dp-user-menu__trigger {
        display: flex; align-items: center; gap: 0.6rem;
        padding: 0.4rem 0.55rem;
        border-radius: var(--dp-radius-md);
        background: var(--dp-surface-2);
        border: 1px solid var(--dp-border);
        transition: border-color 120ms ease;
        text-align: left;
        &:hover { border-color: color-mix(in srgb, var(--dp-text-muted) 35%, var(--dp-border)); }
      }
      .dp-user-menu__avatar {
        width: 30px; height: 30px;
        border-radius: 50%;
        background: linear-gradient(135deg, #3B82F6, #8B5CF6);
        color: white; font-weight: 700; font-size: 12px;
        display: grid; place-items: center; overflow: hidden;
        img { width: 100%; height: 100%; object-fit: cover; }
      }
      .dp-user-menu__text { line-height: 1.2; }
      .dp-user-menu__name {
        color: var(--dp-text); font-size: 12.5px; font-weight: 600;
        max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .dp-user-menu__email {
        color: var(--dp-text-muted); font-size: 11.5px;
        max-width: 130px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
      }
      .dp-user-menu__chevron { color: var(--dp-text-muted); font-size: 11px; }
      .dp-user-menu__pop {
        position: absolute; top: calc(100% + 6px); right: 0; min-width: 180px;
        background: var(--dp-surface);
        border: 1px solid var(--dp-border);
        border-radius: var(--dp-radius-md);
        padding: 4px;
        box-shadow: var(--dp-shadow-md);
        z-index: 50;
      }
      .dp-user-menu__item {
        display: flex; align-items: center; gap: 0.5rem;
        width: 100%; padding: 0.5rem 0.6rem;
        border-radius: var(--dp-radius-sm);
        color: var(--dp-text); font-size: 13px;
        &:hover { background: var(--dp-surface-2); }
        i { font-size: 12.5px; }
      }
    `,
  ],
})
export class UserMenuComponent {
  protected readonly auth = inject(AuthStateService);
  private readonly authService = inject(AuthService);
  private readonly router = inject(Router);
  protected readonly open = signal(false);

  initial(): string {
    const name = this.auth.user()?.name?.trim();
    return name ? name.charAt(0).toUpperCase() : '?';
  }

  toggle(): void {
    this.open.update((v) => !v);
  }

  close(): void {
    this.open.set(false);
  }

  /** Close when clicking anywhere outside the menu (matches notification-bell). */
  @HostListener('document:click', ['$event'])
  onDocClick(e: MouseEvent): void {
    if (!this.open()) return;
    const target = e.target as HTMLElement | null;
    if (!target?.closest('.dp-user-menu')) this.close();
  }

  /** Close on Escape for keyboard users. */
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.open()) this.close();
  }

  logout(): void {
    this.close();
    this.authService.logout().subscribe({
      complete: () => void this.router.navigate(['/auth/login']),
    });
  }
}
