import { AuthBoundary } from './features/auth/AuthBoundary';
import { AuthPage } from './pages/AuthPage';
import { SettingsPage } from './pages/SettingsPage';
import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router';
import { AppShell } from './app/AppShell';
import { navigation } from './app/navigation-config';
import { OverviewPage, NotFoundPage } from './pages/OverviewPage';
import { PlaceholderPage } from './pages/PlaceholderPage';
import { LoadingState } from './shared/ui/States';

const DesignSystemPage = import.meta.env.DEV
  ? lazy(() => import('./pages/DesignSystemPage'))
  : null;

export function App() {
  return (
    <Routes>
      <Route path="/login" element={<AuthPage key="login" mode="login" />} />
      <Route
        path="/register"
        element={<AuthPage key="register" mode="register" />}
      />
      <Route element={<AuthBoundary />}>
        <Route element={<AppShell />}>
          <Route path="/settings" element={<SettingsPage />} />
          <Route index element={<OverviewPage />} />
          {navigation
            .filter((item) => item.to !== '/' && item.to !== '/settings')
            .map((item) => (
              <Route
                key={item.to}
                path={item.to}
                element={
                  <PlaceholderPage
                    title={item.label}
                    description={item.description}
                  />
                }
              />
            ))}
          <Route
            path="/transactions/import"
            element={
              <PlaceholderPage
                title="Импорт CSV"
                description="Перенос истории операций из файла."
              />
            }
          />
          {DesignSystemPage && (
            <Route
              path="/design-system"
              element={
                <Suspense fallback={<LoadingState />}>
                  <DesignSystemPage />
                </Suspense>
              }
            />
          )}
          <Route path="*" element={<NotFoundPage />} />
        </Route>
      </Route>
    </Routes>
  );
}
