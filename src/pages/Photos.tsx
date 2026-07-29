import { useEffect, useRef, useState, type FormEvent } from 'react'
import {
  fetchGalleryPhotos,
  isFirebaseConfigured,
  MAX_PHOTOS,
  uploadGalleryPhoto,
  type GalleryPhoto,
} from '../lib/photos'
import './Photos.css'

export function Photos() {
  const [photos, setPhotos] = useState<GalleryPhoto[]>([])
  const [active, setActive] = useState<number | null>(null)
  const [loading, setLoading] = useState(true)
  const [uploading, setUploading] = useState(false)
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
          ? 'Uploaded. The oldest photo was removed to keep 5.'
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
          <button
            key={photo.id}
            type="button"
            className={`photo-tile animate-fade-up delay-${(index % 3) + 1}`}
            onClick={() => setActive(index)}
            aria-label={`Open photo: ${photo.caption}`}
          >
            <img src={photo.src} alt={photo.alt} loading="lazy" />
            <span className="photo-caption">{photo.caption}</span>
          </button>
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
            <figcaption>{current.caption}</figcaption>
          </figure>
        </div>
      )}
    </div>
  )
}
