import { openDB, type IDBPDatabase } from 'idb'
import type { LocalRecording, RecordingConfig } from '@/types'

const DB_NAME = 'screenforge'
const STORE_NAME = 'recordings'
const DB_VERSION = 1
const MAX_LOCAL_STORAGE = 2 * 1024 * 1024 * 1024 // 2GB

interface RecordingRecord {
  id: string
  blob: Blob
  thumbnailBlob?: Blob
  config: RecordingConfig
  duration: number
  createdAt: Date
  uploaded: boolean
}

async function getDB(): Promise<IDBPDatabase> {
  return openDB(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' })
      }
    },
  })
}

export async function saveRecording(recording: LocalRecording): Promise<void> {
  const db = await getDB()
  const record: RecordingRecord = {
    id: recording.id,
    blob: recording.blob,
    thumbnailBlob: recording.thumbnailBlob,
    config: recording.config,
    duration: recording.duration,
    createdAt: recording.createdAt,
    uploaded: recording.uploaded,
  }
  await db.put(STORE_NAME, record)
}

export async function getRecording(id: string): Promise<LocalRecording | undefined> {
  const db = await getDB()
  const record = await db.get(STORE_NAME, id) as RecordingRecord | undefined
  if (!record) return undefined
  return {
    id: record.id,
    blob: record.blob,
    thumbnailBlob: record.thumbnailBlob,
    config: record.config,
    duration: record.duration,
    createdAt: record.createdAt,
    uploaded: record.uploaded,
  }
}

export async function markUploaded(id: string): Promise<void> {
  const db = await getDB()
  const record = await db.get(STORE_NAME, id) as RecordingRecord | undefined
  if (record) {
    record.uploaded = true
    await db.put(STORE_NAME, record)
  }
}

export async function deleteRecording(id: string): Promise<void> {
  const db = await getDB()
  await db.delete(STORE_NAME, id)
}

export async function getPendingUploads(): Promise<LocalRecording[]> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME) as RecordingRecord[]
  return all
    .filter((r) => !r.uploaded)
    .map((r) => ({
      id: r.id,
      blob: r.blob,
      thumbnailBlob: r.thumbnailBlob,
      config: r.config,
      duration: r.duration,
      createdAt: r.createdAt,
      uploaded: r.uploaded,
    }))
}

export async function getLocalStorageUsage(): Promise<number> {
  const db = await getDB()
  const all = await db.getAll(STORE_NAME) as RecordingRecord[]
  return all.reduce((sum, r) => sum + r.blob.size + (r.thumbnailBlob?.size ?? 0), 0)
}

export async function hasCapacity(newBytes: number): Promise<boolean> {
  const used = await getLocalStorageUsage()
  return used + newBytes <= MAX_LOCAL_STORAGE
}
