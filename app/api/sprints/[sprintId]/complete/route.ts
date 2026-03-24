import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const completeSprintSchema = z.object({
  moveIncompleteToSprintId: z.string().optional(), // null = move to backlog
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sprintId } = await params

  try {
    const body = await request.json()
    const { moveIncompleteToSprintId } = completeSprintSchema.parse(body)

    const sprint = await prisma.sprint.findUnique({
      where: { id: sprintId },
      include: { tickets: true },
    })

    if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    const incompleteTickets = sprint.tickets.filter((t) => t.status !== 'DONE')

    // Calculate velocity (completed story points)
    const completedPoints = sprint.tickets
      .filter((t) => t.status === 'DONE')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0)

    await prisma.$transaction([
      // Update incomplete tickets
      prisma.ticket.updateMany({
        where: {
          id: { in: incompleteTickets.map((t) => t.id) },
        },
        data: {
          sprintId: moveIncompleteToSprintId ?? null,
          status: 'BACKLOG',
        },
      }),
      // Complete the sprint
      prisma.sprint.update({
        where: { id: sprintId },
        data: {
          status: 'COMPLETED',
          velocity: completedPoints,
          endDate: new Date(),
        },
      }),
    ])

    return NextResponse.json({ success: true, movedCount: incompleteTickets.length })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
