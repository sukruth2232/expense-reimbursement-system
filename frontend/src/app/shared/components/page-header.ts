import { Component, input } from '@angular/core';

/** Page title + optional subtitle, with a slot on the right for action buttons. */
@Component({
  selector: 'app-page-header',
  template: `
    <header class="page-header">
      <div>
        <h1>{{ title() }}</h1>
        @if (subtitle()) {
          <p class="muted">{{ subtitle() }}</p>
        }
      </div>
      <div class="page-header__actions"><ng-content /></div>
    </header>
  `,
})
export class PageHeader {
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
