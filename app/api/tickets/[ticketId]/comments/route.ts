import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createCommentSchema = z.object({
  content: z.string().min(1),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticketId } = await params

  try {
    const body = await request.json()
    const { content } = createCommentSchema.parse(body)

    const comment = await prisma.comment.create({
      data: { ticketId, userId: session.user.id, content },
      include: { user: { select: { id: true, name: true, image: true } } },
    })

    await prisma.activity.create({
      data: {
        ticketId,
        userId: session.user.id,
        type: 'COMMENT_ADDED',
        newValue: content.slice(0, 100),
      },
    })

    return NextResponse.json(comment, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
