import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TopbarComponent } from '../topbar/topbar';
import { StatusBarComponent } from '../status-bar/status-bar';
import { ConfirmDialogComponent } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { CommandPaletteComponent } from '../command-palette/command-palette';

/**
 * Editorial shell: horizontal topbar navigation + centered content column +
 * IDE-style status bar. The old admin-template sidebar is gone on purpose.
 */
@Component({
  selector: 'dp-app-shell',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    RouterOutlet,
    TopbarComponent,
    StatusBarComponent,
    ConfirmDialogComponent,
    CommandPaletteComponent,
  ],
  template: `
    <div class="dp-shell">
      <dp-topbar></dp-topbar>
      <main class="dp-shell__content">
        <router-outlet></router-outlet>
      </main>
      <dp-status-bar></dp-status-bar>
    </div>
    <!-- Singleton confirm dialog. Components request via ConfirmService.ask(). -->
    <dp-confirm-dialog />
    <!-- Global command palette (⌘K). Searches teams/projects/tasks. -->
    <dp-command-palette />
  `,
  styles: [
    `
      .dp-shell {
        display: flex;
        flex-direction: column;
        min-height: 100vh;
        background: var(--dp-bg);
      }
      .dp-shell__content {
        flex: 1;
        width: 100%;
        max-width: 1280px;
        margin: 0 auto;
        /* Bottom padding clears the fixed status bar. */
        padding: 2rem 2.25rem 4.5rem;
      }
      @media (max-width: 640px) {
        .dp-shell__content {
          padding: 1.25rem 1rem 4rem;
        }
      }
    `,
  ],
})
export class AppShellComponent {}
