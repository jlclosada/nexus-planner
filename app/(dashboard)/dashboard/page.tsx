'use client'

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
} from 'lucide-react'
import Link from 'next/link'
import { formatDateRelative, getStatusColor, getPriorityColor } from '@/lib/utils'
import { Badge } from '@/components/ui/badge'
import type { ProjectWithRelations, TicketWithRelations } from '@/types'

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

  const { data: projects = [] } = useQuery<ProjectWithRelations[]>({
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
                    className="flex items-center gap-3 p-3 rounded-lg hover:bg-white/[0.03] transition-colors group cursor-pointer"
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
          {/* Recent projects */}
          <div
            className="rounded-xl p-5"
            style={{
              background: 'rgba(19,19,31,0.8)',
              border: '1px solid rgba(255,255,255,0.06)',
            }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-base font-semibold text-slate-200">Projects</h2>
              <Link href="/projects/new">
                <button className="p-1.5 rounded-lg bg-indigo-500/15 text-indigo-400 hover:bg-indigo-500/25 transition-colors">
                  <Plus className="w-3.5 h-3.5" />
                </button>
              </Link>
            </div>

            {projects.length === 0 ? (
              <div className="text-center py-8">
                <FolderKanban className="w-10 h-10 text-slate-600 mx-auto mb-3" />
                <p className="text-slate-500 text-sm">No projects yet</p>
                <Link href="/projects/new">
                  <button className="mt-3 text-xs text-indigo-400 hover:text-indigo-300">
                    Create your first project
                  </button>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                {projects.slice(0, 5).map((project) => (
                  <Link key={project.id} href={`/projects/${project.id}`}>
                    <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
                      <div
                        className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ background: project.color }}
                      >
                        {project.key.slice(0, 2)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-slate-200 truncate">
                          {project.name}
                        </p>
                        <p className="text-xs text-slate-500">
                          {project._count?.tickets ?? 0} tickets
                        </p>
                      </div>
                      <ArrowRight className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 transition-colors" />
                    </div>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Quick tip */}
          <div
            className="rounded-xl p-5"
            style={{
              background: 'linear-gradient(135deg, rgba(99,102,241,0.1), rgba(139,92,246,0.05))',
              border: '1px solid rgba(99,102,241,0.2)',
            }}
          >
            <p className="text-sm font-medium text-indigo-300 mb-1">Pro Tip</p>
            <p className="text-xs text-slate-400">
              Press <kbd className="bg-white/10 px-1 rounded">⌘K</kbd> to open the command
              palette for quick navigation and actions.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
