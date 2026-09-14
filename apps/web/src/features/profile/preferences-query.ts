import { useQuery } from '@tanstack/react-query';
import { preferenceOptions } from '../../shared/api/client';
export function usePreferenceOptions(enabled = true) {
  return useQuery({
    queryKey: ['preference-options'],
    queryFn: ({ signal }) => preferenceOptions(signal),
    staleTime: Infinity,
    retry: false,
    enabled,
  });
}
