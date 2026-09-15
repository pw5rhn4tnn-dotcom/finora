import { AuthBoundary } from './features/auth/AuthBoundary';
import { AuthPage } from './pages/AuthPage';
import { TransactionsPage } from './pages/TransactionsPage';
import { CategoriesPage } from './pages/CategoriesPage';
import { BudgetsPage } from './pages/BudgetsPage';
import { RecurringPage } from './pages/RecurringPage';
import { SettingsPage } from './pages/SettingsPage';
import { ImportPage } from './pages/ImportPage';
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
          <Route path="/transactions" element={<TransactionsPage />} />
          <Route path="/categories" element={<CategoriesPage />} />
          <Route path="/budgets" element={<BudgetsPage />} />
          <Route path="/recurring" element={<RecurringPage />} />
          <Route path="/settings" element={<SettingsPage />} />
          <Route index element={<OverviewPage />} />
          {navigation
            .filter(
              (item) =>
                ![
                  '/',
                  '/settings',
                  '/transactions',
                  '/categories',
                  '/budgets',
                  '/recurring',
                ].includes(item.to),
            )
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
          <Route path="/transactions/import" element={<ImportPage />} />
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
