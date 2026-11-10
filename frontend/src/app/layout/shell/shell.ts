import { BreakpointObserver } from '@angular/cdk/layout';
import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatListModule } from '@angular/material/list';
import { MatMenuModule } from '@angular/material/menu';
import { MatSidenavModule } from '@angular/material/sidenav';
import { MatToolbarModule } from '@angular/material/toolbar';
import { RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import { map } from 'rxjs';
import { AuthService } from '../../core/auth/auth.service';

interface NavItem {
  label: string;
  icon: string;
  link: string;
}

/**
 * The app frame for logged-in users: top toolbar + sidebar + page area.
 * The sidebar menu is chosen from the user's role. On small screens the sidebar
 * becomes a slide-over drawer opened by the menu button.
 */
@Component({
  selector: 'app-shell',
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    MatSidenavModule,
    MatToolbarModule,
    MatListModule,
    MatIconModule,
    MatButtonModule,
    MatMenuModule,
  ],
  templateUrl: './shell.html',
})
export class Shell {
  private readonly auth = inject(AuthService);

  readonly user = this.auth.currentUser;

  readonly isMobile = toSignal(
    inject(BreakpointObserver).observe('(max-width: 960px)').pipe(map((r) => r.matches)),
    { initialValue: false },
  );

  readonly initials = computed(() =>
    (this.user()?.fullName ?? '?')
      .split(' ')
      .map((part) => part[0])
      .slice(0, 2)
      .join('')
      .toUpperCase(),
  );

  readonly navItems = computed<NavItem[]>(() => [
    { label: 'Dashboard', icon: 'dashboard', link: '/manager/dashboard' },
    { label: 'Pending approvals', icon: 'pending_actions', link: '/manager/pending' },
    { label: 'My team', icon: 'people', link: '/manager/my-team' },
    { label: 'Team expenses', icon: 'groups', link: '/manager/team' },
    { label: 'My decisions', icon: 'history', link: '/manager/history' },
    { label: 'Profile', icon: 'person', link: '/profile' },
  ]);

  logout(): void {
    this.auth.logout();
  }
}
