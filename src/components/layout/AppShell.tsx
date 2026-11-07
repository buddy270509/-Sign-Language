/**
 * App shell: skip link, header navigation (desktop), bottom tab bar (mobile),
 * safety notice and footer. Mobile-first, large touch targets, no flashing.
 */
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { Icon, type IconName } from '../ui/Icon';
import { useSettings } from '../../store/settings';
import type { MessageKey } from '../../i18n/strings';

interface NavItem {
  to: string;
  labelKey: MessageKey;
  icon: IconName;
}

const NAV: NavItem[] = [
  { to: '/', labelKey: 'nav.home', icon: 'home' },
  { to: '/text-to-sign', labelKey: 'nav.textToSign', icon: 'hand' },
  { to: '/camera', labelKey: 'nav.camera', icon: 'camera' },
  { to: '/settings', labelKey: 'nav.settings', icon: 'settings' },
];

function Logo() {
  return (
    <span className="flex items-center gap-2.5">
      <span className="grid h-10 w-10 place-items-center rounded-xl bg-brand text-[color:var(--sb-brand-ink)]">
        <Icon name="hand" className="h-6 w-6" />
      </span>
      <span className="text-lg font-extrabold tracking-tight">SignBridge</span>
    </span>
  );
}

export function AppShell() {
  const { t } = useSettings();
  const location = useLocation();

  return (
    <div className="flex min-h-dvh flex-col bg-canvas">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-xl focus:bg-brand focus:px-4 focus:py-3 focus:text-[color:var(--sb-brand-ink)] focus:font-bold"
      >
        {t('common.skipToContent')}
      </a>

      <header className="sticky top-0 z-30 border-b border-line bg-surface/95 backdrop-blur">
        <div className="mx-auto flex h-16 w-full max-w-6xl items-center justify-between px-4">
          <NavLink to="/" className="rounded-lg" aria-label="SignBridge home">
            <Logo />
          </NavLink>

          <nav aria-label="Main" className="hidden items-center gap-1 sm:flex">
            {NAV.map((item) => {
              const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={`flex min-h-11 items-center gap-2 rounded-xl px-3.5 text-sm font-semibold transition-colors ${
                    active ? 'bg-brand-soft text-brand' : 'text-ink-soft hover:bg-surface-2 hover:text-ink'
                  }`}
                  aria-current={active ? 'page' : undefined}
                >
                  <Icon name={item.icon} className="h-[18px] w-[18px]" />
                  {t(item.labelKey)}
                </NavLink>
              );
            })}
          </nav>

          <span className="chip hidden md:inline-flex" title="Phase 1 build">
            Phase 1
          </span>
        </div>
      </header>

      <main id="main" className="mx-auto w-full max-w-6xl flex-1 px-4 pt-5 pb-28 sm:pb-10">
        <Outlet />
      </main>

      <footer className="mx-auto hidden w-full max-w-6xl px-4 pb-8 text-sm text-ink-soft sm:block">
        <p className="card-flat flex items-start gap-3 text-pretty">
          <Icon name="warning" className="mt-0.5 h-5 w-5 shrink-0 text-accent" />
          <span>{t('disclaimer.short')}</span>
        </p>
      </footer>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Main"
        className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-surface pb-[env(safe-area-inset-bottom)] sm:hidden"
      >
        <ul className="grid grid-cols-4">
          {NAV.map((item) => {
            const active = item.to === '/' ? location.pathname === '/' : location.pathname.startsWith(item.to);
            return (
              <li key={item.to}>
                <NavLink
                  to={item.to}
                  aria-current={active ? 'page' : undefined}
                  className={`flex min-h-16 flex-col items-center justify-center gap-1 px-1 py-2 text-xs font-semibold ${
                    active ? 'text-brand' : 'text-ink-soft'
                  }`}
                >
                  <Icon name={item.icon} className="h-6 w-6" />
                  <span className="text-center leading-tight">{t(item.labelKey)}</span>
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>
    </div>
  );
}
