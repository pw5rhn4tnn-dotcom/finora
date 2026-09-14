import { useEffect, useRef } from 'react';
import { Link, Outlet, useLocation } from 'react-router';
import { Badge } from '../shared/ui/Surface';
import { Brand } from './Brand';
import { MobileNavigation, Sidebar } from './Navigation';
import { navigation } from './navigation-config';

export function AppShell() {
  const location = useLocation();
  const previousPath = useRef(location.pathname);
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
    if (previousPath.current !== location.pathname) {
      document.getElementById('main-content')?.focus();
      window.scrollTo({ top: 0, behavior: 'instant' });
      previousPath.current = location.pathname;
    }
  }, [location.pathname]);
  return (
    <div className="app-shell">
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      <Sidebar />
      <div className="shell-body">
        <header className="topbar">
          <div className="topbar__mobile-brand">
            <Brand />
          </div>
          <p className="topbar__desktop-label">Личное пространство</p>
          <Badge tone="primary">Предварительный просмотр</Badge>
        </header>
        <main id="main-content" tabIndex={-1}>
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
