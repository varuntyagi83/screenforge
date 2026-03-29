// ============================================================
// RECORDING ENGINE TYPES
// ============================================================

export type RecordingMode = 'screen' | 'camera' | 'pip'
export type RecordingState = 'idle' | 'countdown' | 'recording' | 'paused' | 'stopped' | 'error'

export interface RecordingConfig {
  mode: RecordingMode
  audioDeviceId?: string
  videoDeviceId?: string
  includeSystemAudio: boolean
  maxWidth?: number
  maxHeight?: number
  frameRate?: number
  mimeType: string
}

export interface RecordingSession {
  state: RecordingState
  startedAt: Date | null
  duration: number
  pausedDuration: number
  chunks: Blob[]
  config: RecordingConfig
  error?: string
}

export interface MediaDeviceInfo {
  deviceId: string
  label: string
  kind: 'audioinput' | 'videoinput' | 'audiooutput'
}

// ============================================================
// CONTROL BAR TYPES
// ============================================================

export interface ControlBarProps {
  state: RecordingState
  duration: number
  onStart: () => void
  onPause: () => void
  onResume: () => void
  onStop: () => void
  onDiscard: () => void
  isCollapsed: boolean
  onToggleCollapse: () => void
}

export interface KeyboardShortcut {
  key: string
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
  action: 'toggle' | 'pause' | 'stop' | 'discard'
}

// ============================================================
// PIP COMPOSITOR TYPES
// ============================================================

export interface PiPConfig {
  screenStream: MediaStream
  cameraStream: MediaStream
  canvasWidth: number
  canvasHeight: number
  cameraSize: number
  cameraPosition: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left'
  cameraOffsetX: number
  cameraOffsetY: number
  targetFps: number
}

export interface PiPCompositorResult {
  canvasRef: React.RefObject<HTMLCanvasElement>
  compositeStream: MediaStream | null
  isCompositing: boolean
  error?: string
}

// ============================================================
// GOOGLE DRIVE TYPES
// ============================================================

export interface DriveUploadOptions {
  fileName: string
  mimeType: string
  folderId?: string
  onProgress?: (percent: number) => void
}

export interface DriveUploadResult {
  fileId: string
  webViewLink: string
  webContentLink: string
}

export interface DriveFile {
  id: string
  name: string
  mimeType: string
  size: string
  webViewLink: string
  webContentLink: string
  createdTime: string
}

// ============================================================
// INDEXEDDB LOCAL BUFFER TYPES
// ============================================================

export interface LocalRecording {
  id: string
  blob: Blob
  thumbnailBlob?: Blob
  config: RecordingConfig
  duration: number
  createdAt: Date
  uploaded: boolean
}

// ============================================================
// API ROUTE TYPES
// ============================================================

export interface CreateRecordingRequest {
  title?: string
  mode: RecordingMode
  durationSeconds: number
  mimeType: string
  fileSize: number
  localIdbKey: string
}

export interface CreateRecordingResponse {
  id: string
  uploadUrl?: string
}

export interface UpdateRecordingRequest {
  title?: string
  description?: string
  isPublic?: boolean
  driveFileId?: string
  driveWebLink?: string
  thumbnailDriveId?: string
  uploadStatus?: string
  uploadProgress?: number
}

export interface TranscribeRequest {
  recordingId: string
}

export interface TranscribeResponse {
  transcript: string
  language: string
  durationSeconds: number
}

export interface AISummaryRequest {
  recordingId: string
}

export interface AISummaryResponse {
  summary: string
  actionItems: string[]
  sopGuide: string
}

export interface RecordingListItem {
  id: string
  title: string
  description: string | null
  durationSeconds: number
  mode: RecordingMode
  thumbnailUrl: string | null
  aiStatus: string
  uploadStatus: string
  isPublic: boolean
  shareToken: string | null
  createdAt: string
}

export interface RecordingDetail extends RecordingListItem {
  driveWebLink: string | null
  transcript: string | null
  summary: string | null
  actionItems: string[] | null
  sopGuide: string | null
}

// ============================================================
// SHARE TYPES
// ============================================================

export interface ShareConfig {
  isPublic: boolean
  shareToken: string | null
  shareUrl: string | null
}

// ============================================================
// USER PREFERENCES TYPES
// ============================================================

export interface UserPreferencesData {
  defaultMode: RecordingMode
  defaultAudioDevice: string | null
  defaultVideoDevice: string | null
  includeSystemAudio: boolean
  countdownSeconds: number
  shortcutToggle: string
  shortcutPause: string
}

// ============================================================
// COMPONENT PROP TYPES
// ============================================================

export interface CountdownProps {
  seconds: number
  onComplete: () => void
}

export interface DevicePickerProps {
  audioDevices: MediaDeviceInfo[]
  videoDevices: MediaDeviceInfo[]
  selectedAudio: string | null
  selectedVideo: string | null
  onAudioChange: (deviceId: string) => void
  onVideoChange: (deviceId: string) => void
}

export interface ModeSelectorProps {
  selected: RecordingMode
  onChange: (mode: RecordingMode) => void
}

export interface RecordingCardProps {
  recording: RecordingListItem
  onRename: (id: string, title: string) => void
  onDelete: (id: string) => void
  onShare: (id: string) => void
}

export interface VideoPlayerProps {
  src: string
  transcript?: TranscriptSegment[]
  onTimeUpdate?: (time: number) => void
}

export interface TranscriptSegment {
  start: number
  end: number
  text: string
}

export interface TranscriptViewerProps {
  segments: TranscriptSegment[]
  currentTime: number
  onSegmentClick: (time: number) => void
}
