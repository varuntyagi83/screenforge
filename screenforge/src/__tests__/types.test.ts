import { describe, it, expect } from 'vitest'
import type {
  RecordingMode,
  RecordingState,
  RecordingConfig,
  RecordingSession,
  MediaDeviceInfo,
  KeyboardShortcut,
  DriveUploadOptions,
  DriveUploadResult,
  DriveFile,
  LocalRecording,
  CreateRecordingRequest,
  CreateRecordingResponse,
  UpdateRecordingRequest,
  TranscribeRequest,
  TranscribeResponse,
  AISummaryRequest,
  AISummaryResponse,
  RecordingListItem,
  RecordingDetail,
  ShareConfig,
  UserPreferencesData,
  TranscriptSegment,
} from '@/types'

describe('type contracts', () => {
  it('RecordingConfig conforms to interface', () => {
    const config: RecordingConfig = {
      mode: 'screen',
      includeSystemAudio: true,
      mimeType: 'video/webm',
    }
    expect(config.mode).toBe('screen')
  })

  it('RecordingSession conforms to interface', () => {
    const session: RecordingSession = {
      state: 'idle',
      startedAt: null,
      duration: 0,
      pausedDuration: 0,
      chunks: [],
      config: { mode: 'screen', includeSystemAudio: true, mimeType: 'video/webm' },
    }
    expect(session.state).toBe('idle')
  })

  it('MediaDeviceInfo conforms to interface', () => {
    const device: MediaDeviceInfo = {
      deviceId: 'abc',
      label: 'Microphone',
      kind: 'audioinput',
    }
    expect(device.kind).toBe('audioinput')
  })

  it('DriveUploadResult conforms to interface', () => {
    const result: DriveUploadResult = {
      fileId: 'file123',
      webViewLink: 'https://drive.google.com/view',
      webContentLink: 'https://drive.google.com/content',
    }
    expect(result.fileId).toBe('file123')
  })

  it('LocalRecording conforms to interface', () => {
    const local: LocalRecording = {
      id: 'local-1',
      blob: new Blob(),
      config: { mode: 'camera', includeSystemAudio: false, mimeType: 'video/webm' },
      duration: 120,
      createdAt: new Date(),
      uploaded: false,
    }
    expect(local.uploaded).toBe(false)
  })

  it('CreateRecordingRequest conforms to interface', () => {
    const req: CreateRecordingRequest = {
      mode: 'pip',
      durationSeconds: 60,
      mimeType: 'video/webm',
      fileSize: 1024000,
      localIdbKey: 'idb-1',
    }
    expect(req.mode).toBe('pip')
  })

  it('RecordingListItem conforms to interface', () => {
    const item: RecordingListItem = {
      id: 'rec-1',
      title: 'Test Recording',
      description: null,
      durationSeconds: 300,
      mode: 'screen',
      thumbnailUrl: null,
      aiStatus: 'pending',
      uploadStatus: 'local',
      isPublic: false,
      shareToken: null,
      createdAt: '2024-01-01T00:00:00Z',
    }
    expect(item.title).toBe('Test Recording')
  })

  it('RecordingDetail extends RecordingListItem', () => {
    const detail: RecordingDetail = {
      id: 'rec-1',
      title: 'Test',
      description: null,
      durationSeconds: 60,
      mode: 'screen',
      thumbnailUrl: null,
      aiStatus: 'completed',
      uploadStatus: 'uploaded',
      isPublic: true,
      shareToken: 'abc123',
      createdAt: '2024-01-01T00:00:00Z',
      driveWebLink: 'https://drive.google.com/view',
      transcript: 'Hello world',
      summary: 'A greeting',
      actionItems: ['Say hi'],
      sopGuide: 'Step 1: Greet',
    }
    expect(detail.transcript).toBe('Hello world')
  })

  it('UserPreferencesData conforms to interface', () => {
    const prefs: UserPreferencesData = {
      defaultMode: 'screen',
      defaultAudioDevice: null,
      defaultVideoDevice: null,
      includeSystemAudio: true,
      countdownSeconds: 3,
      shortcutToggle: 'Ctrl+Shift+R',
      shortcutPause: 'Ctrl+Shift+P',
    }
    expect(prefs.countdownSeconds).toBe(3)
  })

  it('TranscriptSegment conforms to interface', () => {
    const segment: TranscriptSegment = {
      start: 0,
      end: 5.5,
      text: 'Hello world',
    }
    expect(segment.text).toBe('Hello world')
  })

  it('RecordingMode union type is valid', () => {
    const modes: RecordingMode[] = ['screen', 'camera', 'pip']
    expect(modes).toHaveLength(3)
  })

  it('RecordingState union type is valid', () => {
    const states: RecordingState[] = ['idle', 'countdown', 'recording', 'paused', 'stopped', 'error']
    expect(states).toHaveLength(6)
  })

  it('all remaining types compile correctly', () => {
    const shortcut: KeyboardShortcut = { key: 'r', ctrlKey: true, shiftKey: true, action: 'toggle' }
    const uploadOpts: DriveUploadOptions = { fileName: 'test.webm', mimeType: 'video/webm' }
    const driveFile: DriveFile = { id: '1', name: 'test', mimeType: 'video/webm', size: '1024', webViewLink: '', webContentLink: '', createdTime: '' }
    const createRes: CreateRecordingResponse = { id: '1' }
    const updateReq: UpdateRecordingRequest = { title: 'updated' }
    const transcribeReq: TranscribeRequest = { recordingId: '1' }
    const transcribeRes: TranscribeResponse = { transcript: 'hi', language: 'en', durationSeconds: 10 }
    const aiReq: AISummaryRequest = { recordingId: '1' }
    const aiRes: AISummaryResponse = { summary: 'sum', actionItems: [], sopGuide: 'guide' }
    const shareConfig: ShareConfig = { isPublic: false, shareToken: null, shareUrl: null }

    expect(shortcut.action).toBe('toggle')
    expect(uploadOpts.fileName).toBe('test.webm')
    expect(driveFile.id).toBe('1')
    expect(createRes.id).toBe('1')
    expect(updateReq.title).toBe('updated')
    expect(transcribeReq.recordingId).toBe('1')
    expect(transcribeRes.language).toBe('en')
    expect(aiReq.recordingId).toBe('1')
    expect(aiRes.summary).toBe('sum')
    expect(shareConfig.isPublic).toBe(false)
  })
})
