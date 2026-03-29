'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Pause, Play, Square, Trash2, Minus, Maximize2 } from 'lucide-react'
import type { ControlBarProps } from '@/types'

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = seconds % 60
  return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
}

export function ControlBar({
  state,
  duration,
  onPause,
  onResume,
  onStop,
  onDiscard,
  isCollapsed,
  onToggleCollapse,
}: ControlBarProps) {
  const [position, setPosition] = useState({ x: window.innerWidth / 2 - 150, y: 20 })
  const [isDragging, setIsDragging] = useState(false)
  const [showDiscardConfirm, setShowDiscardConfirm] = useState(false)
  const dragOffset = useRef({ x: 0, y: 0 })
  const barRef = useRef<HTMLDivElement>(null)
  const [mounted, setMounted] = useState(false)

  // Suppress lint: portal hydration requires setState in effect
  /* eslint-disable react-hooks/set-state-in-effect */
  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])
  /* eslint-enable react-hooks/set-state-in-effect */

  const onPointerDown = useCallback((e: React.PointerEvent) => {
    if ((e.target as HTMLElement).closest('button')) return
    setIsDragging(true)
    dragOffset.current = { x: e.clientX - position.x, y: e.clientY - position.y }
    ;(e.target as HTMLElement).setPointerCapture(e.pointerId)
  }, [position])

  const onPointerMove = useCallback((e: React.PointerEvent) => {
    if (!isDragging) return
    const newX = Math.max(0, Math.min(window.innerWidth - 300, e.clientX - dragOffset.current.x))
    const newY = Math.max(0, Math.min(window.innerHeight - 60, e.clientY - dragOffset.current.y))
    setPosition({ x: newX, y: newY })
  }, [isDragging])

  const onPointerUp = useCallback(() => {
    setIsDragging(false)
  }, [])

  if (!mounted) return null

  const isRecording = state === 'recording'
  const isPaused = state === 'paused'

  const bar = (
    <div
      ref={barRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      style={{
        position: 'fixed',
        left: position.x,
        top: position.y,
        zIndex: 2147483647,
        cursor: isDragging ? 'grabbing' : 'grab',
      }}
      className="flex items-center gap-2 rounded-full bg-gray-900/90 px-4 py-2 text-white shadow-2xl backdrop-blur-sm select-none"
    >
      {/* Status dot */}
      <span
        className={`h-3 w-3 rounded-full ${
          isRecording ? 'animate-pulse bg-red-500' : 'bg-yellow-400'
        }`}
      />

      {/* Timer */}
      <span className="min-w-[72px] font-mono text-sm font-medium">
        {formatDuration(duration)}
      </span>

      {!isCollapsed && (
        <>
          {isRecording && (
            <button onClick={onPause} aria-label="Pause recording" className="rounded p-1 hover:bg-white/10">
              <Pause className="h-4 w-4" />
            </button>
          )}

          {isPaused && (
            <>
              <button onClick={onResume} aria-label="Resume recording" className="rounded p-1 hover:bg-white/10">
                <Play className="h-4 w-4" />
              </button>
              <button
                onClick={() => setShowDiscardConfirm(true)}
                aria-label="Discard recording"
                className="rounded p-1 hover:bg-white/10 text-red-400"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </>
          )}

          <button onClick={onStop} aria-label="Stop recording" className="rounded p-1 hover:bg-white/10">
            <Square className="h-4 w-4" />
          </button>
        </>
      )}

      <button onClick={onToggleCollapse} aria-label={isCollapsed ? 'Expand control bar' : 'Collapse control bar'} className="rounded p-1 hover:bg-white/10">
        {isCollapsed ? <Maximize2 className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
      </button>

      {/* Discard confirmation */}
      {showDiscardConfirm && (
        <div className="absolute left-0 top-full mt-2 rounded-lg bg-gray-900 p-3 shadow-xl">
          <p className="mb-2 text-sm">Discard recording?</p>
          <div className="flex gap-2">
            <button
              onClick={() => { setShowDiscardConfirm(false); onDiscard() }}
              className="rounded bg-red-600 px-3 py-1 text-xs hover:bg-red-700"
            >
              Discard
            </button>
            <button
              onClick={() => setShowDiscardConfirm(false)}
              className="rounded bg-gray-700 px-3 py-1 text-xs hover:bg-gray-600"
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )

  return createPortal(bar, document.body)
}
