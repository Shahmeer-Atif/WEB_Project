'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'

const INACTIVITY_LIMIT = 30 * 60 * 1000  // 30 min
const WARNING_BEFORE   =  5 * 60 * 1000  //  5 min before → warn at 25 min

export function useInactivityLogout() {
  const router   = useRouter()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const warnRef  = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showWarning, setShowWarning] = useState(false)

  const logout = useCallback(async () => {
    setShowWarning(false)
    await fetch('/api/auth/logout', { method: 'POST' })
    router.push('/?reason=inactivity')
    router.refresh()
  }, [router])

  const reset = useCallback(() => {
    setShowWarning(false)
    if (timerRef.current) clearTimeout(timerRef.current)
    if (warnRef.current)  clearTimeout(warnRef.current)
    warnRef.current  = setTimeout(() => setShowWarning(true),  INACTIVITY_LIMIT - WARNING_BEFORE)
    timerRef.current = setTimeout(logout, INACTIVITY_LIMIT)
  }, [logout])

  useEffect(() => {
    const events = ['mousemove', 'mousedown', 'keydown', 'touchstart', 'scroll', 'click']
    events.forEach(e => window.addEventListener(e, reset, { passive: true }))
    reset()
    return () => {
      events.forEach(e => window.removeEventListener(e, reset))
      if (timerRef.current) clearTimeout(timerRef.current)
      if (warnRef.current)  clearTimeout(warnRef.current)
    }
  }, [reset])

  return { showWarning, stayLoggedIn: reset }
}