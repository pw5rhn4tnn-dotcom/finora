import {
  useIsMutating,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { useNavigate } from 'react-router';
import { logout, safeError } from '../../shared/api/client';
import { Button } from '../../shared/ui/Button';
import { replaceSession, useAuth } from './auth-context';
export function SessionControls() {
  const session = useAuth();
  const client = useQueryClient();
  const navigate = useNavigate();
  const exit = useMutation({
    mutationKey: ['account-write'],
    mutationFn: async () => {
      await client.cancelQueries();
      await logout();
      await replaceSession(client, null);
      await navigate('/login', { replace: true });
    },
    retry: false,
  });
  const pending = useIsMutating({ mutationKey: ['account-write'] }) > 0;
  return (
    <div className="session-controls">
      <span className="session-name">{session.data?.displayName}</span>
      <Button variant="ghost" disabled={pending} onClick={() => exit.mutate()}>
        {exit.isPending ? 'Выходим…' : 'Выйти'}
      </Button>
      {exit.isError && (
        <p role="alert" className="field__error">
          {safeError(exit.error)}
        </p>
      )}
    </div>
  );
}

export function SessionFeedback() {
  const session = useAuth();
  if (session.isError)
    return (
      <div className="session-feedback" role="alert">
        <p>Не удалось обновить сессию. {safeError(session.error)}</p>
        <Button variant="secondary" onClick={() => void session.refetch()}>
          Повторить проверку
        </Button>
      </div>
    );
  if (session.isFetching)
    return (
      <p className="sr-only" role="status">
        Обновляем сессию…
      </p>
    );
  return null;
}
