import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const updateProjectSchema = z.object({
  name: z.string().min(2).max(100).optional(),
  description: z.string().optional(),
  color: z.string().optional(),
  icon: z.string().optional(),
  status: z.enum(['ACTIVE', 'ARCHIVED']).optional(),
  repoProvider: z.string().optional(),
  repoOwner: z.string().optional(),
  repoName: z.string().optional(),
  repoToken: z.string().optional(),
  repoDefaultBranch: z.string().optional(),
})

async function checkProjectAccess(projectId: string, userId: string) {
  const member = await prisma.projectMember.findUnique({
    where: { projectId_userId: { projectId, userId } },
  })
  return member
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const member = await checkProjectAccess(projectId, session.user.id)
  if (!member) return NextResponse.json({ error: 'Not found' }, { status: 404 })

  const project = await prisma.project.findUnique({
    where: { id: projectId },
    include: {
      members: {
        include: { user: { select: { id: true, name: true, email: true, image: true } } },
      },
      sprints: { orderBy: { number: 'asc' } },
      epics: true,
      labels: true,
      _count: { select: { tickets: true } },
    },
  })

  if (!project) return NextResponse.json({ error: 'Not found' }, { status: 404 })
  return NextResponse.json(project)
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const member = await checkProjectAccess(projectId, session.user.id)
  if (!member || !['OWNER', 'ADMIN'].includes(member.role)) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const data = updateProjectSchema.parse(body)

    const project = await prisma.project.update({
      where: { id: projectId },
      data,
    })

    return NextResponse.json(project)
  } catch (error) {
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: error.errors }, { status: 400 })
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const { projectId } = await params

  const member = await checkProjectAccess(projectId, session.user.id)
  if (!member || member.role !== 'OWNER') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  await prisma.project.delete({ where: { id: projectId } })
  return NextResponse.json({ success: true })
}
