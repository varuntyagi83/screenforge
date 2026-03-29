import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const recording = await prisma.recording.findUnique({ where: { id } })
  if (!recording || recording.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Set processing status
  await prisma.recording.update({
    where: { id },
    data: { aiStatus: 'processing' },
  })

  // Process in background (non-blocking)
  void (async () => {
    try {
      const { getFileStream } = await import('@/lib/drive')
      const { transcribeAudio } = await import('@/lib/transcription')

      // @ts-expect-error accessing custom JWT field
      const accessToken = session.accessToken as string
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
  if (!recording) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }
  return NextResponse.json({ status: recording.aiStatus, transcript: recording.transcript })
}
