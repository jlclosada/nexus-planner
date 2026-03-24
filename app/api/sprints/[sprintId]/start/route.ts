import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(
  _request: Request,
  { params }: { params: Promise<{ sprintId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { sprintId } = await params

  const sprint = await prisma.sprint.findUnique({ where: { id: sprintId } })
  if (!sprint) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  // Check no other active sprint in the same project
  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId: sprint.projectId, status: 'ACTIVE' },
  })

  if (activeSprint && activeSprint.id !== sprintId) {
    return NextResponse.json({ error: 'Another sprint is already active' }, { status: 400 })
  }

  const updated = await prisma.sprint.update({
    where: { id: sprintId },
    data: {
      status: 'ACTIVE',
      startDate: sprint.startDate ?? new Date(),
    },
  })

  return NextResponse.json(updated)
}
