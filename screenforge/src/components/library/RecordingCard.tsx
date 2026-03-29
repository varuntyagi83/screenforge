'use client'

import { useState } from 'react'
import Link from 'next/link'
import { MoreVertical, Trash2, Edit3, Clock } from 'lucide-react'
import { formatDistanceToNow } from 'date-fns'
import type { RecordingCardProps } from '@/types'

function formatDuration(seconds: number): string {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function RecordingCard({ recording, onRename, onDelete }: RecordingCardProps) {
  const [showMenu, setShowMenu] = useState(false)
  const [isEditing, setIsEditing] = useState(false)
  const [title, setTitle] = useState(recording.title)

  const handleRename = () => {
    onRename(recording.id, title)
    setIsEditing(false)
  }

  return (
    <div className="group relative overflow-hidden rounded-lg border bg-white shadow-sm transition-shadow hover:shadow-md">
      {/* Thumbnail */}
      <Link href={`/library/${recording.id}`}>
        <div className="flex h-40 items-center justify-center bg-gradient-to-br from-gray-100 to-gray-200">
          <span className="text-3xl text-gray-400">
            {recording.mode === 'screen' ? '🖥️' : recording.mode === 'camera' ? '📷' : '🎥'}
          </span>
        </div>
      </Link>

      {/* Info */}
      <div className="p-3">
        {isEditing ? (
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={handleRename}
            onKeyDown={(e) => e.key === 'Enter' && handleRename()}
            className="w-full rounded border px-2 py-1 text-sm"
            autoFocus
          />
        ) : (
          <h3
            className="truncate text-sm font-medium"
            onDoubleClick={() => setIsEditing(true)}
            title={recording.title}
          >
            {recording.title}
          </h3>
        )}

        <div className="mt-1 flex items-center gap-2 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock className="h-3 w-3" />
            {formatDuration(recording.durationSeconds)}
          </span>
          <span>{formatDistanceToNow(new Date(recording.createdAt), { addSuffix: true })}</span>
        </div>

        <div className="mt-2 flex gap-1">
          <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
            recording.uploadStatus === 'uploaded' ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
          }`}>
            {recording.uploadStatus === 'uploaded' ? 'Synced' : 'Local'}
          </span>
          {recording.aiStatus !== 'pending' && (
            <span className={`rounded px-1.5 py-0.5 text-[10px] font-medium ${
              recording.aiStatus === 'completed' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-600'
            }`}>
              AI: {recording.aiStatus}
            </span>
          )}
        </div>
      </div>

      {/* Menu */}
      <div className="absolute right-2 top-2">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="rounded-full bg-black/40 p-1 text-white opacity-0 transition-opacity group-hover:opacity-100"
        >
          <MoreVertical className="h-4 w-4" />
        </button>
        {showMenu && (
          <div className="absolute right-0 top-8 z-10 w-36 rounded-lg border bg-white py-1 shadow-lg">
            <button
              onClick={() => { setIsEditing(true); setShowMenu(false) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm hover:bg-gray-50"
            >
              <Edit3 className="h-3 w-3" /> Rename
            </button>
            <button
              onClick={() => { onDelete(recording.id); setShowMenu(false) }}
              className="flex w-full items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-gray-50"
            >
              <Trash2 className="h-3 w-3" /> Delete
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
