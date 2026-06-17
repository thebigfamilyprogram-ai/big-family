// three-globe accesses `window.THREE` and `window.innerWidth/Height` at module
// init time (no `typeof` guard). This file must be imported BEFORE three-globe
// so the global is defined when three-globe's top-level code runs.
if (typeof window === 'undefined') {
  ;(globalThis as any).window = {
    THREE:               undefined,   // three-globe checks this, falls back to require()
    innerWidth:          800,
    innerHeight:         600,
    devicePixelRatio:    1,
    addEventListener:    () => {},
    removeEventListener: () => {},
  }
}
