'use client'

import { useState, useCallback } from 'react'

interface UseDriveUploadReturn {
  upload: (recordingId: string, blob: Blob, fileName: string) => Promise<void>
  progress: number
  isUploading: boolean
  error: string | undefined
}

export function useDriveUpload(): UseDriveUploadReturn {
  const [progress, setProgress] = useState(0)
  const [isUploading, setIsUploading] = useState(false)
  const [error, setError] = useState<string | undefined>()

  const upload = useCallback(async (recordingId: string, blob: Blob, fileName: string) => {
    try {
      setError(undefined)
      setIsUploading(true)
      setProgress(0)

      const formData = new FormData()
      formData.append('file', blob, fileName)
      formData.append('recordingId', recordingId)

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest()
        xhr.open('POST', '/api/recordings/upload')

        xhr.upload.onprogress = (e: ProgressEvent) => {
          if (e.lengthComputable) {
            setProgress(Math.round((e.loaded / e.total) * 100))
          }
        }

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            setProgress(100)
            resolve()
          } else {
            reject(new Error(`Upload failed: ${xhr.statusText}`))
          }
        }

        xhr.onerror = () => reject(new Error('Upload failed: network error'))
        xhr.send(formData)
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed')
    } finally {
      setIsUploading(false)
    }
  }, [])

  return { upload, progress, isUploading, error }
}
