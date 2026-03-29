'use client'

import { useRef, useEffect } from 'react'
import type { TranscriptViewerProps } from '@/types'

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function TranscriptViewer({ segments, currentTime, onSegmentClick }: TranscriptViewerProps) {
  const activeRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (activeRef.current) {
      activeRef.current.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
    }
  }, [currentTime])

  if (segments.length === 0) {
    return <p className="text-sm text-gray-500">No transcript available</p>
  }

  return (
    <div className="space-y-1">
      {segments.map((segment, i) => {
        const isActive = currentTime >= segment.start && currentTime < segment.end
        return (
          <div
            key={i}
            ref={isActive ? activeRef : null}
            onClick={() => onSegmentClick(segment.start)}
            className={`cursor-pointer rounded px-2 py-1.5 text-sm transition-colors ${
              isActive ? 'bg-blue-50 text-blue-900' : 'hover:bg-gray-50'
            }`}
          >
            <span className="mr-2 font-mono text-xs text-gray-400">
              {formatTime(segment.start)}
            </span>
            {segment.text}
          </div>
        )
      })}
    </div>
  )
}
