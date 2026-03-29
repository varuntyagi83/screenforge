'use client'

import type { PiPConfig } from '@/types'

type CameraPosition = PiPConfig['cameraPosition']

interface PiPCanvasProps {
  canvasRef: React.RefObject<HTMLCanvasElement | null>
  isCompositing: boolean
  cameraPosition: CameraPosition
  onPositionChange: (position: CameraPosition) => void
  fps: number
}

const positions: { value: CameraPosition; label: string }[] = [
  { value: 'bottom-right', label: 'Bottom Right' },
  { value: 'bottom-left', label: 'Bottom Left' },
  { value: 'top-right', label: 'Top Right' },
  { value: 'top-left', label: 'Top Left' },
]

export function PiPCanvas({ canvasRef, isCompositing, cameraPosition, onPositionChange, fps }: PiPCanvasProps) {
  return (
    <div className="space-y-2">
      <canvas ref={canvasRef} className="hidden" />

      {isCompositing && (
        <div className="flex items-center gap-4">
          <select
            value={cameraPosition}
            onChange={(e) => onPositionChange(e.target.value as CameraPosition)}
            className="rounded-md border border-gray-300 bg-white px-2 py-1 text-sm"
          >
            {positions.map((p) => (
              <option key={p.value} value={p.value}>{p.label}</option>
            ))}
          </select>
          <span className="text-xs text-gray-500">{fps} FPS</span>
        </div>
      )}
    </div>
  )
}
