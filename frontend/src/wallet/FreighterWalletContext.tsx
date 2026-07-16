import type { PropsWithChildren } from 'react'
import { useFreighterWallet } from './useFreighterWallet'
import { FreighterWalletContext } from './useFreighterWalletContext'

export function FreighterWalletProvider({ children }: PropsWithChildren) {
  const wallet = useFreighterWallet()

  return (
    <FreighterWalletContext.Provider value={wallet}>
      {children}
    </FreighterWalletContext.Provider>
  )
}
