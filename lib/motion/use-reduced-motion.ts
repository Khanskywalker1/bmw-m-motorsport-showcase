'use client'

import { useSyncExternalStore } from 'react'

const QUERY = '(prefers-reduced-motion: reduce)'

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY)
  mq.addEventListener('change', onChange)
  return () => mq.removeEventListener('change', onChange)
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches
}

/**
 * Tracks `prefers-reduced-motion`, including live changes.
 *
 * useSyncExternalStore rather than useEffect + setState: matchMedia is an
 * external store, and reading it in an effect body causes a cascading render
 * on every mount.
 *
 * The server snapshot is false, so the first paint always assumes motion is
 * allowed. That is safe because every primitive here is built so "no JS yet"
 * and "reduced motion" both mean *fully visible content* — animation only ever
 * hides things after this resolves. A reduced-motion user never sees a
 * half-revealed heading or a stuck pin.
 */
export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, () => false)
}
