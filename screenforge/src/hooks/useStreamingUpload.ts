'use client'

import { useRef, useCallback, useState } from 'react'

interface UseStreamingUploadReturn {
  recordingId: string | null
  chunksUploaded: number
  bytesUploaded: number
  isStreaming: boolean
  uploadComplete: boolean
  error: string | undefined
  startStreaming: (title: string, mode: string) => Promise<string | null>
  sendChunk: (chunk: Blob, isLast: boolean) => Promise<void>
  reset: () => void
}

export function useStreamingUpload(): UseStreamingUploadReturn {
  const [recordingId, setRecordingId] = useState<string | null>(null)
  const [chunksUploaded, setChunksUploaded] = useState(0)
  const [bytesUploaded, setBytesUploaded] = useState(0)
  const [isStreaming, setIsStreaming] = useState(false)
  const [uploadComplete, setUploadComplete] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const chunkIndexRef = useRef(0)
  const queueRef = useRef<Promise<void>>(Promise.resolve())

  // Create the recording entry in the DB, returns recordingId
  const startStreaming = useCallback(async (title: string, mode: string): Promise<string | null> => {
    try {
      setError(undefined)
      setIsStreaming(true)
      setUploadComplete(false)
      setChunksUploaded(0)
      setBytesUploaded(0)
      chunkIndexRef.current = 0

      const res = await fetch('/api/recordings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          mode,
          durationSeconds: 0,
          mimeType: 'video/webm',
          fileSize: 0,
          localIdbKey: '',
        }),
      })

      if (!res.ok) throw new Error('Failed to create recording')

      const { id } = await res.json() as { id: string }
      setRecordingId(id)
      return id
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start upload')
      setIsStreaming(false)
      return null
    }
  }, [])

  // Send a chunk to the server — queued to maintain order
  const sendChunk = useCallback(async (chunk: Blob, isLast: boolean) => {
    if (!recordingId) return

    // Queue uploads to maintain chunk order
    queueRef.current = queueRef.current.then(async () => {
      try {
        const index = chunkIndexRef.current++
        const formData = new FormData()
        formData.append('chunk', chunk, `chunk-${index}.webm`)
        formData.append('chunkIndex', String(index))
        formData.append('isLast', String(isLast))

        const res = await fetch(`/api/recordings/${recordingId}/chunk`, {
          method: 'POST',
          body: formData,
        })

        if (!res.ok) throw new Error(`Chunk ${index} upload failed`)

        setChunksUploaded((c) => c + 1)
        setBytesUploaded((b) => b + chunk.size)

        if (isLast) {
          setIsStreaming(false)
          setUploadComplete(true)
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Chunk upload failed')
      }
    })

    await queueRef.current
  }, [recordingId])

  const reset = useCallback(() => {
    setRecordingId(null)
    setChunksUploaded(0)
    setBytesUploaded(0)
    setIsStreaming(false)
    setUploadComplete(false)
    setError(undefined)
    chunkIndexRef.current = 0
    queueRef.current = Promise.resolve()
  }, [])

  return {
    recordingId, chunksUploaded, bytesUploaded,
    isStreaming, uploadComplete, error,
    startStreaming, sendChunk, reset,
  }
}
