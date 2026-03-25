import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createProjectSchema = z.object({
  name: z.string().min(2).max(100),
  key: z.string().min(2).max(6).toUpperCase(),
  description: z.string().optional(),
  color: z.string().default('#6366f1'),
  icon: z.string().optional(),
})

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const projects = await prisma.project.findMany({
    where: {
      members: { some: { userId: session.user.id } },
    },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      _count: { select: { tickets: true, members: true } },
      sprints: {
        where: { status: 'ACTIVE' },
        take: 1,
        include: {
          tickets: {
            select: { status: true, storyPoints: true },
          },
        },
      },
    },
    orderBy: { updatedAt: 'desc' },
  })

  // Compute sprint stats for each project
  const enriched = projects.map((p) => {
    const sprint = p.sprints[0] ?? null
    if (!sprint) return { ...p, sprintStats: null }

    const tickets = sprint.tickets ?? []
    const totalPoints = tickets.reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
    const donePoints  = tickets.filter(t => t.status === 'DONE').reduce((sum, t) => sum + (t.storyPoints ?? 0), 0)
    const totalCount  = tickets.length
    const doneCount   = tickets.filter(t => t.status === 'DONE').length
    const inProgressCount = tickets.filter(t => t.status === 'IN_PROGRESS').length
    const blockedCount = tickets.filter(t => t.status === 'BLOCKED').length

    return {
      ...p,
      sprintStats: { totalPoints, donePoints, totalCount, doneCount, inProgressCount, blockedCount },
    }
  })

  return NextResponse.json(enriched)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const body = await request.json()
    const data = createProjectSchema.parse(body)

    const existingKey = await prisma.project.findUnique({ where: { key: data.key } })
    if (existingKey) {
      return NextResponse.json({ error: 'Project key already in use' }, { status: 400 })
    }

    const project = await prisma.project.create({
      data: {
        ...data,
        members: {
          create: {
            userId: session.user.id,
            role: 'OWNER',
          },
        },
      },
      include: {
        members: {
          include: { user: { select: { id: true, name: true, email: true, image: true } } },
        },
        _count: { select: { tickets: true, members: true } },
      },
    })

    return NextResponse.json(project, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
