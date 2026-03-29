import OpenAI from 'openai'
import type { TranscriptSegment } from '@/types'

const openai = new OpenAI()

interface WhisperSegment {
  start: number
  end: number
  text: string
}

interface WhisperResponse {
  text: string
  language: string
  duration: number
  segments?: WhisperSegment[]
}

export async function transcribeAudio(
  audioBuffer: Buffer,
  fileName: string = 'recording.webm'
): Promise<{ transcript: string; segments: TranscriptSegment[]; language: string; duration: number }> {
  const file = new File([new Uint8Array(audioBuffer)], fileName, { type: 'video/webm' })

  const response = await openai.audio.transcriptions.create({
    model: 'whisper-1',
    file,
    response_format: 'verbose_json',
    timestamp_granularities: ['segment'],
  }) as unknown as WhisperResponse

  const segments: TranscriptSegment[] = (response.segments ?? []).map((s) => ({
    start: s.start,
    end: s.end,
    text: s.text.trim(),
  }))

  const transcript = response.text || '(No speech detected)'

  return {
    transcript,
    segments,
    language: response.language ?? 'unknown',
    duration: response.duration ?? 0,
  }
}
