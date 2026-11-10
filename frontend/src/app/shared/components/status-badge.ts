import { Component, computed, input } from '@angular/core';
import { ExpenseStatus, STATUS_LABELS } from '../../core/models/models';

/** Coloured pill for an expense status: <app-status-badge [status]="row.status" /> */
@Component({
  selector: 'app-status-badge',
  template: `<span class="badge" [class]="'badge badge--' + status()">{{ label() }}</span>`,
})
export class StatusBadge {
  readonly status = input.required<ExpenseStatus>();
  readonly label = computed(() => STATUS_LABELS[this.status()]);
}
