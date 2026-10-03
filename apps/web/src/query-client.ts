import { QueryClient } from '@tanstack/react-query'
import { isRetryableReadError } from './api'

export function createAppQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 5 * 60_000,
        gcTime: 30 * 60_000,
        refetchOnWindowFocus: false,
        retry: (count, error) => count < 1 && isRetryableReadError(error)
      }
    }
  })
}
