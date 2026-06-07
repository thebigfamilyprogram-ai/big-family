'use client'

import { useEffect } from 'react'
import { useLocale } from 'next-intl'

export default function HtmlDirSync() {
  const locale = useLocale()
  useEffect(() => {
    document.documentElement.dir  = locale === 'ar' ? 'rtl' : 'ltr'
    document.documentElement.lang = locale
  }, [locale])
  return null
}
