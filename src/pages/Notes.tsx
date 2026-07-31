import { useEffect, useState, type FormEvent } from 'react'
import { site } from '../content/site'
import {
  createNote,
  deleteNote,
  fetchNotes,
  isFirebaseConfigured,
  type LoveNote,
} from '../lib/notes'
import './Notes.css'

function TrashIcon() {
  return (
    <svg
      className="note-delete-icon"
      viewBox="0 0 24 24"
      width="16"
      height="16"
      aria-hidden="true"
    >
      <path
        d="M9 4.5h6M5.5 7h13M9.5 7v10.5a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1V7M10.5 10.5v5M13.5 10.5v5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Notes() {
  const [notes, setNotes] = useState<LoveNote[]>([])
  const [author, setAuthor] = useState<string>(site.yourName)
  const [text, setText] = useState('')
  const [heart, setHeart] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const online = isFirebaseConfigured()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchNotes()
        if (!cancelled) setNotes(data)
      } catch {
        if (!cancelled) setError('Could not load notes. Try again in a moment.')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || saving) return

    setSaving(true)
    setError(null)
    try {
      const note = await createNote({ author, text: trimmed, heart })
      setNotes((prev) => [note, ...prev])
      setText('')
    } catch {
      setError('Could not save that note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(note: LoveNote) {
    if (note.author !== site.yourName || deletingId) return
    const ok = window.confirm('Delete this note? This cannot be undone.')
    if (!ok) return

    setDeletingId(note.id)
    setError(null)
    const previous = notes
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    try {
      await deleteNote(note.id)
    } catch {
      setNotes(previous)
      setError('Could not delete that note. Check Firestore rules and try again.')
    } finally {
      setDeletingId(null)
    }
  }

  return (
    <div className="page notes-page">
      <h1 className="page-title animate-fade-up">Love notes</h1>
      <p className="page-lead animate-fade-up delay-1">
        Leave a little something for each other. Notes stay here so you can
        come back and read them anytime.
      </p>

      {!online && (
        <p className="notes-banner animate-fade-up delay-1">
          Firebase is not configured yet — notes are saved in this browser only.
          Add your Firebase keys to sync between your devices.
        </p>
      )}

      <form className="notes-form animate-fade-up delay-2" onSubmit={handleSubmit}>
        <div className="notes-form-row">
          <label htmlFor="note-author">From</label>
          <select
            id="note-author"
            value={author}
            onChange={(e) => setAuthor(e.target.value)}
          >
            <option value={site.yourName}>{site.yourName}</option>
            <option value={site.herName}>{site.herName}</option>
          </select>
        </div>

        <div className="notes-form-row">
          <label htmlFor="note-text">Note</label>
          <textarea
            id="note-text"
            rows={4}
            maxLength={600}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Write something soft…"
            required
          />
        </div>

        <div className="notes-actions">
          <label className="notes-heart">
            <input
              type="checkbox"
              checked={heart}
              onChange={(e) => setHeart(e.target.checked)}
            />
            <span>Add a little heart</span>
          </label>

          {error && <p className="notes-error">{error}</p>}

          <button className="btn" type="submit" disabled={saving || !text.trim()}>
            {saving ? 'Sending…' : 'Leave note'}
          </button>
        </div>
      </form>

      <div className="notes-list" aria-live="polite">
        {loading && <p className="notes-empty">Gathering notes…</p>}
        {!loading && notes.length === 0 && (
          <p className="notes-empty">No notes yet — be the first.</p>
        )}
        {notes.map((note, i) => (
          <article
            key={note.id}
            className={`note-item animate-fade-up delay-${(i % 3) + 1}`}
          >
            <header className="note-meta">
              <span className="note-author">
                {note.author}
                {note.heart ? ' ♡' : ''}
              </span>
              <span className="note-meta-end">
                {note.createdAt && (
                  <time dateTime={note.createdAt.toISOString()}>
                    {note.createdAt.toLocaleDateString(undefined, {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                  </time>
                )}
                {note.author === site.yourName && (
                  <button
                    type="button"
                    className="note-delete"
                    onClick={() => handleDelete(note)}
                    disabled={deletingId === note.id}
                    aria-label="Delete this note"
                    title="Delete note"
                  >
                    <TrashIcon />
                  </button>
                )}
              </span>
            </header>
            <p className="note-text">{note.text}</p>
          </article>
        ))}
      </div>
    </div>
  )
}
