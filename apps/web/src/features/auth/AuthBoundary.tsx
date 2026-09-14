import { Navigate, Outlet, useLocation } from 'react-router';
import { Button } from '../../shared/ui/Button';
import { LoadingState, ErrorState } from '../../shared/ui/States';
import { safeError } from '../../shared/api/client';
import { useAuth } from './auth-context';

export function AuthBoundary() {
  const session = useAuth();
  const location = useLocation();
  if (session.isPending)
    return (
      <main className="auth-page">
        <LoadingState label="Проверяем сессию…" />
      </main>
    );
  if (session.isError && !session.data)
    return (
      <main className="auth-page">
        <ErrorState
          description={safeError(session.error)}
          action={
            <Button onClick={() => void session.refetch()}>Повторить</Button>
          }
        />
      </main>
    );
  if (!session.data)
    return <Navigate to="/login" replace state={{ from: location.pathname }} />;
  return <Outlet />;
}
