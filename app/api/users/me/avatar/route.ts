import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { writeFile, mkdir } from 'fs/promises'
import { join } from 'path'

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const formData = await request.formData()
  const file = formData.get('file') as File | null
  if (!file) return NextResponse.json({ error: 'No file provided' }, { status: 400 })

  if (file.size > 5 * 1024 * 1024) {
    return NextResponse.json({ error: 'Max file size is 5 MB' }, { status: 400 })
  }
  if (!file.type.startsWith('image/')) {
    return NextResponse.json({ error: 'Only images allowed' }, { status: 400 })
  }

  const ext = file.name.split('.').pop() ?? 'jpg'
  const fileName = `${session.user.id}.${ext}`
  const dir = join(process.cwd(), 'public', 'uploads', 'avatars')
  await mkdir(dir, { recursive: true })

  const bytes = await file.arrayBuffer()
  await writeFile(join(dir, fileName), Buffer.from(bytes))

  const url = `/uploads/avatars/${fileName}`
  await prisma.user.update({
    where: { id: session.user.id },
    data: { image: url },
  })

  return NextResponse.json({ url })
}
