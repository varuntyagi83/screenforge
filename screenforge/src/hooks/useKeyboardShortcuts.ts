'use client'

import { useEffect, useCallback } from 'react'

interface ShortcutActions {
  onToggleRecording: () => void
  onTogglePause: () => void
}

export function useKeyboardShortcuts(
  actions: ShortcutActions,
  enabled: boolean = true
) {
  const handleKeyDown = useCallback((e: KeyboardEvent) => {
    if (!enabled) return

    // Read custom shortcuts from localStorage or use defaults
    const toggleKey = localStorage.getItem('screenforge:shortcutToggle') ?? 'Ctrl+Shift+R'
    const pauseKey = localStorage.getItem('screenforge:shortcutPause') ?? 'Ctrl+Shift+P'

    const pressed = [
      e.ctrlKey || e.metaKey ? 'Ctrl' : '',
      e.shiftKey ? 'Shift' : '',
      e.altKey ? 'Alt' : '',
      e.key.toUpperCase(),
    ].filter(Boolean).join('+')

    if (pressed === toggleKey) {
      e.preventDefault()
      actions.onToggleRecording()
    } else if (pressed === pauseKey) {
      e.preventDefault()
      actions.onTogglePause()
    }
  }, [enabled, actions])

  useEffect(() => {
    if (!enabled) return

    window.addEventListener('keydown', handleKeyDown)
    return () => {
      window.removeEventListener('keydown', handleKeyDown)
    }
  }, [enabled, handleKeyDown])
}
