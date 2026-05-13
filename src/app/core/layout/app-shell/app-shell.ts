import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { SidebarComponent } from '../sidebar/sidebar';
import { TopbarComponent } from '../topbar/topbar';

@Component({
  selector: 'dp-app-shell',
  standalone: true,
  imports: [CommonModule, RouterOutlet, SidebarComponent, TopbarComponent],
  template: `
    <div class="dp-shell">
      <dp-sidebar></dp-sidebar>
      <div class="dp-shell__main">
        <dp-topbar></dp-topbar>
        <main class="dp-shell__content">
          <router-outlet></router-outlet>
        </main>
      </div>
    </div>
  `,
  styles: [
    `
      .dp-shell {
        display: flex;
        min-height: 100vh;
        background: var(--dp-bg);
      }
      .dp-shell__main {
        flex: 1;
        display: flex;
        flex-direction: column;
        min-width: 0;
      }
      .dp-shell__content {
        padding: 1.75rem 2rem 3rem;
        flex: 1;
      }
    `,
  ],
})
export class AppShellComponent {}
