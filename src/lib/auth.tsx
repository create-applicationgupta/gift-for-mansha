import { createContext, useContext } from 'react'
import type { SiteUser } from '../content/site'

type AuthContextValue = {
  logout: () => void
  user: SiteUser
  /** Only Tutul can remove notes */
  canDeleteNotes: boolean
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside the unlocked app')
  }
  return value
}
