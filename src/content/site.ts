/** Edit these to personalize your gift site */

export const site = {
  /** SEO / search phrase shown on the public gate */
  seoPhrase: 'The Kalimpong Gift Portal',
  /** Shown only after both gates are passed (home, nav, etc.) */
  brand: 'For Mansha',
  /** Shown on password / challenge screens before unlock */
  gateBrand: 'Our Personal Space',
  /** Short line under the brand on the home hero */
  tagline: 'A quiet place made just for us — our photos, our words.',
  /** Your name (shown in love notes author picker) */
  yourName: 'Tutul',
  /** Her name (shown in love notes author picker) */
  herName: 'Mansha',
  /**
   * Shared password to open the site.
   * Change this before sharing the link.
   */
  password: 'oursecret',
  /** Second gate — favorite place (checked case-insensitively) */
  challengeQuestion: 'What is your favorite place?',
  challengeAnswer: 'Kalimpong',
  /** Session key for remembering unlock in this browser */
  authStorageKey: 'gift-site-unlocked',
  /** Session key after the favorite-place challenge */
  challengeStorageKey: 'gift-site-challenge-ok',
  /** Auto-logout after this many minutes */
  sessionMinutes: 15,
  /** sessionStorage key for absolute session expiry timestamp */
  sessionExpiresKey: 'gift-site-session-expires',
} as const

/** Nav / future sections — add a route here when you add a new page */
export const sections = [
  { path: '/', label: 'Home', id: 'home' },
  { path: '/photos', label: 'Photos', id: 'photos' },
  { path: '/notes', label: 'Love notes', id: 'notes' },
  // { path: '/timeline', label: 'Timeline', id: 'timeline' },
] as const
