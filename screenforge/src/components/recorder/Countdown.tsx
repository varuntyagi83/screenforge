'use client'

import { useState, useEffect, useCallback } from 'react'
import type { CountdownProps } from '@/types'

export function Countdown({ seconds, onComplete }: CountdownProps) {
  const [count, setCount] = useState(seconds)
  const [cancelled, setCancelled] = useState(false)

  useEffect(() => {
    if (cancelled) return
    if (count <= 0) {
      onComplete()
      return
    }

    const timer = setTimeout(() => {
      setCount((c) => c - 1)
    }, 1000)

    return () => clearTimeout(timer)
  }, [count, cancelled, onComplete])

  const handleCancel = useCallback(() => {
    setCancelled(true)
  }, [])

  if (cancelled) return null

  return (
    <div className="fixed inset-0 z-[2147483646] flex items-center justify-center bg-black/60 backdrop-blur-sm">
      <div className="flex flex-col items-center gap-6">
        <span
          key={count}
          className="animate-bounce text-9xl font-bold text-white drop-shadow-2xl"
        >
          {count}
        </span>
        <button
          onClick={handleCancel}
          className="rounded-lg bg-white/10 px-6 py-2 text-sm text-white hover:bg-white/20"
        >
          Cancel
        </button>
      </div>
    </div>
  )
}
