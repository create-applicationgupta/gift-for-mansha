import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  type Timestamp,
} from 'firebase/firestore'
import { getDb, isFirebaseConfigured } from './firebase'

export type NoteReplyTo = {
  id: string
  author: string
  text: string
}

export type LoveNote = {
  id: string
  author: string
  text: string
  heart: boolean
  createdAt: Date | null
  replyTo?: NoteReplyTo | null
  reactions?: Record<string, string[]>
  editedAt?: Date | null
  starredBy?: string[]
}

type NoteDoc = {
  author: string
  text: string
  heart?: boolean
  createdAt?: Timestamp | null
  replyTo?: NoteReplyTo | null
  reactions?: Record<string, string[]>
  editedAt?: Timestamp | null
  starredBy?: string[]
}

const LOCAL_KEY = 'gift-site-local-notes'

function hydrateNote(n: LoveNote): LoveNote {
  return {
    ...n,
    createdAt: n.createdAt ? new Date(n.createdAt) : null,
    editedAt: n.editedAt ? new Date(n.editedAt) : null,
    replyTo: n.replyTo ?? null,
    reactions: n.reactions ?? {},
    starredBy: n.starredBy ?? [],
  }
}

function readLocalNotes(): LoveNote[] {
  try {
    const raw = localStorage.getItem(LOCAL_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw) as LoveNote[]
    return parsed.map(hydrateNote)
  } catch {
    return []
  }
}

function writeLocalNotes(notes: LoveNote[]) {
  localStorage.setItem(LOCAL_KEY, JSON.stringify(notes))
}

function mapDoc(id: string, data: NoteDoc): LoveNote {
  return {
    id,
    author: data.author,
    text: data.text,
    heart: Boolean(data.heart),
    createdAt: data.createdAt?.toDate?.() ?? null,
    replyTo: data.replyTo ?? null,
    reactions: data.reactions ?? {},
    editedAt: data.editedAt?.toDate?.() ?? null,
    starredBy: data.starredBy ?? [],
  }
}

function patchLocalNote(noteId: string, patch: Partial<LoveNote>): LoveNote | null {
  const notes = readLocalNotes()
  const index = notes.findIndex((n) => n.id === noteId)
  if (index < 0) return null
  const next = { ...notes[index], ...patch }
  notes[index] = next
  writeLocalNotes(notes)
  return next
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
  return snap.docs.map((d) => mapDoc(d.id, d.data() as NoteDoc))
}

export async function createNote(input: {
  author: string
  text: string
  heart: boolean
  replyTo?: NoteReplyTo | null
}): Promise<LoveNote> {
  const replyTo = input.replyTo
    ? {
        id: input.replyTo.id,
        author: input.replyTo.author,
        text: input.replyTo.text.slice(0, 120),
      }
    : null

  const db = getDb()
  if (!db || !isFirebaseConfigured()) {
    const note: LoveNote = {
      id: crypto.randomUUID(),
      author: input.author,
      text: input.text,
      heart: input.heart,
      createdAt: new Date(),
      replyTo,
      reactions: {},
      editedAt: null,
      starredBy: [],
    }
    writeLocalNotes([note, ...readLocalNotes()])
    return note
  }

  const payload = {
    author: input.author,
    text: input.text,
    heart: input.heart,
    createdAt: serverTimestamp(),
    replyTo,
    reactions: {},
    starredBy: [],
  }

  const ref = await addDoc(collection(db, 'notes'), payload)

  return {
    id: ref.id,
    author: input.author,
    text: input.text,
    heart: input.heart,
    createdAt: new Date(),
    replyTo,
    reactions: {},
    editedAt: null,
    starredBy: [],
  }
}

export async function updateNoteText(noteId: string, text: string): Promise<LoveNote> {
  const editedAt = new Date()
  const db = getDb()
  if (!db || !isFirebaseConfigured()) {
    const next = patchLocalNote(noteId, { text, editedAt })
    if (!next) throw new Error('Note not found')
    return next
  }

  await updateDoc(doc(db, 'notes', noteId), {
    text,
    editedAt: serverTimestamp(),
  })

  return {
    id: noteId,
    author: '',
    text,
    heart: false,
    createdAt: null,
    editedAt,
  }
}

export async function setNoteReactions(
  noteId: string,
  reactions: Record<string, string[]>,
): Promise<void> {
  const db = getDb()
  if (!db || !isFirebaseConfigured()) {
    patchLocalNote(noteId, { reactions })
    return
  }
  await updateDoc(doc(db, 'notes', noteId), { reactions })
}

export async function setNoteStarredBy(noteId: string, starredBy: string[]): Promise<void> {
  const db = getDb()
  if (!db || !isFirebaseConfigured()) {
    patchLocalNote(noteId, { starredBy })
    return
  }
  await updateDoc(doc(db, 'notes', noteId), { starredBy })
}

export function toggleReaction(
  reactions: Record<string, string[]> | undefined,
  emoji: string,
  user: string,
): Record<string, string[]> {
  const hadThis = (reactions?.[emoji] ?? []).includes(user)
  const next: Record<string, string[]> = {}

  for (const [key, list] of Object.entries(reactions ?? {})) {
    const filtered = list.filter((u) => u !== user)
    if (filtered.length) next[key] = filtered
  }

  if (!hadThis) {
    next[emoji] = [...(next[emoji] ?? []), user]
  }

  return next
}

export function toggleStar(starredBy: string[] | undefined, user: string): string[] {
  const set = new Set(starredBy ?? [])
  if (set.has(user)) set.delete(user)
  else set.add(user)
  return [...set]
}

export async function deleteNote(noteId: string): Promise<void> {
  const db = getDb()
  if (!db || !isFirebaseConfigured()) {
    writeLocalNotes(readLocalNotes().filter((n) => n.id !== noteId))
    return
  }

  await deleteDoc(doc(db, 'notes', noteId))
}

export { isFirebaseConfigured }
