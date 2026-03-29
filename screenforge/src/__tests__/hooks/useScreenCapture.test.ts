import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useScreenCapture } from '@/hooks/useScreenCapture'

const mockTrack = {
  stop: vi.fn(),
  getSettings: vi.fn(() => ({ displaySurface: 'monitor' })),
  onended: null as (() => void) | null,
}

const mockStream = {
  getTracks: vi.fn(() => [mockTrack]),
  getVideoTracks: vi.fn(() => [mockTrack]),
  getAudioTracks: vi.fn(() => []),
}

beforeEach(() => {
  vi.clearAllMocks()
  Object.defineProperty(navigator, 'mediaDevices', {
    value: { getDisplayMedia: vi.fn() },
    writable: true,
    configurable: true,
  })
})

describe('useScreenCapture', () => {
  it('starts capture and sets stream', async () => {
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(mockStream as unknown as MediaStream)

    const { result } = renderHook(() => useScreenCapture())

    await act(async () => {
      await result.current.startCapture(true)
    })

    expect(result.current.isCapturing).toBe(true)
    expect(result.current.screenStream).toBe(mockStream)
  })

  it('stops capture and cleans up tracks', async () => {
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockResolvedValue(mockStream as unknown as MediaStream)

    const { result } = renderHook(() => useScreenCapture())

    await act(async () => {
      await result.current.startCapture(true)
    })

    act(() => {
      result.current.stopCapture()
    })

    expect(result.current.isCapturing).toBe(false)
    expect(result.current.screenStream).toBeNull()
    expect(mockTrack.stop).toHaveBeenCalled()
  })

  it('handles permission denied error', async () => {
    vi.mocked(navigator.mediaDevices.getDisplayMedia).mockRejectedValue(
      new DOMException('Permission denied', 'NotAllowedError')
    )

    const { result } = renderHook(() => useScreenCapture())

    await act(async () => {
      await result.current.startCapture(true)
    })

    expect(result.current.isCapturing).toBe(false)
    expect(result.current.error).toBe('Screen sharing permission denied')
  })
})
