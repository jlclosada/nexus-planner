import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateEpicSchema = z.object({
  title: z.string().min(2).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'DONE']).optional(),
  startDate: z.string().nullable().optional(),
  endDate: z.string().nullable().optional(),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { epicId } = await params

  const epic = await prisma.epic.findUnique({
    where: { id: epicId },
    include: {
      tickets: {
        include: {
          assignee: { select: { id: true, name: true, image: true } },
        },
      },
      _count: { select: { tickets: true } },
    },
  })

  if (!epic) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(epic)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { epicId } = await params

  try {
    const body = await request.json()
    const { startDate, endDate, ...data } = updateEpicSchema.parse(body)

    const epic = await prisma.epic.update({
      where: { id: epicId },
      data: {
        ...data,
        startDate: startDate ? new Date(startDate) : startDate === null ? null : undefined,
        endDate: endDate ? new Date(endDate) : endDate === null ? null : undefined,
      },
    })

    return NextResponse.json(epic)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ epicId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { epicId } = await params

  await prisma.epic.delete({ where: { id: epicId } })
  return NextResponse.json({ success: true })
}
