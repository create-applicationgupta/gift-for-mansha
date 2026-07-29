import { createContext, useContext } from 'react'

type AuthContextValue = {
  logout: () => void
}

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) {
    throw new Error('useAuth must be used inside the unlocked app')
  }
  return value
}
