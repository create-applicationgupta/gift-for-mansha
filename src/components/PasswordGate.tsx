import { useState, type FormEvent } from 'react'
import { resolveUserFromPassword, site, type SiteUser } from '../content/site'
import { setSessionUser } from '../lib/session'
import './PasswordGate.css'

type Props = {
  onUnlock: (user: SiteUser) => void
}

export function PasswordGate({ onUnlock }: Props) {
  const [value, setValue] = useState('')
  const [error, setError] = useState(false)

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    const user = resolveUserFromPassword(value)
    if (user) {
      sessionStorage.setItem(site.authStorageKey, '1')
      setSessionUser(user)
      setError(false)
      onUnlock(user)
      return
    }
    setError(true)
  }

  return (
    <div className="gate animate-fade-in">
      <div className="atmosphere" aria-hidden="true" />
      <form className="gate-panel animate-fade-up" onSubmit={handleSubmit}>
        <p className="gate-eyebrow">{site.seoPhrase}</p>
        <h1 className="gate-title">{site.gateBrand}</h1>
        <p className="gate-lead">
          Welcome to The Kalimpong Gift Portal — enter the little password we
          share.
        </p>
        <label className="sr-only" htmlFor="site-password">
          Password
        </label>
        <input
          id="site-password"
          className="gate-input"
          type="password"
          autoComplete="current-password"
          value={value}
          onChange={(e) => {
            setValue(e.target.value)
            setError(false)
          }}
          placeholder="Password"
        />
        {error && <p className="gate-error">Not quite — try again.</p>}
        <button className="btn" type="submit">
          Open the door
        </button>
      </form>
    </div>
  )
}
