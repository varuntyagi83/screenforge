import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params

  const recording = await prisma.recording.findUnique({
    where: { shareToken: token },
  })

  if (!recording || !recording.isPublic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json({
    id: recording.id,
    title: recording.title,
    description: recording.description,
    durationSeconds: recording.durationSeconds,
    mode: recording.mode,
    aiStatus: recording.aiStatus,
    transcript: recording.transcript,
    summary: recording.summary,
    actionItems: recording.actionItems,
    sopGuide: recording.sopGuide,
    createdAt: recording.createdAt,
    driveWebLink: recording.driveWebLink,
  })
}
