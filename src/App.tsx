import { useCallback, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { ChallengeGate } from './components/ChallengeGate'
import { Layout } from './components/Layout'
import { PasswordGate } from './components/PasswordGate'
import { site } from './content/site'
import { Home } from './pages/Home'
import { Notes } from './pages/Notes'
import { Photos } from './pages/Photos'

function isPasswordOk(): boolean {
  return sessionStorage.getItem(site.authStorageKey) === '1'
}

function isChallengeOk(): boolean {
  return sessionStorage.getItem(site.challengeStorageKey) === '1'
}

export default function App() {
  const [passwordOk, setPasswordOk] = useState(isPasswordOk)
  const [challengeOk, setChallengeOk] = useState(isChallengeOk)

  const handleChallengeFail = useCallback(() => {
    sessionStorage.removeItem(site.authStorageKey)
    sessionStorage.removeItem(site.challengeStorageKey)
    setChallengeOk(false)
    setPasswordOk(false)
  }, [])

  if (!passwordOk) {
    return (
      <PasswordGate
        onUnlock={() => {
          setPasswordOk(true)
          setChallengeOk(isChallengeOk())
        }}
      />
    )
  }

  if (!challengeOk) {
    return (
      <ChallengeGate
        onPass={() => setChallengeOk(true)}
        onFail={handleChallengeFail}
      />
    )
  }

  return (
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
  )
}
