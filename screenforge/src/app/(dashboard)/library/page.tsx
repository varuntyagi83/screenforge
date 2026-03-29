'use client'

import { useState, useEffect, useCallback } from 'react'
import Link from 'next/link'
import { Video, Search, Plus } from 'lucide-react'
import { RecordingCard } from '@/components/library/RecordingCard'
import type { RecordingListItem } from '@/types'

export default function LibraryPage() {
  const [recordings, setRecordings] = useState<RecordingListItem[]>([])
  const [search, setSearch] = useState('')
  const [sortBy, setSortBy] = useState('newest')
  const [loading, setLoading] = useState(true)

  const fetchRecordings = useCallback(async () => {
    try {
      const res = await fetch('/api/recordings')
      if (res.ok) {
        const data = await res.json() as { recordings: RecordingListItem[] }
        setRecordings(data.recordings)
      }
    } catch {
      // Handle error silently
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => { void fetchRecordings() }, [fetchRecordings])

  const filtered = recordings
    .filter((r) => r.title.toLowerCase().includes(search.toLowerCase()))
    .sort((a, b) => {
      switch (sortBy) {
        case 'oldest': return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
        case 'longest': return b.durationSeconds - a.durationSeconds
        case 'shortest': return a.durationSeconds - b.durationSeconds
        case 'name': return a.title.localeCompare(b.title)
        default: return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      }
    })

  const handleRename = async (id: string, title: string) => {
    try {
      await fetch(`/api/recordings/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title }),
      })
      setRecordings((prev) => prev.map((r) => r.id === id ? { ...r, title } : r))
    } catch {
      // Handle error
    }
  }

  const handleDelete = async (id: string) => {
    try {
      await fetch(`/api/recordings/${id}`, { method: 'DELETE' })
      setRecordings((prev) => prev.filter((r) => r.id !== id))
    } catch {
      // Handle error
    }
  }

  if (loading) {
    return <div className="flex min-h-[50vh] items-center justify-center text-gray-500">Loading...</div>
  }

  if (recordings.length === 0) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4">
        <Video className="h-12 w-12 text-gray-300" />
        <h2 className="text-xl font-semibold text-gray-600">No recordings yet</h2>
        <Link
          href="/record"
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> Start Recording
        </Link>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-6xl p-6">
      <div className="mb-6 flex items-center justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            placeholder="Search recordings..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border py-2 pl-10 pr-4 text-sm"
          />
        </div>
        <select
          value={sortBy}
          onChange={(e) => setSortBy(e.target.value)}
          className="rounded-lg border px-3 py-2 text-sm"
        >
          <option value="newest">Newest</option>
          <option value="oldest">Oldest</option>
          <option value="longest">Longest</option>
          <option value="shortest">Shortest</option>
          <option value="name">Name A-Z</option>
        </select>
        <Link
          href="/record"
          className="flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm text-white hover:bg-red-700"
        >
          <Plus className="h-4 w-4" /> Record
        </Link>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {filtered.map((rec) => (
          <RecordingCard
            key={rec.id}
            recording={rec}
            onRename={handleRename}
            onDelete={handleDelete}
            onShare={() => {/* handled in detail page */}}
          />
        ))}
      </div>
    </div>
  )
}
