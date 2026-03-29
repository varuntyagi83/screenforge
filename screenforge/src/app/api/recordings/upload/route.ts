import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/db'
import { findOrCreateAppFolder, uploadFile } from '@/lib/drive'

export async function POST(req: NextRequest) {
  const session = await getSession()
  if (!session) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accessToken = session.user.accessToken
  if (!accessToken) {
    return NextResponse.json({ error: 'No Drive access token' }, { status: 403 })
  }

  const formData = await req.formData()
  const file = formData.get('file') as File | null
  const recordingId = formData.get('recordingId') as string | null

  if (!file || !recordingId) {
    return NextResponse.json({ error: 'Missing file or recordingId' }, { status: 400 })
  }

  const recording = await prisma.recording.findUnique({ where: { id: recordingId } })
  if (!recording || recording.userId !== session.user.id) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 })
  }

  try {
    const folderId = await findOrCreateAppFolder(accessToken)
    const buffer = Buffer.from(await file.arrayBuffer())

    const result = await uploadFile(accessToken, buffer, {
      fileName: `${recording.title}.webm`,
      mimeType: file.type || 'video/webm',
      folderId,
    })

    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        driveFileId: result.fileId,
        driveWebLink: result.webViewLink,
        uploadStatus: 'uploaded',
        uploadProgress: 100,
        fileSize: buffer.length,
      },
    })

    return NextResponse.json({ fileId: result.fileId, webViewLink: result.webViewLink })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Upload failed'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
