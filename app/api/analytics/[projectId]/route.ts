import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { subDays, format } from 'date-fns'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ projectId: string }> }
) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { projectId } = await params

  // Velocity data (last 5 sprints)
  const completedSprints = await prisma.sprint.findMany({
    where: { projectId, status: 'COMPLETED' },
    orderBy: { number: 'asc' },
    take: 5,
    include: {
      tickets: { select: { storyPoints: true, status: true } },
    },
  })

  const velocity = completedSprints.map((sprint) => ({
    sprint: sprint.name,
    points: sprint.velocity ?? sprint.tickets
      .filter((t) => t.status === 'DONE')
      .reduce((sum, t) => sum + (t.storyPoints || 0), 0),
  }))

  // Active sprint burndown
  const activeSprint = await prisma.sprint.findFirst({
    where: { projectId, status: 'ACTIVE' },
    include: {
      tickets: {
        select: { storyPoints: true, status: true, completedAt: true, createdAt: true },
      },
    },
  })

  let burndown: Array<{ date: string; remaining: number; ideal: number }> = []
  if (activeSprint && activeSprint.startDate && activeSprint.endDate) {
    const totalPoints = activeSprint.tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
    const start = new Date(activeSprint.startDate)
    const end = new Date(activeSprint.endDate)
    const days = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
    const dailyIdeal = totalPoints / days

    for (let i = 0; i <= days; i++) {
      const date = new Date(start)
      date.setDate(date.getDate() + i)
      if (date > new Date()) break

      const completedByDay = activeSprint.tickets
        .filter((t) => t.completedAt && new Date(t.completedAt) <= date)
        .reduce((sum, t) => sum + (t.storyPoints || 0), 0)

      burndown.push({
        date: format(date, 'MMM d'),
        remaining: Math.max(0, totalPoints - completedByDay),
        ideal: Math.max(0, totalPoints - dailyIdeal * i),
      })
    }
  }

  // Ticket distribution by status
  const distribution = await prisma.ticket.groupBy({
    by: ['status'],
    where: { projectId },
    _count: true,
  })

  // Cycle time (avg days per status)
  const tickets = await prisma.ticket.findMany({
    where: { projectId, status: 'DONE', completedAt: { not: null } },
    select: { createdAt: true, completedAt: true },
  })

  const avgCycleTime = tickets.length > 0
    ? tickets.reduce((sum, t) => {
        const days = (new Date(t.completedAt!).getTime() - new Date(t.createdAt).getTime()) / (1000 * 60 * 60 * 24)
        return sum + days
      }, 0) / tickets.length
    : 0

  // Recent activity over last 7 days
  const last7Days = subDays(new Date(), 7)
  const recentTickets = await prisma.ticket.findMany({
    where: {
      projectId,
      createdAt: { gte: last7Days },
    },
    select: { createdAt: true, status: true },
  })

  return NextResponse.json({
    velocity,
    burndown,
    distribution: distribution.map((d) => ({
      status: d.status,
      count: d._count,
    })),
    cycleTime: [{ status: 'DONE', avgDays: Math.round(avgCycleTime * 10) / 10 }],
    recentActivity: recentTickets.length,
    avgCycleTime: Math.round(avgCycleTime * 10) / 10,
  })
}
