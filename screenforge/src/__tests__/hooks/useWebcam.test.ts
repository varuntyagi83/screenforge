import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useWebcam } from '@/hooks/useWebcam'

const mockDevices = [
  { deviceId: 'mic-1', label: 'Microphone 1', kind: 'audioinput', groupId: '', toJSON: () => ({}) },
  { deviceId: 'cam-1', label: 'Camera 1', kind: 'videoinput', groupId: '', toJSON: () => ({}) },
]

const mockTrack = { stop: vi.fn() }
const mockStream = {
  getTracks: () => [mockTrack],
  getVideoTracks: () => [mockTrack],
  getAudioTracks: () => [mockTrack],
}

beforeEach(() => {
  vi.clearAllMocks()
  localStorage.clear()

  Object.defineProperty(navigator, 'mediaDevices', {
    value: {
      enumerateDevices: vi.fn(() => Promise.resolve(mockDevices)),
      getUserMedia: vi.fn(() => Promise.resolve(mockStream)),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    },
    writable: true,
    configurable: true,
  })
})

describe('useWebcam', () => {
  it('enumerates devices on mount', async () => {
    const { result } = renderHook(() => useWebcam())

    // Wait for effect
    await act(async () => {
      await new Promise((r) => setTimeout(r, 10))
    })

    expect(result.current.audioDevices).toHaveLength(1)
    expect(result.current.videoDevices).toHaveLength(1)
  })

  it('starts webcam and sets stream', async () => {
    const { result } = renderHook(() => useWebcam())

    await act(async () => {
      await result.current.startWebcam()
    })

    expect(result.current.isActive).toBe(true)
    expect(navigator.mediaDevices.getUserMedia).toHaveBeenCalled()
  })

  it('handles permission denied error', async () => {
    vi.mocked(navigator.mediaDevices.getUserMedia).mockRejectedValue(
      new DOMException('Not allowed', 'NotAllowedError')
    )

    const { result } = renderHook(() => useWebcam())

    await act(async () => {
      await result.current.startWebcam()
    })

    expect(result.current.isActive).toBe(false)
    expect(result.current.error).toContain('permission denied')
  })

  it('saves device selection to localStorage', () => {
    const { result } = renderHook(() => useWebcam())

    act(() => {
      result.current.setAudioDevice('mic-1')
    })

    expect(localStorage.getItem('screenforge:audioDevice')).toBe('mic-1')
  })
})
