import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'
import { existsSync } from 'fs'

const MAX_SIZE = 20 * 1024 * 1024 // 20 MB

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticketId } = await params
  const attachments = await prisma.attachment.findMany({
    where: { ticketId },
    include: { uploadedBy: { select: { id: true, name: true } } },
    orderBy: { createdAt: 'desc' },
  })
  return NextResponse.json(attachments)
}

export async function POST(
  req: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticketId } = await params

  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    if (file.size > MAX_SIZE) return NextResponse.json({ error: 'File too large (max 20 MB)' }, { status: 400 })

    const bytes = await file.arrayBuffer()
    const buffer = Buffer.from(bytes)

    // Sanitise filename
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const unique = `${Date.now()}_${safeName}`
    const dir = join(process.cwd(), 'public', 'uploads', ticketId)

    if (!existsSync(dir)) await mkdir(dir, { recursive: true })
    await writeFile(join(dir, unique), buffer)

    const url = `/uploads/${ticketId}/${unique}`

    const attachment = await prisma.attachment.create({
      data: {
        ticketId,
        uploadedById: session.user.id,
        name: file.name,
        url,
        size: file.size,
        mimeType: file.type || 'application/octet-stream',
      },
      include: { uploadedBy: { select: { id: true, name: true } } },
    })

    return NextResponse.json(attachment, { status: 201 })
  } catch (err) {
    console.error(err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
