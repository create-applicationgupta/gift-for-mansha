/** Edit these to personalize your gift site */

export const site = {
  /** Couple / gift title shown as the brand */
  brand: 'For Mansha',
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
} as const

/** Nav / future sections — add a route here when you add a new page */
export const sections = [
  { path: '/', label: 'Home', id: 'home' },
  { path: '/photos', label: 'Photos', id: 'photos' },
  { path: '/notes', label: 'Love notes', id: 'notes' },
  // { path: '/timeline', label: 'Timeline', id: 'timeline' },
] as const
