import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createSprintSchema = z.object({
  projectId: z.string(),
  name: z.string().min(2),
  goal: z.string().optional(),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createSprintSchema.parse(body)

    const lastSprint = await prisma.sprint.findFirst({
      where: { projectId: data.projectId },
      orderBy: { number: 'desc' },
    })

    const number = (lastSprint?.number ?? 0) + 1

    const sprint = await prisma.sprint.create({
      data: {
        projectId: data.projectId,
        number,
        name: data.name,
        goal: data.goal,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        tickets: true,
        _count: { select: { tickets: true } },
      },
    })

    return NextResponse.json(sprint, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
