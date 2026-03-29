import { describe, it, expect, vi } from 'vitest'
import { renderHook } from '@testing-library/react'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

describe('useKeyboardShortcuts', () => {
  it('fires toggle recording on Ctrl+Shift+R', () => {
    const onToggleRecording = vi.fn()
    const onTogglePause = vi.fn()

    renderHook(() => useKeyboardShortcuts({ onToggleRecording, onTogglePause }, true))

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'R',
      ctrlKey: true,
      shiftKey: true,
    }))

    expect(onToggleRecording).toHaveBeenCalledOnce()
    expect(onTogglePause).not.toHaveBeenCalled()
  })

  it('fires toggle pause on Ctrl+Shift+P', () => {
    const onToggleRecording = vi.fn()
    const onTogglePause = vi.fn()

    renderHook(() => useKeyboardShortcuts({ onToggleRecording, onTogglePause }, true))

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'P',
      ctrlKey: true,
      shiftKey: true,
    }))

    expect(onTogglePause).toHaveBeenCalledOnce()
  })

  it('does not fire when disabled', () => {
    const onToggleRecording = vi.fn()
    const onTogglePause = vi.fn()

    renderHook(() => useKeyboardShortcuts({ onToggleRecording, onTogglePause }, false))

    window.dispatchEvent(new KeyboardEvent('keydown', {
      key: 'R',
      ctrlKey: true,
      shiftKey: true,
    }))

    expect(onToggleRecording).not.toHaveBeenCalled()
  })

  it('cleans up listener on unmount', () => {
    const spy = vi.spyOn(window, 'removeEventListener')
    const { unmount } = renderHook(() =>
      useKeyboardShortcuts({ onToggleRecording: vi.fn(), onTogglePause: vi.fn() }, true)
    )

    unmount()

    expect(spy).toHaveBeenCalledWith('keydown', expect.any(Function))
    spy.mockRestore()
  })
})
