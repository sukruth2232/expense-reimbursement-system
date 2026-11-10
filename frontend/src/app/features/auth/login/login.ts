import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

/**
 * Login screen.
 * Flow: form -> AuthService.login() -> POST /api/auth/login -> token saved -> go to role's dashboard.
 * A wrong password returns 401, which the error interceptor shows as a toast.
 */
@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, MatFormFieldModule, MatInputModule, MatButtonModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './login.html',
})
export class Login {
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);

  readonly loading = signal(false);
  readonly hidePassword = signal(true);

  readonly form = inject(FormBuilder).nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    this.auth.login(this.form.getRawValue()).subscribe({
      next: (response) => {
        if (response.user.role !== 'Manager') {
          this.auth.logout();
          this.loading.set(false);
          return;
        }
        this.router.navigateByUrl(this.auth.homeRoute());
      },
      error: () => this.loading.set(false),
    });
  }

  /** Demo helper: fills the form with a seeded account. */
  useDemo(email: string): void {
    this.form.patchValue({ email, password: 'Password@123' });
  }
}
