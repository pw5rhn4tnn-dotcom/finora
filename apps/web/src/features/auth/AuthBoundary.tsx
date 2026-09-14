import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '../../shared/ui/Button';
import { LoadingState, ErrorState } from '../../shared/ui/States';
import { safeError } from '../../shared/api/client';
import { useAuth } from './auth-context';

export function AuthBoundary() {
  const session = useAuth();
  const location = useLocation();
  const content = session.isPending ? (
    <main id="main-content" tabIndex={-1} className="auth-page">
      <LoadingState label="Проверяем сессию…" />
    </main>
  ) : session.isError && !session.data ? (
    <main id="main-content" tabIndex={-1} className="auth-page">
      <ErrorState
        description={safeError(session.error)}
        action={
          <Button onClick={() => void session.refetch()}>Повторить</Button>
        }
      />
    </main>
  ) : !session.data ? (
    <Navigate to="/login" replace state={{ from: location.pathname }} />
  ) : (
    <Outlet />
  );
  return (
    <>
      <a className="skip-link" href="#main-content">
        Перейти к содержимому
      </a>
      {content}
    </>
  );
}
