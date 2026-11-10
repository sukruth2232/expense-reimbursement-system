import { Component, input } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';

/** Friendly message shown when a list has no rows. */
@Component({
  selector: 'app-empty-state',
  imports: [MatIconModule],
  template: `
    <div class="empty-state">
      <mat-icon>{{ icon() }}</mat-icon>
      <p class="empty-state__title">{{ title() }}</p>
      @if (message()) {
        <p class="empty-state__message">{{ message() }}</p>
      }
      <ng-content />
    </div>
  `,
})
export class EmptyState {
  readonly icon = input('inbox');
  readonly title = input.required<string>();
  readonly message = input<string>('');
}
