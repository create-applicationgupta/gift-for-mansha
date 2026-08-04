import {
  useEffect,
  useRef,
  useState,
  type FormEvent,
  type KeyboardEvent as ReactKeyboardEvent,
  type MouseEvent as ReactMouseEvent,
  type PointerEvent as ReactPointerEvent,
} from 'react'
import { emojiCategories } from '../lib/emojis'
import { useAuth } from '../lib/auth'
import {
  createNote,
  deleteNote,
  fetchNotes,
  isFirebaseConfigured,
  setNoteReactions,
  setNoteStarredBy,
  toggleReaction,
  toggleStar,
  updateNoteText,
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
const REACTION_EMOJIS = ['❤️', '😂', '😮', '😢', '🙏', '🥰'] as const
const LONG_PRESS_MS = 480

type MenuState = {
  noteId: string
  x: number
  y: number
}

type InfoState = {
  note: LoveNote
}

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

function snippet(text: string, max = 80) {
  const trimmed = text.trim()
  if (trimmed.length <= max) return trimmed
  return `${trimmed.slice(0, max).trimEnd()}…`
}

export function Notes() {
  const { user, canDeleteNotes } = useAuth()
  const partner = getPartner(user)
  const [notes, setNotes] = useState<LoveNote[]>([])
  const [text, setText] = useState('')
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
  const [replyingTo, setReplyingTo] = useState<LoveNote | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [menu, setMenu] = useState<MenuState | null>(null)
  const [reactForId, setReactForId] = useState<string | null>(null)
  const [info, setInfo] = useState<InfoState | null>(null)
  const [flashId, setFlashId] = useState<string | null>(null)
  const textRef = useRef<HTMLTextAreaElement>(null)
  const emojiWrapRef = useRef<HTMLDivElement>(null)
  const chatEndRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)
  const longPressTimer = useRef<number>(0)
  const longPressTriggered = useRef(false)
  const online = isFirebaseConfigured()

  function scrollChatToBottom(behavior: ScrollBehavior = 'smooth') {
    requestAnimationFrame(() => {
      chatEndRef.current?.scrollIntoView({ behavior, block: 'end' })
    })
  }

  function focusComposer() {
    requestAnimationFrame(() => textRef.current?.focus())
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

  useEffect(() => {
    if (!menu && !reactForId && !info) return

    function onPointerDown(e: PointerEvent) {
      const target = e.target as Node
      if (menuRef.current?.contains(target)) return
      if ((target as HTMLElement).closest?.('.note-react-picker')) return
      if ((target as HTMLElement).closest?.('.note-info-sheet')) return
      setMenu(null)
      setReactForId(null)
    }

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') {
        setMenu(null)
        setReactForId(null)
        setInfo(null)
      }
    }

    document.addEventListener('pointerdown', onPointerDown)
    window.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      window.removeEventListener('keydown', onKey)
    }
  }, [menu, reactForId, info])

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

  function openMenu(note: LoveNote, x: number, y: number) {
    setReactForId(null)
    setMenu({ noteId: note.id, x, y })
  }

  function clearComposerModes() {
    setReplyingTo(null)
    setEditingId(null)
  }

  function startReply(note: LoveNote) {
    setMenu(null)
    setEditingId(null)
    setReplyingTo(note)
    focusComposer()
  }

  function startEdit(note: LoveNote) {
    if (note.author !== user) return
    setMenu(null)
    setReplyingTo(null)
    setEditingId(note.id)
    setText(note.text)
    requestAnimationFrame(() => {
      resizeComposer()
      focusComposer()
    })
  }

  async function handleCopy(note: LoveNote) {
    setMenu(null)
    try {
      await navigator.clipboard.writeText(note.text)
    } catch {
      setError('Could not copy that note.')
    }
  }

  async function handleStar(note: LoveNote) {
    setMenu(null)
    const starredBy = toggleStar(note.starredBy, user)
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, starredBy } : n)),
    )
    try {
      await setNoteStarredBy(note.id, starredBy)
    } catch {
      setNotes((prev) =>
        prev.map((n) => (n.id === note.id ? { ...n, starredBy: note.starredBy ?? [] } : n)),
      )
      setError('Could not update star. Try again.')
    }
  }

  async function handleReact(note: LoveNote, emoji: string) {
    setReactForId(null)
    setMenu(null)
    const reactions = toggleReaction(note.reactions, emoji, user)
    setNotes((prev) =>
      prev.map((n) => (n.id === note.id ? { ...n, reactions } : n)),
    )
    try {
      await setNoteReactions(note.id, reactions)
    } catch {
      setNotes((prev) =>
        prev.map((n) =>
          n.id === note.id ? { ...n, reactions: note.reactions ?? {} } : n,
        ),
      )
      setError('Could not save reaction. Try again.')
    }
  }

  function showInfo(note: LoveNote) {
    setMenu(null)
    setInfo({ note })
  }

  function jumpToNote(noteId: string) {
    const el = document.getElementById(`note-${noteId}`)
    if (!el) return
    el.scrollIntoView({ behavior: 'smooth', block: 'center' })
    setFlashId(noteId)
    window.setTimeout(() => setFlashId((id) => (id === noteId ? null : id)), 1400)
  }

  async function handleSubmit(e?: FormEvent) {
    e?.preventDefault()
    const trimmed = text.trim()
    if (!trimmed || saving) return

    setSaving(true)
    setError(null)
    setEmojiOpen(false)

    try {
      if (editingId) {
        await updateNoteText(editingId, trimmed)
        const editedAt = new Date()
        setNotes((prev) =>
          prev.map((n) =>
            n.id === editingId ? { ...n, text: trimmed, editedAt } : n,
          ),
        )
        setEditingId(null)
        setText('')
      } else {
        const note = await createNote({
          author: user,
          text: trimmed,
          heart: true,
          replyTo: replyingTo
            ? {
                id: replyingTo.id,
                author: replyingTo.author,
                text: replyingTo.text,
              }
            : null,
        })
        setNotes((prev) => [...prev, note])
        setReplyingTo(null)
        setText('')
      }
      requestAnimationFrame(() => {
        if (textRef.current) {
          textRef.current.style.height = 'auto'
        }
      })
    } catch {
      setError(
        editingId
          ? 'Could not update that note. Please try again.'
          : 'Could not save that note. Please try again.',
      )
    } finally {
      setSaving(false)
    }
  }

  function handleComposerKey(e: ReactKeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === 'Escape' && (replyingTo || editingId)) {
      e.preventDefault()
      clearComposerModes()
      if (editingId) setText('')
      return
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      void handleSubmit()
    }
  }

  async function handleDelete(note: LoveNote) {
    if (!canDeleteNotes || deletingId) return
    setMenu(null)
    const ok = window.confirm('Delete this note? This cannot be undone.')
    if (!ok) return

    setDeletingId(note.id)
    setError(null)
    const previous = notes
    setNotes((prev) => prev.filter((n) => n.id !== note.id))
    if (replyingTo?.id === note.id) setReplyingTo(null)
    if (editingId === note.id) {
      setEditingId(null)
      setText('')
    }
    try {
      await deleteNote(note.id)
    } catch {
      setNotes(previous)
      setError('Could not delete that note. Check Firestore rules and try again.')
    } finally {
      setDeletingId(null)
    }
  }

  function onNoteContextMenu(e: ReactMouseEvent, note: LoveNote) {
    e.preventDefault()
    openMenu(note, e.clientX, e.clientY)
  }

  function onNotePointerDown(e: ReactPointerEvent, note: LoveNote) {
    if (e.pointerType === 'mouse' && e.button !== 0) return
    longPressTriggered.current = false
    window.clearTimeout(longPressTimer.current)
    longPressTimer.current = window.setTimeout(() => {
      longPressTriggered.current = true
      openMenu(note, e.clientX, e.clientY)
    }, LONG_PRESS_MS)
  }

  function clearLongPress() {
    window.clearTimeout(longPressTimer.current)
  }

  const activeEmojis = emojiCategories[emojiCategory]?.emojis ?? []
  const canSend = Boolean(text.trim()) && !saving
  const menuNote = menu ? notes.find((n) => n.id === menu.noteId) : null
  const isStarredByMe = (note: LoveNote) => (note.starredBy ?? []).includes(user)

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
          <div
            className={`notes-chat-avatar${partnerPresence.online ? ' is-online' : ''}`}
            aria-hidden="true"
          >
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
            const reactionEntries = Object.entries(note.reactions ?? {}).filter(
              ([, users]) => users.length > 0,
            )
            return (
              <article
                key={note.id}
                id={`note-${note.id}`}
                className={`note-item ${isMine ? 'is-mine' : 'is-theirs'}${flashId === note.id ? ' is-flash' : ''}${isStarredByMe(note) ? ' is-starred' : ''}`}
                onContextMenu={(e) => onNoteContextMenu(e, note)}
                onPointerDown={(e) => onNotePointerDown(e, note)}
                onPointerUp={clearLongPress}
                onPointerLeave={clearLongPress}
                onPointerCancel={clearLongPress}
                onClick={() => {
                  if (longPressTriggered.current) {
                    longPressTriggered.current = false
                  }
                }}
              >
                <span className="note-author">
                  {note.author}
                  <span className="note-heart-mark" aria-hidden="true">
                    ♡
                  </span>
                </span>

                {note.replyTo && (
                  <button
                    type="button"
                    className="note-quote"
                    onClick={(e) => {
                      e.stopPropagation()
                      jumpToNote(note.replyTo!.id)
                    }}
                  >
                    <span className="note-quote-author">{note.replyTo.author}</span>
                    <span className="note-quote-text">{snippet(note.replyTo.text)}</span>
                  </button>
                )}

                <p className="note-text">{note.text}</p>

                {reactionEntries.length > 0 && (
                  <div className="note-reactions">
                    {reactionEntries.map(([emoji, users]) => (
                      <button
                        key={emoji}
                        type="button"
                        className={`note-reaction-chip${users.includes(user) ? ' is-mine' : ''}`}
                        onClick={(e) => {
                          e.stopPropagation()
                          void handleReact(note, emoji)
                        }}
                        title={users.join(', ')}
                      >
                        <span>{emoji}</span>
                        <span>{users.length}</span>
                      </button>
                    ))}
                  </div>
                )}

                <footer className="note-footer">
                  {isStarredByMe(note) && (
                    <span className="note-star-mark" aria-label="Starred" title="Starred">
                      ★
                    </span>
                  )}
                  {note.editedAt && <span className="note-edited">edited</span>}
                  {note.createdAt && (
                    <time dateTime={note.createdAt.toISOString()}>
                      {formatNoteStamp(note.createdAt)}
                    </time>
                  )}
                  {canDeleteNotes && (
                    <button
                      type="button"
                      className="note-delete"
                      onClick={(e) => {
                        e.stopPropagation()
                        void handleDelete(note)
                      }}
                      disabled={deletingId === note.id}
                      aria-label="Remove this note"
                      title="Remove note"
                    >
                      <DeleteIcon />
                    </button>
                  )}
                </footer>

                {reactForId === note.id && (
                  <div
                    className="note-react-picker"
                    role="dialog"
                    aria-label="React"
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    {REACTION_EMOJIS.map((emoji) => (
                      <button
                        key={emoji}
                        type="button"
                        className="note-react-emoji"
                        onClick={() => void handleReact(note, emoji)}
                        aria-label={`React with ${emoji}`}
                      >
                        {emoji}
                      </button>
                    ))}
                  </div>
                )}
              </article>
            )
          })}
          <div ref={chatEndRef} className="notes-chat-end" aria-hidden="true" />
        </div>

        {error && <p className="notes-error">{error}</p>}

        {(replyingTo || editingId) && (
          <div className="notes-composer-context">
            <div className="notes-composer-context-body">
              <span className="notes-composer-context-label">
                {editingId ? 'Editing message' : `Replying to ${replyingTo?.author}`}
              </span>
              <span className="notes-composer-context-text">
                {editingId
                  ? snippet(notes.find((n) => n.id === editingId)?.text ?? text)
                  : snippet(replyingTo?.text ?? '')}
              </span>
            </div>
            <button
              type="button"
              className="notes-composer-context-close"
              onClick={() => {
                clearComposerModes()
                if (editingId) setText('')
              }}
              aria-label="Cancel"
            >
              ×
            </button>
          </div>
        )}

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
              placeholder={editingId ? 'Edit message' : 'Type a message'}
              required
            />
          </div>

          <div className="notes-composer-identity" title={`Writing as ${user}`}>
            <span className="notes-composer-who" aria-label={`Writing as ${user}`}>
              {user.slice(0, 1)}
            </span>
          </div>

          <button
            className="notes-send"
            type="submit"
            disabled={!canSend}
            aria-label={
              saving ? 'Sending' : editingId ? 'Save edit' : 'Send note'
            }
            title={editingId ? 'Save' : 'Send'}
          >
            <SendIcon />
          </button>
        </form>
      </section>

      {menu && menuNote && (
        <div
          ref={menuRef}
          className="note-context-menu"
          style={{
            left: Math.min(menu.x, window.innerWidth - 200),
            top: Math.min(menu.y, window.innerHeight - 280),
          }}
          role="menu"
        >
          <button type="button" role="menuitem" onClick={() => startReply(menuNote)}>
            Reply
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setMenu(null)
              setReactForId(menuNote.id)
            }}
          >
            React
          </button>
          <button type="button" role="menuitem" onClick={() => void handleCopy(menuNote)}>
            Copy
          </button>
          {menuNote.author === user && (
            <button type="button" role="menuitem" onClick={() => startEdit(menuNote)}>
              Edit
            </button>
          )}
          <button type="button" role="menuitem" onClick={() => void handleStar(menuNote)}>
            {isStarredByMe(menuNote) ? 'Unstar' : 'Star'}
          </button>
          <button type="button" role="menuitem" onClick={() => showInfo(menuNote)}>
            Info
          </button>
          {canDeleteNotes && (
            <button
              type="button"
              role="menuitem"
              className="is-danger"
              onClick={() => void handleDelete(menuNote)}
            >
              Delete
            </button>
          )}
        </div>
      )}

      {info && (
        <div className="note-info-backdrop" role="presentation" onClick={() => setInfo(null)}>
          <div
            className="note-info-sheet"
            role="dialog"
            aria-label="Message info"
            onClick={(e) => e.stopPropagation()}
            onPointerDown={(e) => e.stopPropagation()}
          >
            <h2>Message info</h2>
            <dl>
              <div>
                <dt>From</dt>
                <dd>{info.note.author}</dd>
              </div>
              <div>
                <dt>Sent</dt>
                <dd>
                  {info.note.createdAt
                    ? formatNoteStamp(info.note.createdAt)
                    : 'Unknown'}
                </dd>
              </div>
              {info.note.editedAt && (
                <div>
                  <dt>Edited</dt>
                  <dd>{formatNoteStamp(info.note.editedAt)}</dd>
                </div>
              )}
              {(info.note.starredBy?.length ?? 0) > 0 && (
                <div>
                  <dt>Starred by</dt>
                  <dd>{info.note.starredBy!.join(', ')}</dd>
                </div>
              )}
            </dl>
            <button type="button" className="btn" onClick={() => setInfo(null)}>
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
