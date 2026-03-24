'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Link from 'next/link'
import {
  Ticket, Users, Zap, CheckCircle2, Clock, AlertCircle,
  ArrowRight, TrendingUp, Calendar,
} from 'lucide-react'
import { Progress } from '@/components/ui/progress'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { formatDate, getInitials, getStatusColor, calculateSprintProgress } from '@/lib/utils'
import type { ProjectWithRelations, TicketWithRelations, SprintWithTickets } from '@/types'

export default function ProjectOverviewPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)

  const { data: project } = useQuery<ProjectWithRelations>({
    queryKey: ['project', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then((r) => r.json()),
  })

  const { data: tickets = [] } = useQuery<TicketWithRelations[]>({
    queryKey: ['tickets', projectId],
    queryFn: () => fetch(`/api/tickets?projectId=${projectId}`).then((r) => r.json()),
  })

  const { data: sprints = [] } = useQuery<SprintWithTickets[]>({
    queryKey: ['sprints', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then((r) => r.json()).then((p) => p.sprints ?? []),
  })

  const activeSprint = sprints.find((s) => s.status === 'ACTIVE')
  const activeSprintTickets = tickets.filter((t) => t.sprintId === activeSprint?.id)
  const progress = calculateSprintProgress(activeSprintTickets)

  const statusCounts = tickets.reduce((acc, t) => {
    acc[t.status] = (acc[t.status] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const statuses = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Total Tickets', value: tickets.length, icon: Ticket, color: '#6366f1' },
          { label: 'In Progress', value: statusCounts['IN_PROGRESS'] ?? 0, icon: Clock, color: '#f59e0b' },
          { label: 'Blocked', value: statusCounts['BLOCKED'] ?? 0, icon: AlertCircle, color: '#ef4444' },
          { label: 'Done', value: statusCounts['DONE'] ?? 0, icon: CheckCircle2, color: '#10b981' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="rounded-xl p-4"
            style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between">
              <p className="text-xs text-slate-500">{stat.label}</p>
              <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
            </div>
            <p className="text-2xl font-bold text-slate-100 mt-1">{stat.value}</p>
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Active Sprint */}
        <div className="lg:col-span-2 space-y-4">
          {activeSprint ? (
            <div
              className="rounded-xl p-5"
              style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <Zap className="w-4 h-4 text-indigo-400" />
                  <h3 className="font-semibold text-slate-200">Active Sprint</h3>
                  <Badge className="text-xs bg-indigo-500/15 text-indigo-400 border-0">
                    {activeSprint.name}
                  </Badge>
                </div>
                <Link href={`/projects/${projectId}/board`}>
                  <button className="text-xs text-indigo-400 hover:text-indigo-300 flex items-center gap-1">
                    Open Board <ArrowRight className="w-3 h-3" />
                  </button>
                </Link>
              </div>

              {activeSprint.goal && (
                <p className="text-sm text-slate-400 mb-4">{activeSprint.goal}</p>
              )}

              <div className="space-y-2">
                <div className="flex items-center justify-between text-xs text-slate-500">
                  <span>{progress.completed} / {progress.total} points</span>
                  <span>{progress.percentage}% complete</span>
                </div>
                <Progress
                  value={progress.percentage}
                  className="h-2 bg-white/5"
                />
              </div>

              <div className="mt-4 flex items-center gap-4">
                {activeSprint.startDate && (
                  <div className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Calendar className="w-3 h-3" />
                    {formatDate(activeSprint.startDate)} → {activeSprint.endDate ? formatDate(activeSprint.endDate) : 'No end'}
                  </div>
                )}
                <span className="text-xs text-slate-500">{activeSprintTickets.length} tickets</span>
              </div>
            </div>
          ) : (
            <div
              className="rounded-xl p-5"
              style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <p className="text-slate-500 text-sm">No active sprint. <Link href={`/projects/${projectId}/sprints`} className="text-indigo-400 hover:text-indigo-300">Start one →</Link></p>
            </div>
          )}

          {/* Status distribution */}
          <div
            className="rounded-xl p-5"
            style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <h3 className="font-semibold text-slate-200 mb-4">Ticket Distribution</h3>
            <div className="space-y-2">
              {statuses.map((status) => {
                const count = statusCounts[status] ?? 0
                const pct = tickets.length ? Math.round((count / tickets.length) * 100) : 0
                return (
                  <div key={status} className="flex items-center gap-3">
                    <span className="text-xs text-slate-500 w-24 flex-shrink-0">{status.replace('_', ' ')}</span>
                    <div className="flex-1 h-1.5 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all"
                        style={{ width: `${pct}%`, backgroundColor: getStatusColor(status) }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-6 text-right">{count}</span>
                  </div>
                )
              })}
            </div>
          </div>
        </div>

        {/* Team members */}
        <div>
          <div
            className="rounded-xl p-5"
            style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-slate-400" />
                <h3 className="font-semibold text-slate-200">Team</h3>
              </div>
              <Link href={`/projects/${projectId}/settings`}>
                <button className="text-xs text-indigo-400 hover:text-indigo-300">Manage</button>
              </Link>
            </div>

            <div className="space-y-3">
              {project?.members?.map((member) => (
                <div key={member.id} className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={member.user?.image ?? undefined} />
                    <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-xs">
                      {getInitials(member.user?.name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-slate-200 truncate">{member.user?.name}</p>
                    <p className="text-xs text-slate-500">{member.role}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
