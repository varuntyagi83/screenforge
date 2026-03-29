import { describe, it, expect, vi, beforeEach } from 'vitest'
import { renderHook, act } from '@testing-library/react'
import { useMediaRecorder } from '@/hooks/useMediaRecorder'

interface MockRecorder {
  state: string
  start: ReturnType<typeof vi.fn>
  stop: ReturnType<typeof vi.fn>
  pause: ReturnType<typeof vi.fn>
  resume: ReturnType<typeof vi.fn>
  ondataavailable: ((e: { data: Blob }) => void) | null
  onstop: (() => void) | null
  onerror: (() => void) | null
}

let mockRecorderInstance: MockRecorder

function MockMediaRecorder() {
  mockRecorderInstance = {
    state: 'inactive',
    start: vi.fn(function (this: MockRecorder) { this.state = 'recording' }).bind(mockRecorderInstance),
    stop: vi.fn(function (this: MockRecorder) {
      this.state = 'inactive'
      if (this.ondataavailable) {
        this.ondataavailable({ data: new Blob(['test'], { type: 'video/webm' }) })
      }
      if (this.onstop) {
        this.onstop()
      }
    }),
    pause: vi.fn(function (this: MockRecorder) { this.state = 'paused' }),
    resume: vi.fn(function (this: MockRecorder) { this.state = 'recording' }),
    ondataavailable: null,
    onstop: null,
    onerror: null,
  }

  // Bind methods to instance
  mockRecorderInstance.start = vi.fn(() => { mockRecorderInstance.state = 'recording' })
  mockRecorderInstance.stop = vi.fn(() => {
    mockRecorderInstance.state = 'inactive'
    if (mockRecorderInstance.ondataavailable) {
      mockRecorderInstance.ondataavailable({ data: new Blob(['test'], { type: 'video/webm' }) })
    }
    if (mockRecorderInstance.onstop) {
      mockRecorderInstance.onstop()
    }
  })
  mockRecorderInstance.pause = vi.fn(() => { mockRecorderInstance.state = 'paused' })
  mockRecorderInstance.resume = vi.fn(() => { mockRecorderInstance.state = 'recording' })

  return mockRecorderInstance
}

beforeEach(() => {
  vi.clearAllMocks()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ;(MockMediaRecorder as any).isTypeSupported = vi.fn(() => true)
  vi.stubGlobal('MediaRecorder', MockMediaRecorder)
})

describe('useMediaRecorder', () => {
  const mockStream = {} as MediaStream

  it('starts in idle state', () => {
    const { result } = renderHook(() => useMediaRecorder())
    expect(result.current.state).toBe('idle')
    expect(result.current.blob).toBeNull()
    expect(result.current.duration).toBe(0)
  })

  it('transitions to recording on start', () => {
    const { result } = renderHook(() => useMediaRecorder())

    act(() => {
      result.current.startRecording(mockStream)
    })

    expect(result.current.state).toBe('recording')
  })

  it('pauses and resumes recording', () => {
    const { result } = renderHook(() => useMediaRecorder())

    act(() => result.current.startRecording(mockStream))
    act(() => result.current.pauseRecording())

    expect(result.current.state).toBe('paused')

    act(() => result.current.resumeRecording())

    expect(result.current.state).toBe('recording')
  })

  it('stops recording and produces blob', () => {
    const { result } = renderHook(() => useMediaRecorder())

    act(() => result.current.startRecording(mockStream))
    act(() => result.current.stopRecording())

    expect(result.current.state).toBe('stopped')
    expect(result.current.blob).toBeInstanceOf(Blob)
  })

  it('discards recording and resets state', () => {
    const { result } = renderHook(() => useMediaRecorder())

    act(() => result.current.startRecording(mockStream))
    act(() => result.current.discardRecording())

    expect(result.current.state).toBe('idle')
    expect(result.current.blob).toBeNull()
    expect(result.current.duration).toBe(0)
  })
})
