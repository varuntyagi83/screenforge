'use client'

import { useRef, useEffect, useCallback } from 'react'

interface VideoPlayerProps {
  src: string
  onTimeUpdate?: (time: number) => void
  seekTo?: number
}

export function VideoPlayer({ src, onTimeUpdate, seekTo }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const lastUpdateRef = useRef(0)

  const handleTimeUpdate = useCallback(() => {
    if (!onTimeUpdate || !videoRef.current) return
    const now = Date.now()
    if (now - lastUpdateRef.current < 250) return
    lastUpdateRef.current = now
    onTimeUpdate(videoRef.current.currentTime)
  }, [onTimeUpdate])

  useEffect(() => {
    if (seekTo !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTo
    }
  }, [seekTo])

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      onTimeUpdate={handleTimeUpdate}
      className="w-full rounded-lg border"
    />
  )
}
