import { Pipe, PipeTransform, inject } from '@angular/core';
import { TranslationService } from './translation.service';
import { LanguageService } from './language.service';

/**
 * Usage in templates:  {{ 'nav.projects' | t }}
 *
 * The pipe is "impure" via reading two signals (current language + dictionary)
 * inside transform — Angular re-runs it when their values change.
 */
@Pipe({ name: 't', standalone: true, pure: false })
export class TPipe implements PipeTransform {
  private readonly tr = inject(TranslationService);
  private readonly lang = inject(LanguageService);

  transform(key: string): string {
    // Read the language signal to make the pipe reactive to language changes.
    void this.lang.current();
    return this.tr.t(key);
  }
}
