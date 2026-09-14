import { AuthContext, sessionKey, removeUserData } from './auth-context';
import { useEffect, type ReactNode } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { UserDto } from '@finora/api-client';
import { currentUser } from '../../shared/api/client';

export function AuthProvider({ children }: { children: ReactNode }) {
  const client = useQueryClient();
  const session = useQuery({
    queryKey: sessionKey,
    queryFn: async ({ signal }) => {
      const user = await currentUser(signal);
      const previous = client.getQueryData<UserDto | null>(sessionKey);
      if (previous?.id !== user?.id) {
        await client.cancelQueries({
          predicate: (query) => query.queryKey[0] !== 'session',
        });
        removeUserData(client);
      }
      return user;
    },
    retry: false,
    staleTime: 0,
    refetchOnWindowFocus: 'always',
  });
  // После размонтирования защищённого дерева убираем queries, которые его
  // observers успели пересоздать между cancelQueries и заменой сессии.
  useEffect(() => {
    if (session.data === null)
      client.removeQueries({
        predicate: (query) =>
          query.queryKey[0] !== 'session' &&
          query.queryKey[0] !== 'preference-options',
      });
  }, [client, session.data]);
  return <AuthContext value={session}>{children}</AuthContext>;
}
