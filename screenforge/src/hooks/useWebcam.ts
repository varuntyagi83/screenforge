'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import type { MediaDeviceInfo as AppMediaDeviceInfo } from '@/types'

interface UseWebcamReturn {
  webcamStream: MediaStream | null
  audioDevices: AppMediaDeviceInfo[]
  videoDevices: AppMediaDeviceInfo[]
  selectedAudioDevice: string | null
  selectedVideoDevice: string | null
  setAudioDevice: (deviceId: string) => void
  setVideoDevice: (deviceId: string) => void
  isActive: boolean
  error: string | undefined
  startWebcam: () => Promise<void>
  stopWebcam: () => void
  refreshDevices: () => Promise<void>
}

export function useWebcam(): UseWebcamReturn {
  const [webcamStream, setWebcamStream] = useState<MediaStream | null>(null)
  const [audioDevices, setAudioDevices] = useState<AppMediaDeviceInfo[]>([])
  const [videoDevices, setVideoDevices] = useState<AppMediaDeviceInfo[]>([])
  const [selectedAudioDevice, setSelectedAudioDevice] = useState<string | null>(
    () => typeof window !== 'undefined' ? localStorage.getItem('screenforge:audioDevice') : null
  )
  const [selectedVideoDevice, setSelectedVideoDevice] = useState<string | null>(
    () => typeof window !== 'undefined' ? localStorage.getItem('screenforge:videoDevice') : null
  )
  const [isActive, setIsActive] = useState(false)
  const [error, setError] = useState<string | undefined>()
  const streamRef = useRef<MediaStream | null>(null)

  const refreshDevices = useCallback(async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices()
      const audio: AppMediaDeviceInfo[] = devices
        .filter((d) => d.kind === 'audioinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${d.deviceId.slice(0, 5)}`, kind: 'audioinput' as const }))
      const video: AppMediaDeviceInfo[] = devices
        .filter((d) => d.kind === 'videoinput')
        .map((d) => ({ deviceId: d.deviceId, label: d.label || `Camera ${d.deviceId.slice(0, 5)}`, kind: 'videoinput' as const }))
      setAudioDevices(audio)
      setVideoDevices(video)
    } catch {
      setError('Failed to enumerate devices')
    }
  }, [])

  const stopWebcam = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
    setWebcamStream(null)
    setIsActive(false)
  }, [])

  const startWebcam = useCallback(async () => {
    try {
      setError(undefined)
      stopWebcam()

      const constraints: MediaStreamConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          ...(selectedVideoDevice ? { deviceId: { exact: selectedVideoDevice } } : {}),
        },
        audio: selectedAudioDevice ? { deviceId: { exact: selectedAudioDevice } } : true,
      }

      const stream = await navigator.mediaDevices.getUserMedia(constraints)
      streamRef.current = stream
      setWebcamStream(stream)
      setIsActive(true)

      // Refresh device labels (they populate after permission grant)
      await refreshDevices()
    } catch (err) {
      if (err instanceof DOMException) {
        if (err.name === 'NotAllowedError') {
          setError('Camera/microphone permission denied. Please allow access in browser settings.')
        } else if (err.name === 'NotFoundError') {
          setError('No camera or microphone found. Please connect a device and try again.')
        } else {
          setError(`Device error: ${err.message}`)
        }
      } else {
        setError('Failed to start camera')
      }
      setIsActive(false)
    }
  }, [selectedAudioDevice, selectedVideoDevice, stopWebcam, refreshDevices])

  const setAudioDevice = useCallback((deviceId: string) => {
    setSelectedAudioDevice(deviceId)
    localStorage.setItem('screenforge:audioDevice', deviceId)
  }, [])

  const setVideoDevice = useCallback((deviceId: string) => {
    setSelectedVideoDevice(deviceId)
    localStorage.setItem('screenforge:videoDevice', deviceId)
  }, [])

  // Listen for device changes and enumerate on mount
  useEffect(() => {
    const handler = () => { void refreshDevices() }
    navigator.mediaDevices.addEventListener('devicechange', handler)
    // Trigger initial enumeration via the same handler pattern
    handler()
    return () => {
      navigator.mediaDevices.removeEventListener('devicechange', handler)
    }
  }, [refreshDevices])

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (streamRef.current) {
        streamRef.current.getTracks().forEach((track) => track.stop())
      }
    }
  }, [])

  return {
    webcamStream, audioDevices, videoDevices,
    selectedAudioDevice, selectedVideoDevice,
    setAudioDevice, setVideoDevice,
    isActive, error, startWebcam, stopWebcam, refreshDevices,
  }
}
