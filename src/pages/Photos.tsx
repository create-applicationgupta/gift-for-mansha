import { useEffect, useState } from 'react'
import { photos } from '../content/photos'
import './Photos.css'

export function Photos() {
  const [active, setActive] = useState<number | null>(null)

  useEffect(() => {
    if (active === null) return

    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setActive(null)
      if (e.key === 'ArrowRight' && active !== null) {
        setActive((i) => (i === null ? i : (i + 1) % photos.length))
      }
      if (e.key === 'ArrowLeft' && active !== null) {
        setActive((i) =>
          i === null ? i : (i - 1 + photos.length) % photos.length,
        )
      }
    }

    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active])

  const current = active !== null ? photos[active] : null

  return (
    <div className="page photos-page">
      <h1 className="page-title animate-fade-up">Our photos</h1>
      <p className="page-lead animate-fade-up delay-1">
        A few moments we keep close. Replace the placeholders with your own —
        they already know where to live.
      </p>

      <div className="photo-grid">
        {photos.map((photo, index) => (
          <button
            key={photo.src}
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
