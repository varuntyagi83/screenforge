'use client'

import { useEffect } from 'react'
import { Monitor, Camera, PictureInPicture2 } from 'lucide-react'
import type { ModeSelectorProps } from '@/types'
import type { RecordingMode } from '@/types'
import { cn } from '@/lib/utils'

const modes: { value: RecordingMode; label: string; icon: typeof Monitor }[] = [
  { value: 'screen', label: 'Screen Only', icon: Monitor },
  { value: 'camera', label: 'Camera Only', icon: Camera },
  { value: 'pip', label: 'Screen + Camera', icon: PictureInPicture2 },
]

export function ModeSelector({ selected, onChange }: ModeSelectorProps) {
  // Persist selection
  useEffect(() => {
    localStorage.setItem('screenforge:recordingMode', selected)
  }, [selected])

  return (
    <div className="flex gap-2">
      {modes.map(({ value, label, icon: Icon }) => (
        <button
          key={value}
          onClick={() => onChange(value)}
          className={cn(
            'flex items-center gap-2 rounded-lg border px-4 py-3 text-sm font-medium transition-colors',
            selected === value
              ? 'border-blue-500 bg-blue-50 text-blue-700'
              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300 hover:bg-gray-50'
          )}
        >
          <Icon className="h-5 w-5" />
          {label}
        </button>
      ))}
    </div>
  )
}
