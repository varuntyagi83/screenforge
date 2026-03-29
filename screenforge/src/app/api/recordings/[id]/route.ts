import { NextRequest, NextResponse } from 'next/server'
import { auth } from '@/lib/auth'
import { prisma } from '@/lib/db'

// GET /api/recordings/[id]
export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await auth()

  const recording = await prisma.recording.findUnique({ where: { id } })
  if (!recording) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  // Allow owner or public access via share token
  if (recording.userId !== session?.user?.id && !recording.isPublic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(recording)
}

// PATCH /api/recordings/[id]
export async function PATCH(
  req: NextRequest,
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

  const body = await req.json() as Record<string, unknown>
  const allowedFields = ['title', 'description', 'isPublic', 'driveFileId', 'driveWebLink', 'thumbnailDriveId', 'uploadStatus', 'uploadProgress']
  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field]
  }

  const updated = await prisma.recording.update({ where: { id }, data })
  return NextResponse.json(updated)
}

// DELETE /api/recordings/[id]
export async function DELETE(
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

  // Delete from Drive if uploaded
  if (recording.driveFileId) {
    try {
      const { deleteFile } = await import('@/lib/drive')
      const token = (await auth()) as unknown as { accessToken?: string }
      if (token.accessToken) {
        await deleteFile(token.accessToken, recording.driveFileId)
      }
    } catch {
      // Drive deletion is best-effort
    }
  }

  await prisma.recording.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
