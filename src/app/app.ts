import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TutorialOverlayComponent } from './core/tutorial/tutorial-overlay/tutorial-overlay';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TutorialOverlayComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('devpanel-web');
}
