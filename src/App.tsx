import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ChallengeGate } from './components/ChallengeGate'
import { Layout } from './components/Layout'
import { PasswordGate } from './components/PasswordGate'
import { site, type SiteUser } from './content/site'
import { AuthContext } from './lib/auth'
import {
  clearSession,
  ensureSession,
  getSessionUser,
  isSessionExpired,
  startSession,
} from './lib/session'
import { Home } from './pages/Home'
import { Notes } from './pages/Notes'
import { Photos } from './pages/Photos'

function isPasswordOk(): boolean {
  return sessionStorage.getItem(site.authStorageKey) === '1'
}

function isChallengeOk(): boolean {
  return sessionStorage.getItem(site.challengeStorageKey) === '1'
}

function readInitialAuth() {
  const user = getSessionUser()
  if (!isPasswordOk() || !user) {
    if (isPasswordOk() && !user) clearSession()
    return {
      passwordOk: false,
      challengeOk: false,
      user: null as SiteUser | null,
    }
  }
  if (!isChallengeOk()) {
    return { passwordOk: true, challengeOk: false, user }
  }
  if (isSessionExpired()) {
    clearSession()
    return { passwordOk: false, challengeOk: false, user: null }
  }
  return { passwordOk: true, challengeOk: true, user }
}

export default function App() {
  const initial = readInitialAuth()
  const [passwordOk, setPasswordOk] = useState(initial.passwordOk)
  const [challengeOk, setChallengeOk] = useState(initial.challengeOk)
  const [user, setUser] = useState<SiteUser | null>(initial.user)

  const fullyUnlocked = passwordOk && challengeOk && user !== null

  const logout = useCallback(() => {
    clearSession()
    setChallengeOk(false)
    setPasswordOk(false)
    setUser(null)
  }, [])

  useEffect(() => {
    document.title = fullyUnlocked
      ? site.brand
      : `${site.seoPhrase} — ${site.gateBrand}`
  }, [fullyUnlocked])

  useEffect(() => {
    if (!fullyUnlocked) return

    if (isSessionExpired()) {
      logout()
      return
    }

    const expiresAt = ensureSession()
    const remaining = Math.max(0, expiresAt - Date.now())
    const timer = window.setTimeout(() => {
      logout()
    }, remaining)

    return () => window.clearTimeout(timer)
  }, [fullyUnlocked, logout])

  const handleChallengeFail = useCallback(() => {
    clearSession()
    setChallengeOk(false)
    setPasswordOk(false)
    setUser(null)
  }, [])

  const authValue = useMemo(
    () =>
      user
        ? {
            logout,
            user,
            canDeleteNotes: user === site.yourName,
          }
        : null,
    [logout, user],
  )

  if (!passwordOk || !user) {
    return (
      <PasswordGate
        onUnlock={(nextUser) => {
          setUser(nextUser)
          setPasswordOk(true)
          const challengeReady = isChallengeOk() && !isSessionExpired()
          setChallengeOk(challengeReady)
        }}
      />
    )
  }

  if (!challengeOk) {
    return (
      <ChallengeGate
        onPass={() => {
          startSession()
          setChallengeOk(true)
        }}
        onFail={handleChallengeFail}
      />
    )
  }

  if (!authValue) return null

  return (
    <AuthContext.Provider value={authValue}>
      <BrowserRouter>
        <Layout>
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/photos" element={<Photos />} />
            <Route path="/notes" element={<Notes />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </BrowserRouter>
    </AuthContext.Provider>
  )
}
