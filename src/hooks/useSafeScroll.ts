import { useScroll } from 'framer-motion'
import { useEffect, useState, RefObject } from 'react'

/**
 * Wraps useScroll so the target ref is only passed after it is attached to the DOM.
 * Framer Motion v12 throws "Target ref is defined but not hydrated" whenever the ref
 * object is truthy but ref.current is null (happens on SSR and during loading skeletons).
 * Checking ref.current directly handles both the initialEvents-provided case (loading
 * starts false) and the async-fetch case (mounted becomes true while loading is true).
 */
export function useSafeScroll(
  ref: RefObject<HTMLElement | null>,
  options?: Omit<Parameters<typeof useScroll>[0], 'target'>
) {
  const [refReady, setRefReady] = useState(false)

  // No dep array: runs after every render until the ref attaches.
  // Once ready, the guard short-circuits to avoid extra setState calls.
  useEffect(() => {
    if (!refReady && ref.current) setRefReady(true)
  })

  return useScroll({ ...options, target: refReady ? ref : undefined })
}
