import { Component, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { TeamMember } from '../../../core/models/models';
import { ApprovalService } from '../../../core/services/approval.service';
import { EmptyState } from '../../../shared/components/empty-state';
import { PageHeader } from '../../../shared/components/page-header';

@Component({
  selector: 'app-my-team',
  imports: [MatCardModule, MatIconModule, MatProgressBarModule, PageHeader, EmptyState],
  template: `
    <app-page-header title="My team" subtitle="Employees who report to you" />

    @if (loading()) {
      <mat-progress-bar mode="indeterminate" />
    }

    @if (members().length > 0) {
      <section class="team-grid" aria-label="Team members">
        @for (member of members(); track member.userId) {
          <mat-card appearance="outlined" class="team-member">
            <mat-card-content>
              <span class="team-member__avatar" aria-hidden="true">{{ initials(member.fullName) }}</span>
              <div>
                <h2>{{ member.fullName }}</h2>
                <p class="muted">Team member</p>
              </div>
            </mat-card-content>
          </mat-card>
        }
      </section>
    } @else if (!loading()) {
      <mat-card appearance="outlined">
        <app-empty-state icon="groups" title="No team members" message="Employees assigned to you will appear here." />
      </mat-card>
    }
  `,
  styles: `
    .team-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(230px, 1fr));
      gap: 16px;
    }
    .team-member mat-card-content {
      display: flex;
      align-items: center;
      gap: 14px;
      min-height: 72px;
    }
    .team-member__avatar {
      display: grid;
      place-items: center;
      width: 44px;
      height: 44px;
      flex: none;
      border-radius: 50%;
      background: var(--mat-sys-secondary-container);
      color: var(--mat-sys-on-secondary-container);
      font-weight: 700;
    }
    h2 { font: var(--mat-sys-title-medium); margin: 0; }
    p { margin: 4px 0 0; }
  `,
})
export class MyTeam {
  readonly members = signal<TeamMember[]>([]);
  readonly loading = signal(true);

  constructor() {
    inject(ApprovalService).getTeamMembers().subscribe({
      next: (members) => {
        this.members.set(members);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  initials(name: string): string {
    return name.split(' ').map((part) => part[0]).slice(0, 2).join('').toUpperCase();
  }
}
