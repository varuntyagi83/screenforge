'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import { TranscriptViewer } from '@/components/player/TranscriptViewer'
import type { TranscriptSegment } from '@/types'

interface SharedRecording {
  id: string
  title: string
  description: string | null
  durationSeconds: number
  mode: string
  transcript: string | null
  summary: string | null
  actionItems: string | null
  sopGuide: string | null
  createdAt: string
  driveWebLink: string | null
}

export default function SharePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const [recording, setRecording] = useState<SharedRecording | null>(null)
  const [notFound, setNotFound] = useState(false)
  const [activeTab, setActiveTab] = useState<'transcript' | 'summary' | 'sop'>('transcript')
  const [currentTime, setCurrentTime] = useState(0)
  const [seekTo, setSeekTo] = useState<number | undefined>()

  const fetchRecording = useCallback(async () => {
    try {
      const res = await fetch(`/api/share/${token}`)
      if (res.ok) {
        const data = await res.json() as SharedRecording
        setRecording(data)
      } else {
        setNotFound(true)
      }
    } catch {
      setNotFound(true)
    }
  }, [token])

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { void fetchRecording() }, [fetchRecording])

  if (notFound) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Not Found</h1>
          <p className="text-gray-500">This recording is not available or has been made private.</p>
        </div>
      </div>
    )
  }

  if (!recording) {
    return <div className="flex min-h-screen items-center justify-center text-gray-500">Loading...</div>
  }

  let segments: TranscriptSegment[] = []
  if (recording.transcript) {
    try {
      const parsed = JSON.parse(recording.transcript) as { segments?: TranscriptSegment[] }
      segments = parsed.segments ?? []
    } catch {
      // Not JSON
    }
  }

  const actionItems = recording.actionItems
    ? JSON.parse(recording.actionItems) as { task: string; priority: string }[]
    : []

  return (
    <main className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-5xl p-6">
        <h1 className="mb-1 text-2xl font-bold">{recording.title}</h1>
        <p className="mb-6 text-sm text-gray-500">
          {Math.floor(recording.durationSeconds / 60)}m {recording.durationSeconds % 60}s &middot; {recording.mode} &middot; {new Date(recording.createdAt).toLocaleDateString()}
        </p>

        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {recording.driveWebLink && (
              <VideoPlayer
                src={`/api/share/${token}/stream`}
                onTimeUpdate={setCurrentTime}
                seekTo={seekTo}
              />
            )}
          </div>

          <div className="space-y-4">
            <div className="flex border-b">
              {(['transcript', 'summary', 'sop'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setActiveTab(tab)}
                  className={`px-3 py-2 text-sm font-medium capitalize ${
                    activeTab === tab ? 'border-b-2 border-blue-600 text-blue-600' : 'text-gray-500'
                  }`}
                >
                  {tab}
                </button>
              ))}
            </div>

            <div className="max-h-[60vh] overflow-y-auto">
              {activeTab === 'transcript' && (
                <TranscriptViewer segments={segments} currentTime={currentTime} onSegmentClick={setSeekTo} />
              )}
              {activeTab === 'summary' && (
                <div className="space-y-4">
                  {recording.summary ? (
                    <div className="prose prose-sm">{recording.summary}</div>
                  ) : (
                    <p className="text-sm text-gray-500">No summary available</p>
                  )}
                  {actionItems.length > 0 && (
                    <ul className="space-y-1">
                      {actionItems.map((item, i) => (
                        <li key={i} className="text-sm">{item.task}</li>
                      ))}
                    </ul>
                  )}
                </div>
              )}
              {activeTab === 'sop' && (
                recording.sopGuide
                  ? <div className="prose prose-sm">{recording.sopGuide}</div>
                  : <p className="text-sm text-gray-500">No SOP guide available</p>
              )}
            </div>
          </div>
        </div>

        <footer className="mt-12 text-center text-sm text-gray-400">
          Recorded with ScreenForge
        </footer>
      </div>
    </main>
  )
}
