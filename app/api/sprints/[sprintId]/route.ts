import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateSprintSchema = z.object({
  name: z.string().min(2).optional(),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sprintId } = await params

  const sprint = await prisma.sprint.findUnique({
    where: { id: sprintId },
    include: {
      tickets: {
        include: {
          assignee: { select: { id: true, name: true, image: true } },
          epic: true,
          labels: { include: { label: true } },
          _count: { select: { subtasks: true, comments: true } },
        },
        orderBy: { order: 'asc' },
      },
    },
  })

  if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(sprint)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sprintId } = await params

  try {
    const body = await request.json()
    const data = updateSprintSchema.parse(body)

    const sprint = await prisma.sprint.update({
      where: { id: sprintId },
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
    })

    return NextResponse.json(sprint)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sprintId } = await params

  await prisma.sprint.delete({ where: { id: sprintId } })
  return NextResponse.json({ success: true })
}
