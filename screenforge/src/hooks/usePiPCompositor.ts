'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { PiPConfig } from '@/types'

type CameraPosition = PiPConfig['cameraPosition']

interface UsePiPCompositorReturn {
  compositeStream: MediaStream | null
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isCompositing: boolean
  fps: number
  error: string | undefined
  startCompositing: (screenStream: MediaStream, cameraStream: MediaStream) => void
  stopCompositing: () => void
  updateCameraPosition: (position: CameraPosition) => void
}

export function usePiPCompositor(): UsePiPCompositorReturn {
  const [compositeStream, setCompositeStream] = useState<MediaStream | null>(null)
  const [isCompositing, setIsCompositing] = useState(false)
  const [fps, setFps] = useState(0)
  const [error, setError] = useState<string | undefined>()

  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const rafRef = useRef<number>(0)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const cameraPositionRef = useRef<CameraPosition>('bottom-right')
  const frameCountRef = useRef(0)
  const lastFpsUpdateRef = useRef(0)
  const lowFpsStartRef = useRef(0)
  const scaleRef = useRef(1)

  const stopCompositing = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
      void audioCtxRef.current.close()
      audioCtxRef.current = null
    }
    setCompositeStream(null)
    setIsCompositing(false)
    setFps(0)
    scaleRef.current = 1
  }, [])

  const startCompositing = useCallback((screenStream: MediaStream, cameraStream: MediaStream) => {
    try {
      setError(undefined)
      const canvas = canvasRef.current
      if (!canvas) {
        setError('Canvas element not available')
        return
      }

      const screenTrack = screenStream.getVideoTracks()[0]
      if (!screenTrack) {
        setError('No video track in screen stream')
        return
      }

      const settings = screenTrack.getSettings()
      const width = settings.width ?? 1920
      const height = settings.height ?? 1080
      canvas.width = width
      canvas.height = height

      const ctx = canvas.getContext('2d')
      if (!ctx) {
        setError('Failed to get canvas context')
        return
      }

      // Create video elements for drawing
      const screenVideo = document.createElement('video')
      screenVideo.srcObject = screenStream
      screenVideo.muted = true
      void screenVideo.play()

      const cameraVideo = document.createElement('video')
      cameraVideo.srcObject = cameraStream
      cameraVideo.muted = true
      void cameraVideo.play()

      const cameraSize = 180
      const offset = 20

      // Audio mixing
      const audioCtx = new AudioContext()
      audioCtxRef.current = audioCtx
      const dest = audioCtx.createMediaStreamDestination()

      const screenAudioTracks = screenStream.getAudioTracks()
      if (screenAudioTracks.length > 0) {
        const screenSource = audioCtx.createMediaStreamSource(new MediaStream(screenAudioTracks))
        screenSource.connect(dest)
      }

      const cameraAudioTracks = cameraStream.getAudioTracks()
      if (cameraAudioTracks.length > 0) {
        const cameraSource = audioCtx.createMediaStreamSource(new MediaStream(cameraAudioTracks))
        cameraSource.connect(dest)
      }

      frameCountRef.current = 0
      lastFpsUpdateRef.current = performance.now()
      lowFpsStartRef.current = 0

      const draw = () => {
        const scale = scaleRef.current
        const cw = canvas.width * scale
        const ch = canvas.height * scale
        if (canvas.width !== cw || canvas.height !== ch) {
          canvas.width = cw
          canvas.height = ch
        }

        ctx.drawImage(screenVideo, 0, 0, canvas.width, canvas.height)

        // Camera circle
        const pos = cameraPositionRef.current
        const scaledSize = cameraSize * scale
        const scaledOffset = offset * scale
        let cx: number, cy: number

        switch (pos) {
          case 'bottom-right':
            cx = canvas.width - scaledSize / 2 - scaledOffset
            cy = canvas.height - scaledSize / 2 - scaledOffset
            break
          case 'bottom-left':
            cx = scaledSize / 2 + scaledOffset
            cy = canvas.height - scaledSize / 2 - scaledOffset
            break
          case 'top-right':
            cx = canvas.width - scaledSize / 2 - scaledOffset
            cy = scaledSize / 2 + scaledOffset
            break
          case 'top-left':
            cx = scaledSize / 2 + scaledOffset
            cy = scaledSize / 2 + scaledOffset
            break
        }

        ctx.save()
        ctx.beginPath()
        ctx.arc(cx, cy, scaledSize / 2, 0, Math.PI * 2)
        ctx.clip()
        ctx.drawImage(cameraVideo, cx - scaledSize / 2, cy - scaledSize / 2, scaledSize, scaledSize)
        ctx.restore()

        // Border ring
        ctx.beginPath()
        ctx.arc(cx, cy, scaledSize / 2, 0, Math.PI * 2)
        ctx.strokeStyle = 'rgba(255,255,255,0.8)'
        ctx.lineWidth = 3 * scale
        ctx.stroke()

        // FPS tracking
        frameCountRef.current++
        const now = performance.now()
        if (now - lastFpsUpdateRef.current >= 1000) {
          const currentFps = frameCountRef.current
          setFps(currentFps)
          frameCountRef.current = 0
          lastFpsUpdateRef.current = now

          // Performance guard
          if (currentFps < 15) {
            if (lowFpsStartRef.current === 0) lowFpsStartRef.current = now
            else if (now - lowFpsStartRef.current > 5000 && scaleRef.current > 0.5) {
              scaleRef.current = 0.5
            }
          } else {
            lowFpsStartRef.current = 0
          }
        }

        rafRef.current = requestAnimationFrame(draw)
      }

      rafRef.current = requestAnimationFrame(draw)

      // Capture stream from canvas + mixed audio
      const canvasStream = canvas.captureStream(30)
      const audioTracks = dest.stream.getAudioTracks()
      for (const track of audioTracks) {
        canvasStream.addTrack(track)
      }

      setCompositeStream(canvasStream)
      setIsCompositing(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start compositing')
    }
  }, [])

  const updateCameraPosition = useCallback((position: CameraPosition) => {
    cameraPositionRef.current = position
  }, [])

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (audioCtxRef.current && audioCtxRef.current.state !== 'closed') {
        void audioCtxRef.current.close()
      }
    }
  }, [])

  return { compositeStream, canvasRef, isCompositing, fps, error, startCompositing, stopCompositing, updateCameraPosition }
}
