import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const moveSchema = z.object({
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']).optional(),
  sprintId: z.string().nullable().optional(),
  order: z.number().optional(),
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
    const data = moveSchema.parse(body)

    const existing = await prisma.ticket.findUnique({ where: { id: ticketId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const updateData: Record<string, unknown> = {}

    if (data.status !== undefined) updateData.status = data.status
    if (data.sprintId !== undefined) updateData.sprintId = data.sprintId
    if (data.order !== undefined) updateData.order = data.order
    if (data.status === 'DONE') updateData.completedAt = new Date()

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: updateData,
    })

    // Log activity
    if (data.status && data.status !== existing.status) {
      await prisma.activity.create({
        data: {
          ticketId,
          userId: session.user.id,
          type: 'STATUS_CHANGED',
          field: 'status',
          oldValue: existing.status,
          newValue: data.status,
        },
      })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
