import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createTicketSchema = z.object({
  projectId: z.string(),
  title: z.string().min(1).max(500),
  description: z.string().optional(),
  type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK', 'SPIKE']).default('TASK'),
  status: z.enum(['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']).default('BACKLOG'),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']).default('MEDIUM'),
  storyPoints: z.number().int().optional(),
  sprintId: z.string().optional(),
  epicId: z.string().optional(),
  parentId: z.string().optional(),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
})

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')
  const sprintId = searchParams.get('sprintId')
  const status = searchParams.get('status')
  const assigneeId = searchParams.get('assigneeId')
  const epicId = searchParams.get('epicId')
  const backlog = searchParams.get('backlog') === 'true'

  const where: Record<string, unknown> = {}
  if (projectId) where.projectId = projectId
  if (sprintId) where.sprintId = sprintId
  if (status) where.status = status
  if (assigneeId) where.assigneeId = assigneeId
  if (epicId) where.epicId = epicId
  if (backlog) where.sprintId = null

  const tickets = await prisma.ticket.findMany({
    where,
    include: {
      assignee: { select: { id: true, name: true, image: true } },
      reporter: { select: { id: true, name: true, image: true } },
      epic: { select: { id: true, title: true, color: true } },
      labels: { include: { label: true } },
      _count: { select: { subtasks: true, comments: true } },
    },
    orderBy: [{ order: 'asc' }, { createdAt: 'desc' }],
  })

  return NextResponse.json(tickets)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { labelIds, ...data } = createTicketSchema.parse(body)

    // Generate ticket code
    const project = await prisma.project.findUnique({ where: { id: data.projectId } })
    if (!project) return NextResponse.json({ error: 'Project not found' }, { status: 404 })

    const count = await prisma.ticket.count({ where: { projectId: data.projectId } })
    const code = `${project.key}-${count + 1}`

    // Get max order in status
    const maxOrder = await prisma.ticket.findFirst({
      where: { projectId: data.projectId, status: data.status },
      orderBy: { order: 'desc' },
      select: { order: true },
    })

    const ticket = await prisma.ticket.create({
      data: {
        ...data,
        code,
        reporterId: session.user.id,
        order: (maxOrder?.order ?? 0) + 1,
        dueDate: data.dueDate ? new Date(data.dueDate) : undefined,
        labels: labelIds
          ? {
              create: labelIds.map((labelId) => ({ labelId })),
            }
          : undefined,
      },
      include: {
        assignee: { select: { id: true, name: true, image: true } },
        reporter: { select: { id: true, name: true, image: true } },
        epic: { select: { id: true, title: true, color: true } },
        labels: { include: { label: true } },
        _count: { select: { subtasks: true, comments: true } },
      },
    })

    // Log activity
    await prisma.activity.create({
      data: {
        ticketId: ticket.id,
        userId: session.user.id,
        type: 'CREATED',
        newValue: ticket.title,
      },
    })

    return NextResponse.json(ticket, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    console.error(error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
