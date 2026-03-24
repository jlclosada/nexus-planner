'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Zap, Play, CheckCircle2, Clock, Loader2, Calendar } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { calculateSprintProgress, formatDate, getSprintStatusColor } from '@/lib/utils'
import type { ProjectWithRelations, TicketWithRelations } from '@/types'

export default function SprintsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [sprintName, setSprintName] = useState('')
  const [sprintGoal, setSprintGoal] = useState('')
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const { data: project } = useQuery<ProjectWithRelations>({
    queryKey: ['project', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then((r) => r.json()),
  })

  const { data: allTickets = [] } = useQuery<TicketWithRelations[]>({
    queryKey: ['tickets', projectId],
    queryFn: () => fetch(`/api/tickets?projectId=${projectId}`).then((r) => r.json()),
  })

  const createSprint = useMutation({
    mutationFn: () =>
      fetch('/api/sprints', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectId,
          name: sprintName,
          goal: sprintGoal,
          startDate: startDate || undefined,
          endDate: endDate || undefined,
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Sprint created!')
      setShowCreate(false)
      setSprintName('')
      setSprintGoal('')
    },
  })

  const startSprint = useMutation({
    mutationFn: (sprintId: string) =>
      fetch(`/api/sprints/${sprintId}/start`, { method: 'POST' }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error) })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Sprint started!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const completeSprint = useMutation({
    mutationFn: (sprintId: string) =>
      fetch(`/api/sprints/${sprintId}/complete`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      }).then((r) => r.json()),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', projectId] })
      toast.success(`Sprint completed! ${data.movedCount} tickets moved to backlog.`)
    },
  })

  const sprints = project?.sprints ?? []
  const getSprintTickets = (sprintId: string) => allTickets.filter((t) => t.sprintId === sprintId)

  const statusIcon: Record<string, React.ElementType> = {
    PLANNED: Clock,
    ACTIVE: Play,
    COMPLETED: CheckCircle2,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Sprints</h2>
          <p className="text-sm text-slate-500 mt-0.5">{sprints.length} sprints total</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Sprint
        </Button>
      </div>

      {/* Create sprint form */}
      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 mb-6"
          style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(99,102,241,0.2)' }}
        >
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Create Sprint</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-slate-300 text-xs">Sprint Name *</Label>
              <Input
                placeholder={`Sprint ${(sprints.length ?? 0) + 1}`}
                value={sprintName}
                onChange={(e) => setSprintName(e.target.value)}
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm"
              />
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-slate-300 text-xs">Sprint Goal</Label>
              <Textarea
                placeholder="What do you want to achieve?"
                value={sprintGoal}
                onChange={(e) => setSprintGoal(e.target.value)}
                rows={2}
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm resize-none"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Start Date</Label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-white/[0.04] border-white/10 text-slate-200 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">End Date</Label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-white/[0.04] border-white/10 text-slate-200 text-sm"
              />
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowCreate(false)}
              className="border-white/10 text-slate-400"
            >
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={!sprintName.trim() || createSprint.isPending}
              onClick={() => createSprint.mutate()}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {createSprint.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create'}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Sprint list */}
      <div className="space-y-4">
        {sprints
          .sort((a, b) => b.number - a.number)
          .map((sprint, i) => {
            const tickets = getSprintTickets(sprint.id)
            const progress = calculateSprintProgress(tickets)
            const StatusIcon = statusIcon[sprint.status] ?? Clock
            const statusColor = getSprintStatusColor(sprint.status)

            return (
              <motion.div
                key={sprint.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-5"
                style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <div
                      className="p-2 rounded-lg"
                      style={{ background: `${statusColor}15` }}
                    >
                      <StatusIcon className="w-4 h-4" style={{ color: statusColor }} />
                    </div>
                    <div>
                      <h3 className="font-semibold text-slate-200">{sprint.name}</h3>
                      <div className="flex items-center gap-2 mt-0.5">
                        <Badge
                          className="text-xs h-5"
                          style={{ background: `${statusColor}15`, color: statusColor, border: 'none' }}
                        >
                          {sprint.status}
                        </Badge>
                        {sprint.startDate && (
                          <span className="text-xs text-slate-500 flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {formatDate(sprint.startDate)}
                            {sprint.endDate && ` → ${formatDate(sprint.endDate)}`}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    {sprint.velocity !== null && sprint.velocity !== undefined && (
                      <span className="text-xs text-slate-500 flex items-center gap-1">
                        <Zap className="w-3 h-3 text-amber-400" />
                        {sprint.velocity} pts velocity
                      </span>
                    )}
                    {sprint.status === 'PLANNED' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                        onClick={() => startSprint.mutate(sprint.id)}
                        disabled={startSprint.isPending}
                      >
                        <Play className="w-3 h-3 mr-1" />
                        Start Sprint
                      </Button>
                    )}
                    {sprint.status === 'ACTIVE' && (
                      <Button
                        size="sm"
                        variant="outline"
                        className="h-7 text-xs border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        onClick={() => completeSprint.mutate(sprint.id)}
                        disabled={completeSprint.isPending}
                      >
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Complete Sprint
                      </Button>
                    )}
                  </div>
                </div>

                {sprint.goal && (
                  <p className="text-sm text-slate-400 mb-3">{sprint.goal}</p>
                )}

                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{tickets.length} tickets • {progress.completed}/{progress.total} story points</span>
                    <span>{progress.percentage}%</span>
                  </div>
                  <Progress value={progress.percentage} className="h-1.5 bg-white/5" />
                </div>

                {/* Status breakdown */}
                <div className="flex gap-3 mt-3">
                  {['DONE', 'IN_PROGRESS', 'TODO', 'BACKLOG', 'BLOCKED'].map((status) => {
                    const count = tickets.filter((t) => t.status === status).length
                    if (count === 0) return null
                    return (
                      <span key={status} className="text-xs text-slate-500">
                        <span className="text-slate-300 font-medium">{count}</span> {status.replace('_', ' ').toLowerCase()}
                      </span>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}

        {sprints.length === 0 && (
          <div className="text-center py-16">
            <Zap className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">No sprints yet</p>
          </div>
        )}
      </div>
    </div>
  )
}
