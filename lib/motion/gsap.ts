'use client'

import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'

// registerPlugin is idempotent, so this is safe on every import and on HMR.
// Guarded for SSR: ScrollTrigger touches window at registration time.
if (typeof window !== 'undefined') {
  gsap.registerPlugin(ScrollTrigger)
}

export { gsap, ScrollTrigger }
