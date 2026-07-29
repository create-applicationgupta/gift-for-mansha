import {
  addDoc,
  collection,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from './firebase'

export type LoveNote = {
  id: string
  author: string
  text: string
  heart: boolean
  createdAt: Date | null
}

type NoteDoc = {
  author: string
  text: string
  heart?: boolean
  createdAt?: Timestamp | null
}

const LOCAL_KEY = 'gift-site-local-notes'

function readLocalNotes(): LoveNote[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LoveNote[]
    return parsed.map((n) => ({
      ...n,
      createdAt: n.createdAt ? new Date(n.createdAt) : null,
    }))
  } catch {
    return []
  }
}

function writeLocalNotes(notes: LoveNote[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(notes))
}

export async function fetchNotes(): Promise<LoveNote[]> {
  const db = getDb()
  if (!db || !isFirebaseConfigured()) {
    return readLocalNotes().sort((a, b) => {
      const ta = a.createdAt?.getTime() ?? 0
      const tb = b.createdAt?.getTime() ?? 0
      return tb - ta
    })
  }

  const q = query(collection(db, 'notes'), orderBy('createdAt', 'desc'))
  const snap = await getDocs(q)
  return snap.docs.map((doc) => {
    const data = doc.data() as NoteDoc
    return {
      id: doc.id,
      author: data.author,
      text: data.text,
      heart: Boolean(data.heart),
      createdAt: data.createdAt?.toDate?.() ?? null,
    }
  })
}

export async function createNote(input: {
  author: string
  text: string
  heart: boolean
}): Promise<LoveNote> {
  const db = getDb()
  if (!db || !isFirebaseConfigured()) {
    const note: LoveNote = {
      id: crypto.randomUUID(),
      author: input.author,
      text: input.text,
      heart: input.heart,
      createdAt: new Date(),
    }
    const next = [note, ...readLocalNotes()]
    writeLocalNotes(next)
    return note
  }

  const ref = await addDoc(collection(db, 'notes'), {
    author: input.author,
    text: input.text,
    heart: input.heart,
    createdAt: serverTimestamp(),
  })

  return {
    id: ref.id,
    author: input.author,
    text: input.text,
    heart: input.heart,
    createdAt: new Date(),
  }
}

export { isFirebaseConfigured }
