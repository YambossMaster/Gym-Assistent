import { createContext, useContext, type ReactNode } from 'react'
import type { WorkspaceSettings } from '../../api'

const FinanceCurrencyContext = createContext<WorkspaceSettings['defaultCurrency']>('TWD')

export function FinanceCurrencyProvider({
  currency,
  children
}: {
  currency: WorkspaceSettings['defaultCurrency']
  children: ReactNode
}) {
  return (
    <FinanceCurrencyContext.Provider value={currency}>{children}</FinanceCurrencyContext.Provider>
  )
}

export function useDefaultFinanceCurrency() {
  return useContext(FinanceCurrencyContext)
}
