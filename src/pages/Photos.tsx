import { useEffect, useId, useRef, useState, type FormEvent } from 'react'
import {
  fetchGalleryPhotos,
  isFirebaseConfigured,
  MAX_PHOTOS,
  togglePhotoLike,
  uploadGalleryPhoto,
  type GalleryPhoto,
} from '../lib/photos'
import './Photos.css'

function formatPhotoDate(date: Date) {
  return date.toLocaleDateString(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
}

function HeartIcon({ filled }: { filled: boolean }) {
  const gradId = useId().replace(/:/g, '')
  return (
    <svg
      className="photo-heart-icon"
      viewBox="0 0 24 24"
      width="20"
      height="20"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={gradId}
          x1="4"
          y1="3"
          x2="18"
          y2="21"
          gradientUnits="userSpaceOnUse"
        >
          <stop stopColor="#f2a0ab" />
          <stop offset="0.55" stopColor="#e45d72" />
          <stop offset="1" stopColor="#c43d55" />
        </linearGradient>
      </defs>
      <path
        className="photo-heart-path"
        d="M12 20.4c-.4 0-.8-.15-1.1-.45C7.4 16.55 4.2 13.75 2.7 11.5 1.3 9.4 1.45 6.7 3.2 5.1A4.35 4.35 0 0 1 6.9 4c1.35 0 2.55.55 3.4 1.5L12 7.35l1.7-1.85A4.5 4.5 0 0 1 17.1 4c1.45 0 2.8.55 3.7 1.5 1.75 1.6 1.9 4.3.5 6.4-1.5 2.25-4.7 5.05-8.2 8.45-.3.3-.7.45-1.1.45Z"
        fill={filled ? `url(#${gradId})` : 'rgba(255, 255, 255, 0.35)'}
        stroke={filled ? '#c43d55' : '#e07a8a'}
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
    </svg>
  )
}

export function Photos() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [active, setActive] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
  const [likingId, setLikingId] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)
  const online = isFirebaseConfigured()

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const data = await fetchGalleryPhotos()
        if (!cancelled) setPhotos(data)
      } catch {
        if (!cancelled) {
          setError('Could not load photos. Check Firestore rules and try again.')
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    if (active === null) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(null)
      if (photos.length === 0) return
      if (e.key === 'ArrowRight') {
        setActive((i) => (i === null ? i : (i + 1) % photos.length))
      }
      if (e.key === 'ArrowLeft') {
        setActive((i) =>
          i === null ? i : (i - 1 + photos.length) % photos.length,
        )
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, photos.length])

  async function handleUpload(e: FormEvent) {
    e.preventDefault()
    const file = fileRef.current?.files?.[0]
    if (!file || uploading) return

    setUploading(true)
    setError(null)
    setMessage(null)
    const willReplace = photos.length >= MAX_PHOTOS

    try {
      await uploadGalleryPhoto({ file, caption })
      const next = await fetchGalleryPhotos()
      setPhotos(next)
      setCaption('')
      if (fileRef.current) fileRef.current.value = ''
      setMessage(
        willReplace
          ? `Uploaded. The oldest photo was removed to keep ${MAX_PHOTOS}.`
          : 'Photo added.',
      )
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Upload failed. Check Firestore rules and try again.',
      )
    } finally {
      setUploading(false)
    }
  }

  async function handleLike(photo: GalleryPhoto) {
    if (!online || likingId) return
    const nextLiked = !photo.liked
    setLikingId(photo.id)
    setPhotos((prev) =>
      prev.map((p) => (p.id === photo.id ? { ...p, liked: nextLiked } : p)),
    )
    try {
      await togglePhotoLike(photo.id, nextLiked)
    } catch {
      setPhotos((prev) =>
        prev.map((p) =>
          p.id === photo.id ? { ...p, liked: photo.liked } : p,
        ),
      )
      setError('Could not save like. Check Firestore rules and try again.')
    } finally {
      setLikingId(null)
    }
  }

  const current = active !== null ? photos[active] : null

  return (
    <div className="page photos-page">
      <h1 className="page-title animate-fade-up">Our photos</h1>
      <p className="page-lead animate-fade-up delay-1">
        Keep up to {MAX_PHOTOS} photos here. When you add another, the oldest
        one quietly makes room.
      </p>

      {!online && (
        <p className="photos-banner animate-fade-up delay-1">
          Firebase is not configured yet — photo upload needs Firestore (free
          Spark plan).
        </p>
      )}

      {online && (
        <form
          className="photo-upload animate-fade-up delay-2"
          onSubmit={handleUpload}
        >
          <div className="photo-upload-row">
            <label htmlFor="photo-file">Photo</label>
            <input
              id="photo-file"
              ref={fileRef}
              type="file"
              accept="image/*"
              required
            />
          </div>
          <div className="photo-upload-row">
            <label htmlFor="photo-caption">Caption (optional)</label>
            <input
              id="photo-caption"
              type="text"
              maxLength={80}
              value={caption}
              onChange={(e) => setCaption(e.target.value)}
              placeholder="A few soft words…"
            />
          </div>
          <p className="photo-upload-hint">
            {photos.length} / {MAX_PHOTOS} photos
            {photos.length >= MAX_PHOTOS
              ? ' — next upload replaces the oldest'
              : ''}
          </p>
          {error && <p className="photos-error">{error}</p>}
          {message && <p className="photos-message">{message}</p>}
          <button className="btn" type="submit" disabled={uploading || !online}>
            {uploading ? 'Uploading…' : 'Upload photo'}
          </button>
        </form>
      )}

      {loading && <p className="photos-empty">Gathering photos…</p>}

      {!loading && photos.length === 0 && (
        <p className="photos-empty">No photos yet — upload the first one.</p>
      )}

      <div className="photo-grid">
        {photos.map((photo, index) => (
          <div
            key={photo.id}
            className={`photo-tile animate-fade-up delay-${(index % 3) + 1}`}
          >
            <button
              type="button"
              className="photo-tile-open"
              onClick={() => setActive(index)}
              aria-label={`Open photo: ${photo.caption}`}
            >
              <img src={photo.src} alt={photo.alt} loading="lazy" />
            </button>
            <button
              type="button"
              className={`photo-like${photo.liked ? ' is-liked' : ''}`}
              onClick={() => handleLike(photo)}
              disabled={!online || likingId === photo.id}
              aria-label={photo.liked ? 'Unlike photo' : 'Like photo'}
              aria-pressed={photo.liked}
            >
              <HeartIcon filled={photo.liked} />
            </button>
            <div className="photo-meta">
              <span className="photo-caption">{photo.caption}</span>
              {photo.createdAt && (
                <time dateTime={photo.createdAt.toISOString()}>
                  {formatPhotoDate(photo.createdAt)}
                </time>
              )}
            </div>
          </div>
        ))}
      </div>

      {current && active !== null && (
        <div
          className="lightbox animate-fade-in"
          role="dialog"
          aria-modal="true"
          aria-label={current.caption}
          onClick={() => setActive(null)}
        >
          <button
            type="button"
            className="lightbox-close"
            aria-label="Close"
            onClick={() => setActive(null)}
          >
            Close
          </button>
          <figure
            className="lightbox-figure"
            onClick={(e) => e.stopPropagation()}
          >
            <img src={current.src} alt={current.alt} />
            <figcaption>
              <span className="lightbox-caption-row">
                <span>{current.caption}</span>
                <button
                  type="button"
                  className={`photo-like lightbox-like${current.liked ? ' is-liked' : ''}`}
                  onClick={() => handleLike(current)}
                  disabled={!online || likingId === current.id}
                  aria-label={current.liked ? 'Unlike photo' : 'Like photo'}
                  aria-pressed={current.liked}
                >
                  <HeartIcon filled={current.liked} />
                </button>
              </span>
              {current.createdAt && (
                <time dateTime={current.createdAt.toISOString()}>
                  {formatPhotoDate(current.createdAt)}
                </time>
              )}
            </figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}
