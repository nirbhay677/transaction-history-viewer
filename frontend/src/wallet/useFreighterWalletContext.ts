import { createContext, useContext } from 'react'
import type { FreighterWalletState } from './useFreighterWallet'

export const FreighterWalletContext =
  createContext<FreighterWalletState | null>(null)

export function useFreighterWalletContext(): FreighterWalletState {
  const context = useContext(FreighterWalletContext)
  if (!context) {
    throw new Error(
      'useFreighterWalletContext must be used inside FreighterWalletProvider',
    )
  }
  return context
}
