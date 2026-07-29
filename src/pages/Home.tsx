import { Link } from 'react-router-dom'
import { site } from '../content/site'
import { useAuth } from '../lib/auth'
import './Home.css'

export function Home() {
  const { logout } = useAuth()

  return (
    <section className="hero">
      <div
        className="hero-media"
        style={{ backgroundImage: 'url(/hero-mood.svg)' }}
        role="img"
        aria-label="Soft romantic evening light"
      />
      <div className="hero-veil" aria-hidden="true" />
      <div className="hero-content">
        <h1 className="hero-brand animate-fade-up">{site.brand}</h1>
        <p className="hero-tagline animate-fade-up delay-1">{site.tagline}</p>
        <div className="hero-actions animate-fade-up delay-2">
          <Link className="btn" to="/photos">
            Our photos
          </Link>
          <Link className="btn btn-ghost hero-ghost" to="/notes">
            Leave a note
          </Link>
          <button
            type="button"
            className="btn btn-ghost hero-ghost hero-logout"
            onClick={logout}
          >
            Log out
          </button>
        </div>
        <p className="hero-session-hint animate-fade-up delay-3">
          Session ends automatically after {site.sessionMinutes} minutes.
        </p>
      </div>
    </section>
  )
}
