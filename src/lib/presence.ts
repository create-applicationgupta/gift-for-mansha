import {
  doc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  type Timestamp,
  type Unsubscribe,
} from 'firebase/firestore'
import type { SiteUser } from '../content/site'
import { getDb, isFirebaseConfigured } from './firebase'

export type PresenceState = {
  online: boolean
  lastSeen: Date | null
}

type PresenceDoc = {
  online?: boolean
  lastSeen?: Timestamp | null
  updatedAt?: Timestamp | null
}

/** Still count as online if a heartbeat arrived within this window */
const ONLINE_WINDOW_MS = 120_000
const HEARTBEAT_MS = 20_000
/** Don't drop to offline the instant a tab is backgrounded */
const OFFLINE_DELAY_MS = 45_000

export function getPartner(user: SiteUser): SiteUser {
  return user === 'Mansha' ? 'Tutul' : 'Mansha'
}

function presenceRef(user: SiteUser) {
  const db = getDb()
  if (!db) return null
  return doc(db, 'presence', user)
}

export async function setPresence(user: SiteUser, online: boolean): Promise<void> {
  const ref = presenceRef(user)
  if (!ref || !isFirebaseConfigured()) return

  try {
    await setDoc(
      ref,
      online
        ? {
            online: true,
            lastSeen: serverTimestamp(),
            updatedAt: serverTimestamp(),
          }
        : {
            online: false,
            // Keep lastSeen at the last active moment — only flip the flag.
            updatedAt: serverTimestamp(),
          },
      { merge: true },
    )
  } catch {
    // Presence is best-effort — never block the app.
  }
}

/**
 * Marks the user online, heartbeats while the tab is open,
 * and flips to offline on hide / unload / cleanup.
 */
export function startPresence(user: SiteUser): () => void {
  if (!isFirebaseConfigured()) return () => {}

  let stopped = false
  let heartbeatId = 0
  let offlineTimer = 0

  const goOnline = () => {
    if (stopped) return
    window.clearTimeout(offlineTimer)
    offlineTimer = 0
    void setPresence(user, true)
  }

  const goOffline = (immediate = false) => {
    window.clearTimeout(offlineTimer)
    if (immediate) {
      offlineTimer = 0
      void setPresence(user, false)
      return
    }
    offlineTimer = window.setTimeout(() => {
      if (stopped) return
      if (document.visibilityState === 'hidden') {
        void setPresence(user, false)
      }
    }, OFFLINE_DELAY_MS)
  }

  const beat = () => {
    if (stopped) return
    if (document.visibilityState === 'hidden') return
    void setPresence(user, true)
  }

  goOnline()
  heartbeatId = window.setInterval(beat, HEARTBEAT_MS)

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      goOffline(false)
    } else {
      goOnline()
    }
  }

  function onPageHide() {
    goOffline(true)
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)

  return () => {
    stopped = true
    window.clearInterval(heartbeatId)
    window.clearTimeout(offlineTimer)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onPageHide)
    void setPresence(user, false)
  }
}

function resolvePresence(data: PresenceDoc): PresenceState {
  const lastSeen = data.lastSeen?.toDate?.() ?? null
  const pulseAt = data.updatedAt?.toDate?.() ?? lastSeen
  const recentlyActive =
    pulseAt !== null && Date.now() - pulseAt.getTime() < ONLINE_WINDOW_MS

  // online flag from heartbeat, still fresh
  if (Boolean(data.online) && recentlyActive) {
    return { online: true, lastSeen }
  }

  // Fresh lastSeen means they were actively heartbeating very recently
  // (covers brief flag races while both are logged in)
  if (
    lastSeen !== null &&
    Date.now() - lastSeen.getTime() < HEARTBEAT_MS * 2.5
  ) {
    return { online: true, lastSeen }
  }

  return { online: false, lastSeen }
}

export function subscribePresence(
  user: SiteUser,
  onChange: (state: PresenceState) => void,
): Unsubscribe {
  const ref = presenceRef(user)
  if (!ref || !isFirebaseConfigured()) {
    onChange({ online: false, lastSeen: null })
    return () => {}
  }

  let latest: PresenceDoc | null = null

  const emit = () => {
    if (!latest) {
      onChange({ online: false, lastSeen: null })
      return
    }
    onChange(resolvePresence(latest))
  }

  const unsub = onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        latest = null
        onChange({ online: false, lastSeen: null })
        return
      }
      latest = snap.data() as PresenceDoc
      emit()
    },
    () => {
      latest = null
      onChange({ online: false, lastSeen: null })
    },
  )

  // Re-evaluate online window even if Firestore doc hasn't changed
  const tickId = window.setInterval(emit, 15_000)

  return () => {
    window.clearInterval(tickId)
    unsub()
  }
}

export function formatLastSeen(state: PresenceState): string {
  if (state.online) return 'online'
  if (!state.lastSeen) return 'last seen a while ago'

  const last = state.lastSeen
  const now = new Date()
  const time = last.toLocaleTimeString(undefined, {
    hour: 'numeric',
    minute: '2-digit',
  })

  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const startOfYesterday = new Date(startOfToday)
  startOfYesterday.setDate(startOfYesterday.getDate() - 1)

  if (last >= startOfToday) {
    return `last seen today at ${time}`
  }
  if (last >= startOfYesterday) {
    return `last seen yesterday at ${time}`
  }

  const date = last.toLocaleDateString(undefined, {
    day: 'numeric',
    month: 'short',
    year: last.getFullYear() === now.getFullYear() ? undefined : 'numeric',
  })
  return `last seen ${date} at ${time}`
}
