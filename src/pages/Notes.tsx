import { useEffect, useRef, useState, type FormEvent } from 'react'
import { site } from '../content/site'
import { emojiCategories } from '../lib/emojis'
import {
  createNote,
  deleteNote,
  fetchNotes,
  isFirebaseConfigured,
  type LoveNote,
} from '../lib/notes'
import './Notes.css'

const NOTE_MAX = 600

function DeleteIcon() {
  return (
    <svg
      className="note-delete-icon"
      viewBox="0 0 24 24"
      width="14"
      height="14"
      aria-hidden="true"
    >
      <path
        d="M7.5 7.5 16.5 16.5M16.5 7.5 7.5 16.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.85"
        strokeLinecap="round"
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
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const emojiWrapRef = useRef<HTMLDivElement>(null)
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

  useEffect(() => {
    if (!emojiOpen) return

    function onPointerDown(e: PointerEvent) {
      if (!emojiWrapRef.current?.contains(e.target as Node)) {
        setEmojiOpen(false)
      }
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setEmojiOpen(false)
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [emojiOpen])

  function insertEmoji(emoji: string) {
    const el = textRef.current
    const start = el?.selectionStart ?? text.length
    const end = el?.selectionEnd ?? text.length
    const next = `${text.slice(0, start)}${emoji}${text.slice(end)}`
    if (next.length > NOTE_MAX) return

    setText(next)
    requestAnimationFrame(() => {
      if (!el) return
      el.focus()
      const caret = start + emoji.length
      el.setSelectionRange(caret, caret)
    })
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || saving) return

    setSaving(true)
    setError(null)
    setEmojiOpen(false)
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

  const activeEmojis = emojiCategories[emojiCategory]?.emojis ?? []

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
          <div className="notes-composer">
            <textarea
              id="note-text"
              ref={textRef}
              rows={4}
              maxLength={NOTE_MAX}
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write something soft…"
              required
            />
            <div className="notes-emoji-wrap" ref={emojiWrapRef}>
              <button
                type="button"
                className={`notes-emoji-toggle${emojiOpen ? ' is-open' : ''}`}
                onClick={() => setEmojiOpen((open) => !open)}
                aria-label="Add emoji"
                aria-expanded={emojiOpen}
                title="Emoji"
              >
                😊
              </button>
              {emojiOpen && (
                <div className="notes-emoji-panel" role="dialog" aria-label="Emoji picker">
                  <div className="notes-emoji-tabs" role="tablist">
                    {emojiCategories.map((cat, index) => (
                      <button
                        key={cat.id}
                        type="button"
                        role="tab"
                        aria-selected={emojiCategory === index}
                        className={`notes-emoji-tab${emojiCategory === index ? ' is-active' : ''}`}
                        onClick={() => setEmojiCategory(index)}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                  <div className="notes-emoji-grid">
                    {activeEmojis.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="notes-emoji-btn"
                        onClick={() => insertEmoji(emoji)}
                        aria-label={`Insert ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
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
                    aria-label="Remove this note"
                    title="Remove note"
                  >
                    <DeleteIcon />
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
