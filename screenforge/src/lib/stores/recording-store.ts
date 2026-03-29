import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { RecordingConfig, RecordingMode } from '@/types'

interface RecordingStore {
  config: RecordingConfig
  blob: Blob | null
  localId: string | null
  uploadProgress: number
  driveFileId: string | null
  setConfig: (config: Partial<RecordingConfig>) => void
  setBlob: (blob: Blob | null) => void
  setLocalId: (id: string | null) => void
  startUpload: () => void
  updateProgress: (progress: number) => void
  completeUpload: (driveFileId: string) => void
  reset: () => void
}

const defaultConfig: RecordingConfig = {
  mode: 'screen' as RecordingMode,
  includeSystemAudio: true,
  mimeType: 'video/webm',
}

export const useRecordingStore = create<RecordingStore>()(
  persist(
    (set) => ({
      config: defaultConfig,
      blob: null,
      localId: null,
      uploadProgress: 0,
      driveFileId: null,
      setConfig: (partial) => set((s) => ({ config: { ...s.config, ...partial } })),
      setBlob: (blob) => set({ blob }),
      setLocalId: (localId) => set({ localId }),
      startUpload: () => set({ uploadProgress: 0, driveFileId: null }),
      updateProgress: (uploadProgress) => set({ uploadProgress }),
      completeUpload: (driveFileId) => set({ driveFileId, uploadProgress: 100 }),
      reset: () => set({ blob: null, localId: null, uploadProgress: 0, driveFileId: null }),
    }),
    {
      name: 'screenforge:recording',
      partialize: (state) => ({ config: state.config }),
    }
  )
)
