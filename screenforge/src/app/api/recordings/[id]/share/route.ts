import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/db'
import { nanoid } from 'nanoid'

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const recording = await prisma.recording.findUnique({ where: { id } })
  if (!recording || recording.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  const body = await req.json() as { isPublic: boolean }
  const shareToken = recording.shareToken ?? nanoid(21)

  const updated = await prisma.recording.update({
    where: { id },
    data: { isPublic: body.isPublic, shareToken },
  })

  const shareUrl = body.isPublic
    ? `${process.env.NEXTAUTH_URL}/share/${shareToken}`
    : null

  return NextResponse.json({
    isPublic: updated.isPublic,
    shareToken: updated.shareToken,
    shareUrl,
  })
}
