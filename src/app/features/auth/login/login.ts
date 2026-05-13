import { CommonModule } from '@angular/common';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { TPipe } from '../../../core/i18n/t.pipe';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'dp-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, RouterLink, TPipe],
  templateUrl: './login.html',
  styleUrl: '../auth-shell.scss',
})
export class LoginComponent {
  private readonly fb = inject(FormBuilder);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  protected readonly submitting = signal(false);
  protected readonly errorMsg = signal<string | null>(null);

  protected readonly form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  submit(): void {
    if (this.form.invalid || this.submitting()) {
      this.form.markAllAsTouched();
      return;
    }
    this.submitting.set(true);
    this.errorMsg.set(null);

    this.auth.login(this.form.getRawValue()).subscribe({
      next: () => {
        this.submitting.set(false);
        void this.router.navigate(['/app/dashboard']);
      },
      error: (err) => {
        this.submitting.set(false);
        const msg =
          err?.error?.error?.message ??
          'No fue posible iniciar sesión. La autenticación se conectará en la Fase 2.';
        this.errorMsg.set(msg);
      },
    });
  }
}
