'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  FolderKanban,
  Zap,
  CheckCircle2,
  Clock,
  TrendingUp,
  ArrowRight,
  Plus,
  CalendarDays,
  Users,
  BarChart2,
  AlertTriangle,
} from 'lucide-react'
import Link from 'next/link'
import { getStatusColor, getPriorityColor, formatDate } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { TicketModal } from '@/components/tickets/TicketModal'
import { getInitials } from '@/lib/utils'
import type { TicketWithRelations } from '@/types'

type ProjectWithStats = {
  id: string; key: string; name: string; color: string; status: string
  _count: { tickets: number; members: number }
  members: { user: { id: string; name: string | null; email: string; image: string | null } }[]
  sprints: {
    id: string; name: string; status: string; startDate: string | null; endDate: string | null
    tickets: { status: string; storyPoints: number | null }[]
  }[]
  sprintStats: {
    totalPoints: number; donePoints: number
    totalCount: number; doneCount: number
    inProgressCount: number; blockedCount: number
  } | null
}

function StatCard({
  icon: Icon,
  label,
  value,
  change,
  color,
}: {
  icon: React.ElementType
  label: string
  value: number | string
  change?: string
  color: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5 relative overflow-hidden"
      style={{
        background: 'rgba(19,19,31,0.8)',
        border: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-sm text-slate-500">{label}</p>
          <p className="text-3xl font-bold text-slate-100 mt-1">{value}</p>
          {change && (
            <p className="text-xs text-emerald-400 mt-1 flex items-center gap-1">
              <TrendingUp className="w-3 h-3" />
              {change}
            </p>
          )}
        </div>
        <div
          className="p-3 rounded-lg"
          style={{ background: `${color}18` }}
        >
          <Icon className="w-5 h-5" style={{ color }} />
        </div>
      </div>
      <div
        className="absolute bottom-0 left-0 right-0 h-0.5 opacity-40"
        style={{ background: `linear-gradient(to right, ${color}, transparent)` }}
      />
    </motion.div>
  )
}

export default function DashboardPage() {
  const { data: session } = useSession()
  const [selectedTicket, setSelectedTicket] = useState<{ id: string; projectId: string } | null>(null)

  const { data: projects = [] } = useQuery<ProjectWithStats[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then((r) => r.json()),
  })

  const { data: myTickets = [] } = useQuery<TicketWithRelations[]>({
    queryKey: ['tickets', 'my-assigned'],
    queryFn: () =>
      fetch(`/api/tickets?assigneeId=${session?.user?.id}`).then((r) => r.json()),
    enabled: !!session?.user?.id,
  })

  const activeProjects = projects.filter((p) => p.status === 'ACTIVE').length
  const openTickets = myTickets.filter((t) => t.status !== 'DONE').length
  const completedThisWeek = myTickets.filter((t) => {
    if (!t.completedAt) return false
    const weekAgo = new Date()
    weekAgo.setDate(weekAgo.getDate() - 7)
    return new Date(t.completedAt) >= weekAgo
  }).length

  const hour = new Date().getHours()
  const greeting =
    hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening'

  const firstName = session?.user?.name?.split(' ')[0] ?? 'there'

  return (
    <>
    <div className="p-8 max-w-7xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="text-3xl font-bold text-slate-100">
          {greeting}, {firstName}! 👋
        </h1>
        <p className="text-slate-500 mt-1">
          Here&apos;s what&apos;s happening across your projects today.
        </p>
      </motion.div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatCard
          icon={FolderKanban}
          label="Active Projects"
          value={activeProjects}
          color="#6366f1"
        />
        <StatCard
          icon={Zap}
          label="Active Sprints"
          value={projects.filter((p) => p.sprints?.some((s) => s.status === 'ACTIVE')).length}
          color="#8b5cf6"
        />
        <StatCard
          icon={Clock}
          label="Open Tickets"
          value={openTickets}
          color="#f59e0b"
        />
        <StatCard
          icon={CheckCircle2}
          label="Completed This Week"
          value={completedThisWeek}
          change="+2 from last week"
          color="#10b981"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* My Assigned Tickets */}
        <div className="lg:col-span-2">
          <div
            className="rounded-xl p-5"
            style={{
              background: 'rgba(19,19,31,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">My Tickets</h2>
              <Link
                href="/my-work"
                className="text-sm text-indigo-400 hover:text-indigo-300 flex items-center gap-1"
              >
                View all <ArrowRight className="w-3 h-3" />
              </Link>
            </div>

            {myTickets.length === 0 ? (
              <div className="text-center py-12">
                <CheckCircle2 className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No tickets assigned to you</p>
                <p className="text-slate-600 text-xs mt-1">Time to pick up some work!</p>
              </div>
            ) : (
              <div className="space-y-2">
                {myTickets.slice(0, 8).map((ticket, i) => (
                  <motion.div
                    key={ticket.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    onClick={() => setSelectedTicket({ id: ticket.id, projectId: ticket.projectId })}
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.04] hover:border-white/[0.06] border border-transparent transition-all duration-150 group cursor-pointer"
                  >
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: getStatusColor(ticket.status) }}
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-medium text-slate-500">{ticket.code}</span>
                        <span className="text-sm text-slate-300 truncate">{ticket.title}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <Badge
                        variant="outline"
                        className="text-xs border-0"
                        style={{
                          color: getPriorityColor(ticket.priority),
                          background: `${getPriorityColor(ticket.priority)}15`,
                        }}
                      >
                        {ticket.priority}
                      </Badge>
                      <Badge
                        variant="outline"
                        className="text-xs border-0"
                        style={{
                          color: getStatusColor(ticket.status),
                          background: `${getStatusColor(ticket.status)}15`,
                        }}
                      >
                        {ticket.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Projects sidebar */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-semibold text-slate-200">Projects</h2>
            <Link href="/projects/new"
              className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors">
              <Plus className="w-3.5 h-3.5" />
            </Link>
          </div>

          {projects.length === 0 ? (
            <div
              className="rounded-xl p-8 text-center"
              style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
            >
              <FolderKanban className="w-10 h-10 text-slate-600 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No projects yet</p>
              <Link href="/projects/new" className="mt-3 text-xs text-indigo-400 hover:text-indigo-300 block">
                Create your first project
              </Link>
            </div>
          ) : (
            <div className="space-y-3">
              {projects.slice(0, 4).map((project, i) => {
                const sprint = project.sprints?.[0] ?? null
                const stats = project.sprintStats
                const pct = stats && stats.totalCount > 0
                  ? Math.round((stats.doneCount / stats.totalCount) * 100)
                  : 0
                const ptsPct = stats && stats.totalPoints > 0
                  ? Math.round((stats.donePoints / stats.totalPoints) * 100)
                  : 0

                return (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    className="rounded-xl p-4 group hover:border-white/10 transition-all duration-200"
                    style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
                  >
                    {/* Header */}
                    <div className="flex items-center gap-2.5 mb-3">
                      <div
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0"
                        style={{ background: project.color }}
                      >
                        {project.key.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <Link href={`/projects/${project.id}`}
                          className="text-sm font-semibold text-slate-200 hover:text-white truncate block transition-colors">
                          {project.name}
                        </Link>
                        <p className="text-xs text-slate-600">{project.key} · {project._count?.tickets ?? 0} tickets</p>
                      </div>
                      <Link href={`/projects/${project.id}/board`}
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-lg hover:bg-white/10 text-slate-500 hover:text-slate-200 transition-all">
                        <ArrowRight className="w-3.5 h-3.5" />
                      </Link>
                    </div>

                    {/* Active sprint info */}
                    {sprint ? (
                      <div className="space-y-2.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-indigo-400" />
                            <span className="text-xs font-medium text-slate-300">{sprint.name}</span>
                          </div>
                          {sprint.endDate && (
                            <div className="flex items-center gap-1 text-xs text-slate-600">
                              <CalendarDays className="w-3 h-3" />
                              {formatDate(sprint.endDate)}
                            </div>
                          )}
                        </div>

                        {/* Progress bar */}
                        {stats && stats.totalCount > 0 && (
                          <div>
                            <div className="flex items-center justify-between text-xs text-slate-600 mb-1">
                              <span>{stats.doneCount}/{stats.totalCount} done</span>
                              <span>{pct}%</span>
                            </div>
                            <div className="h-1 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                              <motion.div
                                className="h-full rounded-full"
                                style={{ background: `linear-gradient(90deg, ${project.color}, ${project.color}90)` }}
                                initial={{ width: 0 }}
                                animate={{ width: `${pct}%` }}
                                transition={{ duration: 0.6, delay: i * 0.06 + 0.2, ease: 'easeOut' }}
                              />
                            </div>
                          </div>
                        )}

                        {/* Stats row */}
                        {stats && (
                          <div className="flex items-center gap-3 text-xs text-slate-600">
                            {stats.totalPoints > 0 && (
                              <span className="flex items-center gap-1">
                                <Zap className="w-3 h-3 text-amber-500/60" />
                                {stats.donePoints}/{stats.totalPoints} pts
                              </span>
                            )}
                            {stats.inProgressCount > 0 && (
                              <span className="flex items-center gap-1">
                                <BarChart2 className="w-3 h-3 text-indigo-400/60" />
                                {stats.inProgressCount} in progress
                              </span>
                            )}
                            {stats.blockedCount > 0 && (
                              <span className="flex items-center gap-1 text-red-400/60">
                                <AlertTriangle className="w-3 h-3" />
                                {stats.blockedCount} blocked
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-600 italic">No active sprint</p>
                    )}

                    {/* Members */}
                    <div className="flex items-center gap-2 mt-3 pt-3 border-t border-white/[0.04]">
                      <div className="flex -space-x-1.5">
                        {project.members?.slice(0, 4).map((m) => (
                          <Avatar key={m.user.id} className="w-5 h-5 border border-[#0f0f1a]">
                            <AvatarImage src={m.user.image ?? undefined} />
                            <AvatarFallback className="text-[7px] bg-indigo-500/20 text-indigo-400">
                              {getInitials(m.user.name)}
                            </AvatarFallback>
                          </Avatar>
                        ))}
                      </div>
                      <span className="text-xs text-slate-600">
                        {project._count?.members ?? 0} member{project._count?.members !== 1 ? 's' : ''}
                      </span>
                    </div>
                  </motion.div>
                )
              })}
            </div>
          )}

          {/* Quick tip */}
          <div
            className="rounded-xl p-4"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.08), rgba(139,92,246,0.04))',
              border: '1px solid rgba(99,102,241,0.15)',
            }}
          >
            <p className="text-xs font-medium text-indigo-300 mb-1">Pro Tip</p>
            <p className="text-xs text-slate-500">
              Press <kbd className="bg-white/10 px-1 py-0.5 rounded text-[10px]">⌘K</kbd> to open the command palette for quick navigation.
            </p>
          </div>
        </div>
      </div>
    </div>

    {selectedTicket && (
      <TicketModal
        ticketId={selectedTicket.id}
        projectId={selectedTicket.projectId}
        onClose={() => setSelectedTicket(null)}
      />
    )}
    </>
  )
}
