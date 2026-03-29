'use client'

import { useEffect, useRef } from 'react'
import type { DevicePickerProps } from '@/types'

export function DevicePicker({
  audioDevices,
  videoDevices,
  selectedAudio,
  selectedVideo,
  onAudioChange,
  onVideoChange,
}: DevicePickerProps) {
  const previewRef = useRef<HTMLVideoElement>(null)

  // Live camera preview
  useEffect(() => {
    if (!selectedVideo || !previewRef.current) return

    let stream: MediaStream | null = null
    const video = previewRef.current

    const startPreview = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: { deviceId: { exact: selectedVideo } },
          audio: false,
        })
        video.srcObject = stream
        await video.play()
      } catch {
        // Preview failed silently
      }
    }

    void startPreview()

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop())
      }
      video.srcObject = null
    }
  }, [selectedVideo])

  return (
    <div className="space-y-4">
      {/* Audio input */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Microphone</label>
        <select
          value={selectedAudio ?? ''}
          onChange={(e) => onAudioChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {audioDevices.length === 0 && <option value="">No microphones found</option>}
          {audioDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Video input */}
      <div>
        <label className="mb-1 block text-sm font-medium text-gray-700">Camera</label>
        <select
          value={selectedVideo ?? ''}
          onChange={(e) => onVideoChange(e.target.value)}
          className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
        >
          {videoDevices.length === 0 && <option value="">No cameras found</option>}
          {videoDevices.map((d) => (
            <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
          ))}
        </select>
      </div>

      {/* Camera preview */}
      {selectedVideo && (
        <div className="overflow-hidden rounded-lg border border-gray-200">
          <video
            ref={previewRef}
            muted
            playsInline
            className="h-32 w-full object-cover"
          />
        </div>
      )}
    </div>
  )
}
