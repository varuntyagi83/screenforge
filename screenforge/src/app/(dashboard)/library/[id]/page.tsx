'use client'

import { useState, useEffect, useCallback, use } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, Share2, Brain, ArrowLeft } from 'lucide-react'
import { TranscriptViewer } from '@/components/player/TranscriptViewer'
import { VideoPlayer } from '@/components/player/VideoPlayer'
import type { RecordingDetail, TranscriptSegment } from '@/types'

export default function RecordingDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const router = useRouter()
  const [recording, setRecording] = useState<RecordingDetail | null>(null)
  const [activeTab, setActiveTab] = useState<'info' | 'transcript' | 'summary' | 'sop'>('info')
  const [currentTime, setCurrentTime] = useState(0)
  const [seekTo, setSeekTo] = useState<number | undefined>()
  const [processing, setProcessing] = useState(false)

  const fetchRecording = useCallback(async () => {
    try {
      const res = await fetch(`/api/recordings/${id}`)
      if (res.ok) {
        const data = await res.json() as RecordingDetail
        setRecording(data)
      }
    } catch {
      // Handle error
    }
  }, [id])

  useEffect(() => { void fetchRecording() }, [fetchRecording])

  const handleGenerateAI = async () => {
    setProcessing(true)
    try {
      // Transcribe first if needed
      if (!recording?.transcript) {
        await fetch(`/api/recordings/${id}/transcribe`, { method: 'POST' })
        // Poll for completion
        let status = 'processing'
        while (status === 'processing') {
          await new Promise((r) => setTimeout(r, 3000))
          const res = await fetch(`/api/recordings/${id}/transcribe`)
          const data = await res.json() as { status: string }
          status = data.status
        }
      }
      // Generate summary
      await fetch(`/api/recordings/${id}/ai`, { method: 'POST' })
      // Poll
      let aiStatus = 'summarizing'
      while (aiStatus === 'summarizing') {
        await new Promise((r) => setTimeout(r, 3000))
        await fetchRecording()
        aiStatus = recording?.aiStatus ?? 'completed'
      }
    } catch {
      // Error handling
    } finally {
      setProcessing(false)
      await fetchRecording()
    }
  }

  const handleDelete = async () => {
    if (!confirm('Delete this recording?')) return
    await fetch(`/api/recordings/${id}`, { method: 'DELETE' })
    router.push('/library')
  }

  if (!recording) {
    return <div className="flex min-h-[50vh] items-center justify-center text-gray-500">Loading...</div>
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

  const actionItems = recording.actionItems ? JSON.parse(recording.actionItems as unknown as string) as { task: string; assignee: string; priority: string }[] : []

  return (
    <div className="mx-auto max-w-6xl p-6">
      <button onClick={() => router.push('/library')} className="mb-4 flex items-center gap-1 text-sm text-gray-500 hover:text-gray-700">
        <ArrowLeft className="h-4 w-4" /> Back to Library
      </button>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Video + controls */}
        <div className="lg:col-span-2 space-y-4">
          <h1 className="text-2xl font-bold">{recording.title}</h1>

          {recording.driveWebLink && (
            <VideoPlayer
              src={`/api/recordings/${id}/stream`}
              onTimeUpdate={setCurrentTime}
              seekTo={seekTo}
            />
          )}

          <div className="flex gap-2">
            <button
              onClick={() => void handleGenerateAI()}
              disabled={processing}
              className="flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
            >
              <Brain className="h-4 w-4" />
              {processing ? 'Processing...' : recording.aiStatus === 'completed' ? 'Regenerate AI' : 'Generate AI Summary'}
            </button>
            <button
              onClick={() => void fetch(`/api/recordings/${id}/share`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ isPublic: !recording.isPublic }),
              }).then(() => fetchRecording())}
              className="flex items-center gap-2 rounded-lg border px-4 py-2 text-sm hover:bg-gray-50"
            >
              <Share2 className="h-4 w-4" />
              {recording.isPublic ? 'Make Private' : 'Share'}
            </button>
            <button
              onClick={() => void handleDelete()}
              className="flex items-center gap-2 rounded-lg border border-red-200 px-4 py-2 text-sm text-red-600 hover:bg-red-50"
            >
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          </div>
        </div>

        {/* Sidebar: tabs */}
        <div className="space-y-4">
          <div className="flex border-b">
            {(['info', 'transcript', 'summary', 'sop'] as const).map((tab) => (
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
            {activeTab === 'info' && (
              <div className="space-y-2 text-sm">
                <p><strong>Duration:</strong> {Math.floor(recording.durationSeconds / 60)}m {recording.durationSeconds % 60}s</p>
                <p><strong>Mode:</strong> {recording.mode}</p>
                <p><strong>AI Status:</strong> {recording.aiStatus}</p>
                <p><strong>Upload:</strong> {recording.uploadStatus}</p>
                {recording.isPublic && recording.shareToken && (
                  <p><strong>Share URL:</strong> <code className="text-xs">/share/{recording.shareToken}</code></p>
                )}
              </div>
            )}

            {activeTab === 'transcript' && (
              segments.length > 0
                ? <TranscriptViewer segments={segments} currentTime={currentTime} onSegmentClick={setSeekTo} />
                : <p className="text-sm text-gray-500">No transcript available</p>
            )}

            {activeTab === 'summary' && (
              <div className="space-y-4">
                {recording.summary ? (
                  <div className="prose prose-sm">{recording.summary}</div>
                ) : (
                  <p className="text-sm text-gray-500">No summary yet</p>
                )}
                {actionItems.length > 0 && (
                  <div>
                    <h4 className="mb-2 font-medium">Action Items</h4>
                    <ul className="space-y-1">
                      {actionItems.map((item, i) => (
                        <li key={i} className="flex items-start gap-2 text-sm">
                          <input type="checkbox" className="mt-1" />
                          <span>{item.task}</span>
                          <span className={`ml-auto rounded px-1.5 py-0.5 text-[10px] ${
                            item.priority === 'high' ? 'bg-red-100 text-red-700' :
                            item.priority === 'medium' ? 'bg-yellow-100 text-yellow-700' :
                            'bg-green-100 text-green-700'
                          }`}>{item.priority}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {activeTab === 'sop' && (
              recording.sopGuide
                ? <div className="prose prose-sm">{recording.sopGuide}</div>
                : <p className="text-sm text-gray-500">No SOP guide yet</p>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
