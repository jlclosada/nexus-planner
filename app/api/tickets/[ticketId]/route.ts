import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateTicketSchema = z.object({
  title: z.string().min(1).max(500).optional(),
  description: z.string().optional(),
  type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK', 'SPIKE']).optional(),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']).optional(),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).optional(),
  storyPoints: z.number().int().nullable().optional(),
  sprintId: z.string().nullable().optional(),
  epicId: z.string().nullable().optional(),
  parentId: z.string().nullable().optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
  labelIds: z.array(z.string()).optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticketId } = await params

  const baseInclude = {
    assignee: { select: { id: true, name: true, email: true, image: true } },
    reporter: { select: { id: true, name: true, email: true, image: true } },
    sprint: true,
    epic: true,
    parent: { select: { id: true, code: true, title: true } },
    subtasks: {
      include: { assignee: { select: { id: true, name: true, image: true } } },
    },
    labels: { include: { label: true } },
    comments: {
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'asc' as const },
    },
    activities: {
      include: { user: { select: { id: true, name: true, image: true } } },
      orderBy: { createdAt: 'desc' as const },
      take: 20,
    },
  }

  try {
    // Try full query including attachments (requires up-to-date Prisma client)
    let ticket
    try {
      ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: {
          ...baseInclude,
          attachments: {
            include: { uploadedBy: { select: { id: true, name: true } } },
            orderBy: { createdAt: 'desc' as const },
          },
        },
      })
    } catch {
      // Prisma client may be stale (attachments model not yet generated).
      // Fall back to query without attachments so the modal still opens.
      ticket = await prisma.ticket.findUnique({
        where: { id: ticketId },
        include: baseInclude,
      })
      if (ticket) (ticket as Record<string, unknown>).attachments = []
    }

    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 })
    return NextResponse.json(ticket)
  } catch (error) {
    console.error('[GET /api/tickets/:id]', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticketId } = await params

  try {
    const body = await request.json()
    const { labelIds, dueDate, ...data } = updateTicketSchema.parse(body)

    const existing = await prisma.ticket.findUnique({ where: { id: ticketId } })
    if (!existing) return NextResponse.json({ error: 'Not found' }, { status: 404 })

    // Track changes for activities
    const activities: Array<{
      type: string
      field: string
      oldValue: string
      newValue: string
    }> = []

    if (data.status && data.status !== existing.status) {
      activities.push({
        type: 'STATUS_CHANGED',
        field: 'status',
        oldValue: existing.status,
        newValue: data.status,
      })
      if (data.status === 'DONE') {
        (data as Record<string, unknown>).completedAt = new Date()
      }
    }
    if (data.priority && data.priority !== existing.priority) {
      activities.push({
        type: 'PRIORITY_CHANGED',
        field: 'priority',
        oldValue: existing.priority,
        newValue: data.priority,
      })
    }
    if (data.assigneeId !== undefined && data.assigneeId !== existing.assigneeId) {
      activities.push({
        type: 'ASSIGNED',
        field: 'assigneeId',
        oldValue: existing.assigneeId ?? '',
        newValue: data.assigneeId ?? '',
      })
    }
    if (data.storyPoints !== undefined && data.storyPoints !== existing.storyPoints) {
      activities.push({
        type: 'STORY_POINTS_CHANGED',
        field: 'storyPoints',
        oldValue: String(existing.storyPoints ?? ''),
        newValue: String(data.storyPoints ?? ''),
      })
    }
    if (data.sprintId !== undefined && data.sprintId !== existing.sprintId) {
      activities.push({
        type: 'SPRINT_CHANGED',
        field: 'sprintId',
        oldValue: existing.sprintId ?? '',
        newValue: data.sprintId ?? '',
      })
    }

    const ticket = await prisma.ticket.update({
      where: { id: ticketId },
      data: {
        ...data,
        dueDate: dueDate ? new Date(dueDate) : dueDate === null ? null : undefined,
        labels: labelIds
          ? {
              deleteMany: {},
              create: labelIds.map((labelId) => ({ labelId })),
            }
          : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, email: true, image: true } },
        reporter: { select: { id: true, name: true, email: true, image: true } },
        sprint: true,
        epic: true,
        parent: { select: { id: true, code: true, title: true } },
        subtasks: {
          include: { assignee: { select: { id: true, name: true, image: true } } },
        },
        labels: { include: { label: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    })

    // Create activity logs
    if (activities.length > 0) {
      await prisma.activity.createMany({
        data: activities.map((a) => ({
          ticketId,
          userId: session.user.id,
          type: a.type as Parameters<typeof prisma.activity.create>[0]['data']['type'],
          field: a.field,
          oldValue: a.oldValue,
          newValue: a.newValue,
        })),
      })
    }

    return NextResponse.json(ticket)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ ticketId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { ticketId } = await params

  await prisma.ticket.delete({ where: { id: ticketId } })
  return NextResponse.json({ success: true })
}
