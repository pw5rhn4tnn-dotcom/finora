import { createContext, useContext } from 'react';
import type { QueryClient, UseQueryResult } from '@tanstack/react-query';
import type { UserDto } from '@finora/api-client';
export const sessionKey = ['session'] as const;
export const AuthContext = createContext<UseQueryResult<UserDto | null> | null>(
  null,
);
export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error('Отсутствует AuthProvider');
  return value;
}

export function removeUserData(client: QueryClient) {
  client.removeQueries({
    predicate: (query) => query.queryKey[0] !== 'session',
  });
  client.getMutationCache().clear();
}
export async function replaceSession(
  client: QueryClient,
  user: UserDto | null,
) {
  await client.cancelQueries();
  removeUserData(client);
  // Сохраняем observer текущей сессии, заменяя её значение атомарно.
  client.setQueryData(sessionKey, user);
}
