'use client'

import { useState, useCallback, useRef } from 'react'

interface UseScreenCaptureReturn {
  screenStream: MediaStream | null
  isCapturing: boolean
  error: string | undefined
  startCapture: (includeAudio: boolean) => Promise<void>
  stopCapture: () => void
}

export function useScreenCapture(onStreamEnded?: () => void): UseScreenCaptureReturn {
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null)
  const [isCapturing, setIsCapturing] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const streamRef = useRef<MediaStream | null>(null)

  const stopCapture = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setScreenStream(null)
    setIsCapturing(false)
  }, [])

  const startCapture = useCallback(async (includeAudio: boolean) => {
    try {
      setError(undefined)

      const constraints: DisplayMediaStreamOptions = {
        video: {
          // @ts-expect-error selfBrowserSurface is Chrome 112+ only
          selfBrowserSurface: 'exclude',
        },
        audio: includeAudio,
      }

      let stream: MediaStream
      try {
        stream = await navigator.mediaDevices.getDisplayMedia(constraints)
      } catch {
        // Fallback without selfBrowserSurface
        stream = await navigator.mediaDevices.getDisplayMedia({
          video: true,
          audio: includeAudio,
        })
      }

      // Save display surface preference
      const videoTrack = stream.getVideoTracks()[0]
      if (videoTrack) {
        const settings = videoTrack.getSettings()
        if ('displaySurface' in settings) {
          localStorage.setItem('screenforge:lastDisplaySurface', String(settings.displaySurface))
        }

        // Handle user clicking browser's "Stop sharing"
        videoTrack.onended = () => {
          stopCapture()
          onStreamEnded?.()
        }
      }

      streamRef.current = stream
      setScreenStream(stream)
      setIsCapturing(true)
    } catch (err) {
      const message = err instanceof DOMException
        ? err.name === 'NotAllowedError'
          ? 'Screen sharing permission denied'
          : `Screen capture error: ${err.message}`
        : 'Failed to start screen capture'
      setError(message)
      setIsCapturing(false)
    }
  }, [stopCapture, onStreamEnded])

  return { screenStream, isCapturing, error, startCapture, stopCapture }
}
