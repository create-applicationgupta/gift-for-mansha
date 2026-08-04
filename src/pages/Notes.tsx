import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import { emojiCategories } from '../lib/emojis'
import { useAuth } from '../lib/auth'
import {
  createNote,
  deleteNote,
  fetchNotes,
  isFirebaseConfigured,
  type LoveNote,
} from '../lib/notes'
import {
  formatLastSeen,
  getPartner,
  subscribePresence,
  type PresenceState,
} from '../lib/presence'
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

function SendIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path
        d="M3.4 11.2 20.1 3.7c.55-.25 1.12.3.9.86L14.4 20.5c-.22.55-.97.6-1.27.08l-2.7-4.7a.7.7 0 0 1 .08-.82l5.1-5.35-7.35 3.55a.7.7 0 0 1-.72-.1L3.3 11.9c-.5-.35-.3-1.1.1-.7Z"
        fill="currentColor"
      />
    </svg>
  )
}

function formatNoteStamp(date: Date) {
  return date.toLocaleString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

export function Notes() {
  const { user, canDeleteNotes } = useAuth()
  const partner = getPartner(user)
  const [notes, setNotes] = useState<LoveNote[]>([])
  const [text, setText] = useState('')
  const [heart, setHeart] = useState(true)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deletingId, setDeletingId] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [emojiOpen, setEmojiOpen] = useState(false)
  const [emojiCategory, setEmojiCategory] = useState(0)
  const [partnerPresence, setPartnerPresence] = useState<PresenceState>({
    online: false,
    lastSeen: null,
  })
  const textRef = useRef<HTMLTextAreaElement>(null)
  const emojiWrapRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const online = isFirebaseConfigured()

  function scrollChatToBottom(behavior: ScrollBehavior = 'smooth') {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    })
  }

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchNotes()
        if (!cancelled) {
          setNotes([...data].reverse())
        }
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
    if (loading) return
    scrollChatToBottom(notes.length > 0 ? 'smooth' : 'auto')
  }, [loading, notes.length])

  useEffect(() => {
    return subscribePresence(partner, setPartnerPresence)
  }, [partner])

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

  function resizeComposer() {
    const el = textRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${Math.min(el.scrollHeight, 120)}px`
  }

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
      resizeComposer()
    })
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || saving) return

    setSaving(true)
    setError(null)
    setEmojiOpen(false)
    try {
      const note = await createNote({ author: user, text: trimmed, heart })
      setNotes((prev) => [...prev, note])
      setText('')
      requestAnimationFrame(() => {
        if (textRef.current) {
          textRef.current.style.height = 'auto'
        }
      })
    } catch {
      setError('Could not save that note. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  function handleComposerKey(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  async function handleDelete(note: LoveNote) {
    if (!canDeleteNotes || deletingId) return
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
  const canSend = Boolean(text.trim()) && !saving

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

      <section className="notes-chat animate-fade-up delay-2" aria-label="Love notes chat">
        <header className="notes-chat-header">
          <div className="notes-chat-avatar" aria-hidden="true">
            {partner.slice(0, 1)}
          </div>
          <div className="notes-chat-header-text">
            <p className="notes-chat-title">{partner}</p>
            <p
              className={`notes-chat-status${partnerPresence.online ? ' is-online' : ''}`}
            >
              {formatLastSeen(partnerPresence)}
            </p>
          </div>
        </header>

        <div className="notes-list" aria-live="polite">
          {loading && <p className="notes-empty">Gathering notes…</p>}
          {!loading && notes.length === 0 && (
            <p className="notes-empty">No notes yet — be the first.</p>
          )}
          {notes.map((note) => {
            const isMine = note.author === user
            return (
              <article
                key={note.id}
                className={`note-item ${isMine ? 'is-mine' : 'is-theirs'}`}
              >
                {!isMine && (
                  <span className="note-author">
                    {note.author}
                    {note.heart && (
                      <span className="note-heart-mark" aria-hidden="true">
                        ♡
                      </span>
                    )}
                  </span>
                )}
                <p className="note-text">{note.text}</p>
                <footer className="note-footer">
                  {isMine && note.heart && (
                    <span className="note-heart-mark note-heart-inline" aria-hidden="true">
                      ♡
                    </span>
                  )}
                  {note.createdAt && (
                    <time dateTime={note.createdAt.toISOString()}>
                      {formatNoteStamp(note.createdAt)}
                    </time>
                  )}
                  {canDeleteNotes && (
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
                </footer>
              </article>
            )
          })}
          <div ref={chatEndRef} className="notes-chat-end" aria-hidden="true" />
        </div>

        {error && <p className="notes-error">{error}</p>}

        <form className="notes-composer-bar" onSubmit={handleSubmit}>
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

          <label className="sr-only" htmlFor="note-text">
            Message
          </label>
          <div className="notes-composer-field">
            <textarea
              id="note-text"
              ref={textRef}
              rows={1}
              maxLength={NOTE_MAX}
              value={text}
              onChange={(e) => {
                setText(e.target.value)
                requestAnimationFrame(resizeComposer)
              }}
              onKeyDown={handleComposerKey}
              placeholder="Type a message"
              required
            />
          </div>

          <button
            type="button"
            className={`notes-heart-toggle${heart ? ' is-on' : ''}`}
            onClick={() => setHeart((on) => !on)}
            aria-pressed={heart}
            aria-label={heart ? 'Heart on' : 'Heart off'}
            title={heart ? 'Heart on' : 'Add heart'}
          >
            ♡
          </button>

          <button
            className="notes-send"
            type="submit"
            disabled={!canSend}
            aria-label={saving ? 'Sending' : 'Send note'}
            title="Send"
          >
            <SendIcon />
          </button>
        </form>
      </section>
    </div>
  )
}
