import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/db'

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const session = await getSession()

  const recording = await prisma.recording.findUnique({ where: { id } })
  if (!recording) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  if (recording.userId !== session?.user.id && !recording.isPublic) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  return NextResponse.json(recording)
}

export async function PATCH(
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

  const body = await req.json() as Record<string, unknown>
  const allowedFields = ['title', 'description', 'isPublic', 'driveFileId', 'driveWebLink', 'thumbnailDriveId', 'uploadStatus', 'uploadProgress']
  const data: Record<string, unknown> = {}
  for (const field of allowedFields) {
    if (field in body) data[field] = body[field]
  }

  const updated = await prisma.recording.update({ where: { id }, data })
  return NextResponse.json(updated)
}

export async function DELETE(
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

  await prisma.recording.delete({ where: { id } })
  return NextResponse.json({ success: true })
}
