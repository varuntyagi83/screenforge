import { NextRequest, NextResponse } from 'next/server'
import { getSession } from '@/lib/get-session'
import { prisma } from '@/lib/db'

// POST /api/recordings/[id]/chunk — receive a recording chunk in real-time
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

  const formData = await req.formData()
  const chunk = formData.get('chunk') as File | null
  const chunkIndex = parseInt(formData.get('chunkIndex') as string ?? '0', 10)
  const isLast = formData.get('isLast') === 'true'

  if (!chunk) {
    return NextResponse.json({ error: 'Missing chunk' }, { status: 400 })
  }

  // Store chunk in memory/temp storage for assembly
  // In production you'd use a resumable Drive upload session
  // For now, append to a server-side buffer keyed by recording ID
  const buffer = Buffer.from(await chunk.arrayBuffer())
  await appendChunk(id, buffer, chunkIndex)

  // If this is the last chunk, assemble and upload to Drive
  if (isLast) {
    void assembleAndUpload(id, session.user.accessToken ?? '', recording.title)
  }

  return NextResponse.json({ received: chunkIndex, size: buffer.length })
}

// In-memory chunk storage (production: use temp files or resumable upload)
const chunkStore = new Map<string, Map<number, Buffer>>()

async function appendChunk(recordingId: string, buffer: Buffer, index: number) {
  if (!chunkStore.has(recordingId)) {
    chunkStore.set(recordingId, new Map())
  }
  chunkStore.get(recordingId)!.set(index, buffer)
}

async function assembleAndUpload(recordingId: string, accessToken: string, title: string) {
  try {
    const chunks = chunkStore.get(recordingId)
    if (!chunks || chunks.size === 0) return

    // Assemble in order
    const sorted = [...chunks.entries()].sort((a, b) => a[0] - b[0])
    const fullBuffer = Buffer.concat(sorted.map(([, buf]) => buf))

    // Clean up memory
    chunkStore.delete(recordingId)

    if (!accessToken) {
      await prisma.recording.update({
        where: { id: recordingId },
        data: { uploadStatus: 'failed' },
      })
      return
    }

    // Upload to Drive
    const { findOrCreateAppFolder, uploadFile } = await import('@/lib/drive')
    const folderId = await findOrCreateAppFolder(accessToken)
    const result = await uploadFile(accessToken, fullBuffer, {
      fileName: `${title}.webm`,
      mimeType: 'video/webm',
      folderId,
    })

    await prisma.recording.update({
      where: { id: recordingId },
      data: {
        driveFileId: result.fileId,
        driveWebLink: result.webViewLink,
        uploadStatus: 'uploaded',
        uploadProgress: 100,
        fileSize: fullBuffer.length,
      },
    })
  } catch {
    await prisma.recording.update({
      where: { id: recordingId },
      data: { uploadStatus: 'failed' },
    })
  }
}
