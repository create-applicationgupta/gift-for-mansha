import { useEffect, useState, type FormEvent } from 'react'
import { site } from '../content/site'
import './PasswordGate.css'
import './ChallengeGate.css'

type Props = {
  onPass: () => void
  onFail: () => void
}

function normalizeAnswer(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, ' ')
}

export function ChallengeGate({ onPass, onFail }: Props) {
  const [value, setValue] = useState('')
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    if (!failed) return
    const timer = window.setTimeout(() => {
      onFail()
    }, 2200)
    return () => window.clearTimeout(timer)
  }, [failed, onFail])

  function handleSubmit(e: FormEvent) {
    e.preventDefault()
    if (failed) return

    const ok =
      normalizeAnswer(value) === normalizeAnswer(site.challengeAnswer)

    if (ok) {
      sessionStorage.setItem(site.challengeStorageKey, '1')
      onPass()
      return
    }

    setFailed(true)
  }

  if (failed) {
    return (
      <div className="gate animate-fade-in">
        <div className="atmosphere" aria-hidden="true" />
        <div className="gate-panel challenge-fail animate-fade-up" role="alert">
          <p className="gate-eyebrow">Access denied</p>
          <h1 className="gate-title challenge-fail-title">Get out, imposter</h1>
          <p className="gate-lead">Sending you back to the door…</p>
        </div>
      </div>
    )
  }

  return (
    <div className="gate animate-fade-in">
      <div className="atmosphere" aria-hidden="true" />
      <form className="gate-panel animate-fade-up" onSubmit={handleSubmit}>
        <p className="gate-eyebrow">One more thing</p>
        <h1 className="gate-title challenge-title">Prove it&apos;s you</h1>
        <p className="gate-lead">{site.challengeQuestion}</p>
        <label className="sr-only" htmlFor="favorite-place">
          Favorite place
        </label>
        <input
          id="favorite-place"
          className="gate-input"
          type="text"
          autoComplete="off"
          autoFocus
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Your answer…"
        />
        <button className="btn" type="submit" disabled={!value.trim()}>
          Continue
        </button>
      </form>
    </div>
  )
}
