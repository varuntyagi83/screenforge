'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { RecordingState } from '@/types'

function selectMimeType(): string {
  const candidates = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ]
  for (const mime of candidates) {
    if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported(mime)) {
      return mime
    }
  }
  return 'video/webm'
}

interface UseMediaRecorderOptions {
  onChunk?: (chunk: Blob, isLast: boolean) => void
}

interface UseMediaRecorderReturn {
  state: RecordingState
  duration: number
  blob: Blob | null
  error: string | undefined
  startRecording: (stream: MediaStream) => void
  pauseRecording: () => void
  resumeRecording: () => void
  stopRecording: () => void
  discardRecording: () => void
}

export function useMediaRecorder(options?: UseMediaRecorderOptions): UseMediaRecorderReturn {
  const [state, setState] = useState<RecordingState>('idle')
  const [duration, setDuration] = useState(0)
  const [blob, setBlob] = useState<Blob | null>(null)
  const [error, setError] = useState<string | undefined>()

  const recorderRef = useRef<MediaRecorder | null>(null)
  const chunksRef = useRef<Blob[]>([])
  const startedAtRef = useRef<number>(0)
  const pausedAtRef = useRef<number>(0)
  const totalPausedMsRef = useRef<number>(0)
  const rafRef = useRef<number>(0)
  const stateRef = useRef<RecordingState>('idle')

  // Keep stateRef in sync
  useEffect(() => {
    stateRef.current = state
  }, [state])

  // Duration tick function stored in a ref to avoid self-reference lint issue
  const tickRef = useRef<() => void>(() => {})
  useEffect(() => {
    tickRef.current = () => {
      if (stateRef.current === 'recording') {
        const elapsed = Date.now() - startedAtRef.current - totalPausedMsRef.current
        setDuration(Math.floor(elapsed / 1000))
      }
      rafRef.current = requestAnimationFrame(tickRef.current)
    }
  })

  const startDurationLoop = useCallback(() => {
    rafRef.current = requestAnimationFrame(tickRef.current)
  }, [])

  const discardRecording = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      recorderRef.current.stop()
    }
    recorderRef.current = null
    chunksRef.current = []
    startedAtRef.current = 0
    pausedAtRef.current = 0
    totalPausedMsRef.current = 0
    cancelAnimationFrame(rafRef.current)
    setBlob(null)
    setDuration(0)
    setError(undefined)
    setState('idle')
  }, [])

  const startRecording = useCallback((stream: MediaStream) => {
    try {
      setError(undefined)
      setBlob(null)
      chunksRef.current = []
      totalPausedMsRef.current = 0

      const mimeType = selectMimeType()
      const recorder = new MediaRecorder(stream, { mimeType })

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data)
          // Stream chunk to server in real-time
          options?.onChunk?.(e.data, false)
        }
      }

      recorder.onstop = () => {
        const recordedBlob = new Blob(chunksRef.current, { type: mimeType })
        setBlob(recordedBlob)
        cancelAnimationFrame(rafRef.current)
        // Signal last chunk
        if (chunksRef.current.length > 0) {
          const lastChunk = chunksRef.current[chunksRef.current.length - 1]
          if (lastChunk) options?.onChunk?.(lastChunk, true)
        }
        setState('stopped')
      }

      recorder.onerror = () => {
        setError('Recording failed unexpectedly')
        cancelAnimationFrame(rafRef.current)
        setState('error')
      }

      recorder.start(1000) // 1-second chunks
      startedAtRef.current = Date.now()
      recorderRef.current = recorder
      setState('recording')
      startDurationLoop()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start recording')
      setState('error')
    }
  }, [startDurationLoop, options])

  const pauseRecording = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state === 'recording') {
        recorderRef.current.pause()
        pausedAtRef.current = Date.now()
        setState('paused')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to pause recording')
      setState('error')
    }
  }, [])

  const resumeRecording = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state === 'paused') {
        totalPausedMsRef.current += Date.now() - pausedAtRef.current
        recorderRef.current.resume()
        setState('recording')
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resume recording')
      setState('error')
    }
  }, [])

  const stopRecording = useCallback(() => {
    try {
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
      cancelAnimationFrame(rafRef.current)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to stop recording')
      setState('error')
    }
  }, [])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current)
      if (recorderRef.current && recorderRef.current.state !== 'inactive') {
        recorderRef.current.stop()
      }
    }
  }, [])

  return { state, duration, blob, error, startRecording, pauseRecording, resumeRecording, stopRecording, discardRecording }
}
