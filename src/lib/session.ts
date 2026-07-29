import { site } from '../content/site'

export function clearSession() {
  sessionStorage.removeItem(site.authStorageKey)
  sessionStorage.removeItem(site.challengeStorageKey)
  sessionStorage.removeItem(site.sessionExpiresKey)
}

export function startSession() {
  const expiresAt = Date.now() + site.sessionMinutes * 60 * 1000
  sessionStorage.setItem(site.sessionExpiresKey, String(expiresAt))
  return expiresAt
}

export function getSessionExpiresAt(): number | null {
  const raw = sessionStorage.getItem(site.sessionExpiresKey)
  if (!raw) return null
  const value = Number(raw)
  return Number.isFinite(value) ? value : null
}

export function isSessionExpired(): boolean {
  const expiresAt = getSessionExpiresAt()
  if (expiresAt === null) return true
  return Date.now() >= expiresAt
}

export function ensureSession(): number {
  const existing = getSessionExpiresAt()
  if (existing !== null && Date.now() < existing) return existing
  return startSession()
}
