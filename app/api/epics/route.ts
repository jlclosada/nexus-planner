import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createEpicSchema = z.object({
  projectId: z.string(),
  title: z.string().min(2),
  description: z.string().optional(),
  color: z.string().default('#8b5cf6'),
  startDate: z.string().optional(),
  endDate: z.string().optional(),
})

export async function GET(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const projectId = searchParams.get('projectId')

  const epics = await prisma.epic.findMany({
    where: projectId ? { projectId } : undefined,
    include: {
      tickets: {
        select: { id: true, status: true, storyPoints: true },
      },
      _count: { select: { tickets: true } },
    },
    orderBy: { createdAt: 'desc' },
  })

  return NextResponse.json(epics)
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const data = createEpicSchema.parse(body)

    const epic = await prisma.epic.create({
      data: {
        ...data,
        startDate: data.startDate ? new Date(data.startDate) : undefined,
        endDate: data.endDate ? new Date(data.endDate) : undefined,
      },
      include: {
        _count: { select: { tickets: true } },
      },
    })

    return NextResponse.json(epic, { status: 201 })
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
