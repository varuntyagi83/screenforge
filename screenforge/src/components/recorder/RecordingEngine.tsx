'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import Link from 'next/link'
import { Monitor, Camera, PictureInPicture2, Download, Save, Loader2, Check, Trash2, Upload, Cloud } from 'lucide-react'
import { useScreenCapture } from '@/hooks/useScreenCapture'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { useWebcam } from '@/hooks/useWebcam'
import { usePiPCompositor } from '@/hooks/usePiPCompositor'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { useStreamingUpload } from '@/hooks/useStreamingUpload'
import { ModeSelector } from '@/components/recorder/ModeSelector'
import { DevicePicker } from '@/components/recorder/DevicePicker'
import { Countdown } from '@/components/recorder/Countdown'
import { ControlBar } from '@/components/recorder/ControlBar'
import { PiPCanvas } from '@/components/recorder/PiPCanvas'
import type { RecordingMode, PiPConfig } from '@/types'

type CameraPosition = PiPConfig['cameraPosition']

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`
}

export function RecordingEngine() {
  const [mode, setMode] = useState<RecordingMode>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('screenforge:recordingMode') as RecordingMode : null) ?? 'screen'
  )
  const [showCountdown, setShowCountdown] = useState(false)
  const [isControlBarCollapsed, setIsControlBarCollapsed] = useState(false)
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('bottom-right')
  const [title, setTitle] = useState('')

  const streaming = useStreamingUpload()
  const streamingRef = useRef(streaming)
  streamingRef.current = streaming

  // Recorder with real-time chunk streaming
  const recorder = useMediaRecorder({
    onChunk: (chunk, isLast) => {
      const s = streamingRef.current
      if (s.recordingId) {
        void s.sendChunk(chunk, isLast)
      }
    },
  })

  const screenCapture = useScreenCapture(() => recorder.stopRecording())
  const webcam = useWebcam()
  const compositor = usePiPCompositor()

  const isRecordingActive = recorder.state === 'recording' || recorder.state === 'paused'

  const previewUrl = useMemo(() => {
    return recorder.blob ? URL.createObjectURL(recorder.blob) : null
  }, [recorder.blob])

  const previewUrlRef = useRef<string | null>(null)
  useEffect(() => {
    const prevUrl = previewUrlRef.current
    previewUrlRef.current = previewUrl
    return () => {
      if (prevUrl) URL.revokeObjectURL(prevUrl)
    }
  }, [previewUrl])

  useEffect(() => {
    if (recorder.state === 'stopped' && !title) {
      setTitle(`Recording ${new Date().toLocaleString()}`)
    }
  }, [recorder.state, title])

  const startFlow = useCallback(async () => {
    try {
      if (mode === 'screen') {
        await screenCapture.startCapture(true)
      } else if (mode === 'camera') {
        await webcam.startWebcam()
      } else {
        await screenCapture.startCapture(true)
        await webcam.startWebcam()
      }
      setShowCountdown(true)
    } catch {
      // Errors handled by hooks
    }
  }, [mode, screenCapture, webcam])

  const onCountdownComplete = useCallback(async () => {
    setShowCountdown(false)

    // Create recording entry in DB before starting — so chunks have a target
    const recordingTitle = `Recording ${new Date().toLocaleString()}`
    setTitle(recordingTitle)
    const recId = await streaming.startStreaming(recordingTitle, mode)

    if (!recId) return // Failed to create entry

    if (mode === 'screen' && screenCapture.screenStream) {
      recorder.startRecording(screenCapture.screenStream)
    } else if (mode === 'camera' && webcam.webcamStream) {
      recorder.startRecording(webcam.webcamStream)
    } else if (mode === 'pip' && screenCapture.screenStream && webcam.webcamStream) {
      compositor.startCompositing(screenCapture.screenStream, webcam.webcamStream)
      requestAnimationFrame(() => {
        if (compositor.compositeStream) {
          recorder.startRecording(compositor.compositeStream)
        }
      })
    }
  }, [mode, screenCapture.screenStream, webcam.webcamStream, compositor, recorder, streaming])

  const handleStop = useCallback(() => {
    recorder.stopRecording()
    screenCapture.stopCapture()
    webcam.stopWebcam()
    compositor.stopCompositing()
  }, [recorder, screenCapture, webcam, compositor])

  const handleDiscard = useCallback(() => {
    recorder.discardRecording()
    screenCapture.stopCapture()
    webcam.stopWebcam()
    compositor.stopCompositing()
    streaming.reset()
    setTitle('')
  }, [recorder, screenCapture, webcam, compositor, streaming])

  // Fallback: save locally + upload full file (if streaming wasn't used)
  const handleSaveManually = useCallback(async () => {
    if (!recorder.blob) return

    try {
      // Create recording if not already streaming
      let recId = streaming.recordingId
      if (!recId) {
        const res = await fetch('/api/recordings', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title: title || 'Untitled Recording',
            mode,
            durationSeconds: recorder.duration,
            mimeType: recorder.blob.type || 'video/webm',
            fileSize: recorder.blob.size,
            localIdbKey: '',
          }),
        })
        if (!res.ok) throw new Error('Failed to create recording')
        const data = await res.json() as { id: string }
        recId = data.id
      }

      // Upload full file
      const formData = new FormData()
      formData.append('file', recorder.blob, `${title || 'recording'}.webm`)
      formData.append('recordingId', recId)

      const uploadRes = await fetch('/api/recordings/upload', { method: 'POST', body: formData })
      if (!uploadRes.ok) throw new Error('Upload failed')
    } catch (err) {
      console.error('Manual save failed:', err)
    }
  }, [recorder.blob, recorder.duration, streaming.recordingId, title, mode])

  const handleToggleRecording = useCallback(() => {
    if (recorder.state === 'idle') {
      void startFlow()
    } else if (isRecordingActive) {
      handleStop()
    }
  }, [recorder.state, isRecordingActive, startFlow, handleStop])

  const handleTogglePause = useCallback(() => {
    if (recorder.state === 'recording') {
      recorder.pauseRecording()
    } else if (recorder.state === 'paused') {
      recorder.resumeRecording()
    }
  }, [recorder])

  useKeyboardShortcuts({
    onToggleRecording: handleToggleRecording,
    onTogglePause: handleTogglePause,
  }, true)

  const error = screenCapture.error ?? webcam.error ?? recorder.error ?? compositor.error ?? streaming.error

  // Stopped state — show preview
  if (recorder.state === 'stopped' && previewUrl) {
    const uploadDone = streaming.uploadComplete

    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h2 className="text-xl font-semibold">Recording Complete</h2>

        <video src={previewUrl} controls className="w-full rounded-lg border" />

        {/* Editable title */}
        <div>
          <label className="mb-1 block text-sm font-medium text-gray-700">Title</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Give your recording a name..."
            className="w-full rounded-lg border px-3 py-2 text-sm focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Real-time upload status */}
        {streaming.isStreaming && (
          <div className="flex items-center gap-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
            <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
            <div className="text-sm">
              <span className="font-medium text-blue-900">Uploading to cloud...</span>
              <span className="ml-2 text-blue-700">
                {streaming.chunksUploaded} chunks &middot; {formatBytes(streaming.bytesUploaded)}
              </span>
            </div>
          </div>
        )}

        {uploadDone && (
          <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 p-3">
            <Cloud className="h-4 w-4 text-green-600" />
            <span className="text-sm font-medium text-green-900">
              Uploaded to Google Drive &middot; {streaming.chunksUploaded} chunks &middot; {formatBytes(streaming.bytesUploaded)}
            </span>
          </div>
        )}

        {streaming.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            Upload error: {streaming.error}
          </div>
        )}

        {error && !streaming.error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Action buttons */}
        <div className="flex flex-wrap gap-3">
          {uploadDone ? (
            <Link
              href="/library"
              className="flex items-center gap-2 rounded-lg bg-green-600 px-4 py-2 text-white hover:bg-green-700"
            >
              <Check className="h-4 w-4" /> Saved — Go to Library
            </Link>
          ) : streaming.isStreaming ? (
            <button disabled className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white opacity-70">
              <Loader2 className="h-4 w-4 animate-spin" /> Uploading...
            </button>
          ) : streaming.error ? (
            <button
              onClick={() => void handleSaveManually()}
              className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
            >
              <Upload className="h-4 w-4" /> Retry Full Upload
            </button>
          ) : (
            <button
              onClick={() => void handleSaveManually()}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
            >
              <Save className="h-4 w-4" /> Save to Library
            </button>
          )}

          <a
            href={previewUrl}
            download={`${title || 'recording'}.webm`}
            className="flex items-center gap-2 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            <Download className="h-4 w-4" /> Download
          </a>

          <button
            onClick={handleDiscard}
            className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-red-600 hover:bg-red-50"
          >
            <Trash2 className="h-4 w-4" /> Discard
          </button>
        </div>

        <div className="text-xs text-gray-500">
          {mode} mode &middot; {recorder.duration}s &middot; {formatBytes(recorder.blob?.size ?? 0)}
        </div>
      </div>
    )
  }

  // Recording / idle state
  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New Recording</h1>

        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-600">Recording Mode</h3>
          <ModeSelector selected={mode} onChange={setMode} />
        </div>

        {(mode === 'camera' || mode === 'pip') && (
          <DevicePicker
            audioDevices={webcam.audioDevices}
            videoDevices={webcam.videoDevices}
            selectedAudio={webcam.selectedAudioDevice}
            selectedVideo={webcam.selectedVideoDevice}
            onAudioChange={webcam.setAudioDevice}
            onVideoChange={webcam.setVideoDevice}
          />
        )}

        {mode === 'pip' && (
          <PiPCanvas
            canvasRef={compositor.canvasRef}
            isCompositing={compositor.isCompositing}
            cameraPosition={cameraPosition}
            onPositionChange={(pos) => {
              setCameraPosition(pos)
              compositor.updateCameraPosition(pos)
            }}
            fps={compositor.fps}
          />
        )}

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Live streaming indicator */}
        {isRecordingActive && streaming.isStreaming && (
          <div className="flex items-center gap-2 text-xs text-green-600">
            <Cloud className="h-3 w-3" />
            Streaming to cloud: {streaming.chunksUploaded} chunks &middot; {formatBytes(streaming.bytesUploaded)}
          </div>
        )}

        {recorder.state === 'idle' && (
          <button
            onClick={() => void startFlow()}
            className="flex items-center gap-2 rounded-lg bg-red-600 px-6 py-3 text-lg font-medium text-white hover:bg-red-700"
          >
            {mode === 'screen' && <Monitor className="h-5 w-5" />}
            {mode === 'camera' && <Camera className="h-5 w-5" />}
            {mode === 'pip' && <PictureInPicture2 className="h-5 w-5" />}
            Start Recording
          </button>
        )}

        <p className="text-xs text-gray-500">
          Shortcuts: Ctrl+Shift+R to start/stop, Ctrl+Shift+P to pause/resume
        </p>
      </div>

      {showCountdown && (
        <Countdown seconds={3} onComplete={() => void onCountdownComplete()} />
      )}

      {isRecordingActive && (
        <ControlBar
          state={recorder.state}
          duration={recorder.duration}
          onStart={() => void startFlow()}
          onPause={recorder.pauseRecording}
          onResume={recorder.resumeRecording}
          onStop={handleStop}
          onDiscard={handleDiscard}
          isCollapsed={isControlBarCollapsed}
          onToggleCollapse={() => setIsControlBarCollapsed((c) => !c)}
        />
      )}
    </div>
  )
}
