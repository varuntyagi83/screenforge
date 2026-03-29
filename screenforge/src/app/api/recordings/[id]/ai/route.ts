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

  await prisma.recording.update({ where: { id }, data: { aiStatus: 'summarizing' } })

  // Background processing
  void (async () => {
    try {
      const { generateSummary } = await import('@/lib/ai')

      // Parse transcript
      let transcriptText = ''
      if (recording.transcript) {
        try {
          const parsed = JSON.parse(recording.transcript) as { text: string }
          transcriptText = parsed.text
        } catch {
          transcriptText = recording.transcript
        }
      }

      if (!transcriptText) {
        await prisma.recording.update({ where: { id }, data: { aiStatus: 'failed' } })
        return
      }

      const result = await generateSummary(transcriptText, recording.title)

      await prisma.recording.update({
        where: { id },
        data: {
          summary: result.summary,
          actionItems: JSON.stringify(result.actionItems),
          sopGuide: result.sopGuide,
          aiStatus: 'completed',
        },
      })
    } catch {
      await prisma.recording.update({ where: { id }, data: { aiStatus: 'failed' } })
    }
  })()

  return NextResponse.json({ status: 'summarizing' }, { status: 202 })
}
