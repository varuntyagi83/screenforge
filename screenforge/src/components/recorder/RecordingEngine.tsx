'use client'

import { useState, useCallback, useRef, useMemo, useEffect } from 'react'
import { Monitor, Camera, PictureInPicture2, Download } from 'lucide-react'
import { useScreenCapture } from '@/hooks/useScreenCapture'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'
import { useWebcam } from '@/hooks/useWebcam'
import { usePiPCompositor } from '@/hooks/usePiPCompositor'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'
import { ModeSelector } from '@/components/recorder/ModeSelector'
import { DevicePicker } from '@/components/recorder/DevicePicker'
import { Countdown } from '@/components/recorder/Countdown'
import { ControlBar } from '@/components/recorder/ControlBar'
import { PiPCanvas } from '@/components/recorder/PiPCanvas'
import type { RecordingMode, PiPConfig } from '@/types'

type CameraPosition = PiPConfig['cameraPosition']

export function RecordingEngine() {
  const [mode, setMode] = useState<RecordingMode>(
    () => (typeof window !== 'undefined' ? localStorage.getItem('screenforge:recordingMode') as RecordingMode : null) ?? 'screen'
  )
  const [showCountdown, setShowCountdown] = useState(false)
  const [isControlBarCollapsed, setIsControlBarCollapsed] = useState(false)
  const [cameraPosition, setCameraPosition] = useState<CameraPosition>('bottom-right')


  const recorder = useMediaRecorder()
  const screenCapture = useScreenCapture(() => recorder.stopRecording())
  const webcam = useWebcam()
  const compositor = usePiPCompositor()

  const isRecordingActive = recorder.state === 'recording' || recorder.state === 'paused'

  // Create a stable object URL for the blob, revoke on change
  const previewUrl = useMemo(() => {
    return recorder.blob ? URL.createObjectURL(recorder.blob) : null
  }, [recorder.blob])

  const previewUrlRef = useRef<string | null>(null)
  useEffect(() => {
    // Revoke previous URL when a new one is created
    const prevUrl = previewUrlRef.current
    previewUrlRef.current = previewUrl
    return () => {
      if (prevUrl) URL.revokeObjectURL(prevUrl)
    }
  }, [previewUrl])

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

  const onCountdownComplete = useCallback(() => {
    setShowCountdown(false)

    if (mode === 'screen' && screenCapture.screenStream) {
      recorder.startRecording(screenCapture.screenStream)
    } else if (mode === 'camera' && webcam.webcamStream) {
      recorder.startRecording(webcam.webcamStream)
    } else if (mode === 'pip' && screenCapture.screenStream && webcam.webcamStream) {
      compositor.startCompositing(screenCapture.screenStream, webcam.webcamStream)
      // Wait a frame for composite stream
      requestAnimationFrame(() => {
        if (compositor.compositeStream) {
          recorder.startRecording(compositor.compositeStream)
        }
      })
    }
  }, [mode, screenCapture.screenStream, webcam.webcamStream, compositor, recorder])

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
    // blob will be null after discard, useMemo will handle URL
  }, [recorder, screenCapture, webcam, compositor])

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

  const error = screenCapture.error ?? webcam.error ?? recorder.error ?? compositor.error

  // Stopped state — show preview
  if (recorder.state === 'stopped' && previewUrl) {
    return (
      <div className="mx-auto max-w-3xl space-y-6 p-6">
        <h2 className="text-xl font-semibold">Recording Complete</h2>
        <video src={previewUrl} controls className="w-full rounded-lg border" />
        <div className="flex gap-3">
          <a
            href={previewUrl}
            download="screenforge-recording.webm"
            className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-white hover:bg-blue-700"
          >
            <Download className="h-4 w-4" /> Download WebM
          </a>
          <button
            onClick={handleDiscard}
            className="rounded-lg border border-gray-300 px-4 py-2 text-gray-700 hover:bg-gray-50"
          >
            Record Again
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-2xl space-y-8 p-6">
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">New Recording</h1>

        {/* Mode selector */}
        <div>
          <h3 className="mb-2 text-sm font-medium text-gray-600">Recording Mode</h3>
          <ModeSelector selected={mode} onChange={setMode} />
        </div>

        {/* Device picker (camera/pip modes) */}
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

        {/* PiP canvas */}
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

        {/* Error */}
        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
            {error}
          </div>
        )}

        {/* Start button */}
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

      {/* Countdown overlay */}
      {showCountdown && (
        <Countdown seconds={3} onComplete={onCountdownComplete} />
      )}

      {/* Control bar */}
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
