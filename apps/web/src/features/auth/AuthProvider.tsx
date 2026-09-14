import { AuthContext, sessionKey, removeUserData } from './auth-context';
import { type ReactNode } from 'react';
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
  return <AuthContext value={session}>{children}</AuthContext>;
}
