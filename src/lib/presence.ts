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

const ONLINE_WINDOW_MS = 90_000
const HEARTBEAT_MS = 30_000

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
      {
        online,
        lastSeen: serverTimestamp(),
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

  const beat = () => {
    if (stopped) return
    void setPresence(user, document.visibilityState !== 'hidden')
  }

  beat()
  heartbeatId = window.setInterval(beat, HEARTBEAT_MS)

  function onVisibility() {
    if (document.visibilityState === 'hidden') {
      void setPresence(user, false)
    } else {
      void setPresence(user, true)
    }
  }

  function onPageHide() {
    void setPresence(user, false)
  }

  document.addEventListener('visibilitychange', onVisibility)
  window.addEventListener('pagehide', onPageHide)

  return () => {
    stopped = true
    window.clearInterval(heartbeatId)
    document.removeEventListener('visibilitychange', onVisibility)
    window.removeEventListener('pagehide', onPageHide)
    void setPresence(user, false)
  }
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

  return onSnapshot(
    ref,
    (snap) => {
      if (!snap.exists()) {
        onChange({ online: false, lastSeen: null })
        return
      }

      const data = snap.data() as PresenceDoc
      const lastSeen = data.lastSeen?.toDate?.() ?? data.updatedAt?.toDate?.() ?? null
      const recentlyActive =
        lastSeen !== null && Date.now() - lastSeen.getTime() < ONLINE_WINDOW_MS
      const online = Boolean(data.online) && recentlyActive

      onChange({ online, lastSeen })
    },
    () => {
      onChange({ online: false, lastSeen: null })
    },
  )
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
