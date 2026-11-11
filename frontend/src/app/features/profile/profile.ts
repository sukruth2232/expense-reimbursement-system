import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/auth/auth.service';
import { CurrentUser } from '../../core/models/models';
import { PageHeader } from '../../shared/components/page-header';

/** Profile / user information. Loads fresh data from GET /api/auth/me. */
@Component({
  selector: 'app-profile',
  imports: [MatCardModule, MatIconModule, PageHeader],
  template: `
    <app-page-header title="Profile" subtitle="Your account details" />
    @if (user(); as u) {
      <mat-card appearance="outlined" class="narrow-card">
        <mat-card-content>
          <dl class="field-list">
            <dt>Name</dt>
            <dd>{{ u.fullName }}</dd>
            <dt>Email</dt>
            <dd>{{ u.email }}</dd>
            <dt>Role</dt>
            <dd>{{ u.role }}</dd>
            <dt>Manager</dt>
            <dd>{{ u.managerName || '—' }}</dd>
            <dt>User ID</dt>
            <dd>{{ u.userId }}</dd>
          </dl>
        </mat-card-content>
      </mat-card>
    }
  `,
})
export class Profile {
  readonly user = signal<CurrentUser | null>(null);

  constructor() {
    inject(AuthService)
      .me()
      .subscribe((u) => this.user.set(u));
  }
}
