import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import {
  AfterViewChecked,
  Component,
  ElementRef,
  HostListener,
  ViewChild,
  effect,
  inject,
} from '@angular/core';
import { AssistantService } from '../assistant.service';
import type { AssistantMessage, QuickReply } from '../assistant.types';

@Component({
  selector: 'dp-assistant-widget',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './assistant-widget.html',
  styleUrl: './assistant-widget.scss',
})
export class AssistantWidgetComponent implements AfterViewChecked {
  protected readonly assistant = inject(AssistantService);
  private readonly fb = inject(FormBuilder);

  /** Track length to know when to auto-scroll the messages list. */
  private lastMessageCount = 0;

  @ViewChild('scrollArea') scrollArea?: ElementRef<HTMLElement>;

  protected readonly form = this.fb.nonNullable.group({
    text: ['', [Validators.required, Validators.minLength(1), Validators.maxLength(500)]],
  });

  constructor() {
    // Pulse the avatar once per session for first-time users — without
    // opening the panel (less aggressive than the tutorial auto-start).
    setTimeout(() => this.assistant.nudge(), 1500);

    // Whenever a new message lands, ensure the list scrolls into view on
    // the next checked frame.
    effect(() => {
      this.assistant.messages();
    });
  }

  ngAfterViewChecked(): void {
    const messages = this.assistant.messages();
    if (messages.length !== this.lastMessageCount) {
      this.lastMessageCount = messages.length;
      const el = this.scrollArea?.nativeElement;
      if (el) el.scrollTop = el.scrollHeight;
    }
  }

  submit(): void {
    if (this.form.invalid) return;
    const text = this.form.controls.text.value;
    this.form.reset({ text: '' });
    this.assistant.ask(text);
  }

  runQuickReply(reply: QuickReply): void {
    this.assistant.runAction(reply.action);
  }

  trackMessage(_idx: number, m: AssistantMessage): string {
    return m.id;
  }

  trackReply(_idx: number, r: QuickReply): string {
    return r.label;
  }

  /** Allow ESC to close the panel for keyboard users. */
  @HostListener('document:keydown.escape')
  onEsc(): void {
    if (this.assistant.open()) this.assistant.close();
  }
}
