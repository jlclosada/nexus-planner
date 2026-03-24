import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { unlink } from 'fs/promises'
import { join } from 'path'

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string; attachmentId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { attachmentId } = await params

  const attachment = await prisma.attachment.findUnique({ where: { id: attachmentId } })
  if (!attachment) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Delete file from disk
  try {
    await unlink(join(process.cwd(), 'public', attachment.url))
  } catch {
    // File might already be gone — continue
  }

  await prisma.attachment.delete({ where: { id: attachmentId } })
  return NextResponse.json({ success: true })
}
