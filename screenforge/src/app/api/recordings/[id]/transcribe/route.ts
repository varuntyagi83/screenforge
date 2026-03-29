import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recording = await prisma.recording.findUnique({ where: { id } })
  if (!recording || recording.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  await prisma.recording.update({ where: { id }, data: { aiStatus: 'processing' } })

  // Background processing
  void (async () => {
    try {
      const { getFileStream } = await import('@/lib/drive')
      const { transcribeAudio } = await import('@/lib/transcription')

      const accessToken = session.user.accessToken
      if (!recording.driveFileId || !accessToken) {
        await prisma.recording.update({ where: { id }, data: { aiStatus: 'failed' } })
        return
      }

      const stream = await getFileStream(accessToken, recording.driveFileId)
      const chunks: Buffer[] = []
      for await (const chunk of stream) {
        chunks.push(Buffer.from(chunk as Uint8Array))
      }
      const buffer = Buffer.concat(chunks)
      const result = await transcribeAudio(buffer)

      await prisma.recording.update({
        where: { id },
        data: {
          transcript: JSON.stringify({ text: result.transcript, segments: result.segments }),
          aiStatus: 'transcribed',
        },
      })
    } catch {
      await prisma.recording.update({ where: { id }, data: { aiStatus: 'failed' } })
    }
  })()

  return NextResponse.json({ status: 'processing' }, { status: 202 })
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const recording = await prisma.recording.findUnique({
    where: { id },
    select: { aiStatus: true, transcript: true },
  })
  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json({ status: recording.aiStatus, transcript: recording.transcript })
}
