import { useCallback, useEffect, useMemo, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ChallengeGate } from './components/ChallengeGate'
import { Layout } from './components/Layout'
import { PasswordGate } from './components/PasswordGate'
import { site } from './content/site'
import { AuthContext } from './lib/auth'
import {
  clearSession,
  ensureSession,
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
  if (!isPasswordOk() || !isChallengeOk()) {
    return { passwordOk: isPasswordOk(), challengeOk: isChallengeOk() }
  }
  if (isSessionExpired()) {
    clearSession()
    return { passwordOk: false, challengeOk: false }
  }
  return { passwordOk: true, challengeOk: true }
}

export default function App() {
  const initial = readInitialAuth()
  const [passwordOk, setPasswordOk] = useState(initial.passwordOk)
  const [challengeOk, setChallengeOk] = useState(initial.challengeOk)

  const fullyUnlocked = passwordOk && challengeOk

  const logout = useCallback(() => {
    clearSession()
    setChallengeOk(false)
    setPasswordOk(false)
  }, [])

  useEffect(() => {
    document.title = fullyUnlocked ? site.brand : site.gateBrand
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
  }, [])

  const authValue = useMemo(() => ({ logout }), [logout])

  if (!passwordOk) {
    return (
      <PasswordGate
        onUnlock={() => {
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
