import { useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import { Layout } from './components/Layout'
import { PasswordGate } from './components/PasswordGate'
import { site } from './content/site'
import { Home } from './pages/Home'
import { Notes } from './pages/Notes'
import { Photos } from './pages/Photos'

function isUnlocked(): boolean {
  return sessionStorage.getItem(site.authStorageKey) === '1'
}

export default function App() {
  const [unlocked, setUnlocked] = useState(isUnlocked)

  if (!unlocked) {
    return <PasswordGate onUnlock={() => setUnlocked(true)} />
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
