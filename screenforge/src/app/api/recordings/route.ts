import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

// GET /api/recordings — list user's recordings
export async function GET(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const url = new URL(req.url)
  const page = parseInt(url.searchParams.get('page') ?? '1', 10)
  const limit = parseInt(url.searchParams.get('limit') ?? '20', 10)
  const skip = (page - 1) * limit

  const [recordings, total] = await Promise.all([
    prisma.recording.findMany({
      where: { userId: session.user.id },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.recording.count({ where: { userId: session.user.id } }),
  ])

  return NextResponse.json({ recordings, total, page, limit })
}

// POST /api/recordings — create recording metadata
export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await req.json() as {
    title?: string
    mode: string
    durationSeconds: number
    mimeType: string
    fileSize: number
    localIdbKey: string
  }

  const recording = await prisma.recording.create({
    data: {
      userId: session.user.id,
      title: body.title ?? 'Untitled Recording',
      mode: body.mode,
      durationSeconds: body.durationSeconds,
      mimeType: body.mimeType,
      fileSize: body.fileSize,
      localIdbKey: body.localIdbKey,
      shareToken: nanoid(21),
    },
  })

  return NextResponse.json({ id: recording.id }, { status: 201 })
}
