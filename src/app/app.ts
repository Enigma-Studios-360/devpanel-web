import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { TutorialOverlayComponent } from './core/tutorial/tutorial-overlay/tutorial-overlay';
import { AssistantWidgetComponent } from './core/assistant/assistant-widget/assistant-widget';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, TutorialOverlayComponent, AssistantWidgetComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App {
  protected readonly title = signal('devpanel-web');
}
