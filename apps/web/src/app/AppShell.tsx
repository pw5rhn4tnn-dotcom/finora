import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import {
  SessionControls,
  SessionFeedback,
} from '../features/auth/SessionControls';
import { Brand } from './Brand';
import { MobileNavigation, Sidebar } from './Navigation';
import { navigation } from './navigation-config';

export function AppShell() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
  const scrollBody = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const current = navigation.find((item) => item.to === location.pathname);
    const title =
      current?.label ??
      (location.pathname === '/transactions/import'
        ? 'Импорт CSV'
        : location.pathname === '/design-system' && import.meta.env.DEV
          ? 'Компоненты интерфейса'
          : 'Страница не найдена');
    document.title = `${title} — Finora`;
    if (previousPath.current !== location.pathname || location.state) {
      document.getElementById('main-content')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
      if (scrollBody.current) scrollBody.current.scrollTop = 0;
      previousPath.current = location.pathname;
    }
  }, [location.pathname, location.state]);
  return (
    <div className="app-shell">
      <Sidebar />
      <div className="shell-body" ref={scrollBody}>
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <Brand />
          </div>
          <p className="topbar__desktop-label">Личное пространство</p>
          <SessionControls />
        </header>
        <main id="main-content" tabIndex={-1}>
          <SessionFeedback />
          <Outlet />
        </main>
        <footer className="shell-footer">
          <span>Finora · Личные финансы</span>
          {import.meta.env.DEV && (
            <Link to="/design-system">Компоненты интерфейса</Link>
          )}
        </footer>
      </div>
      <MobileNavigation />
    </div>
  );
}
