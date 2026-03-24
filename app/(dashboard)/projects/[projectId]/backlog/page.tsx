'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, ListTodo, Zap, ArrowRight, GripVertical } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { PriorityBadge, TypeBadge, StatusBadge } from '@/components/tickets/TicketBadge'
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog'
import { TicketModal } from '@/components/tickets/TicketModal'
import { calculateSprintProgress, formatDate } from '@/lib/utils'
import type { TicketWithRelations, SprintWithTickets, ProjectWithRelations } from '@/types'

export default function BacklogPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const queryClient = useQueryClient()
  const [createOpen, setCreateOpen] = useState(false)
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [selectedTickets, setSelectedTickets] = useState<Set<string>>(new Set())

  const { data: backlogTickets = [], isLoading: backlogLoading } = useQuery<TicketWithRelations[]>({
    queryKey: ['tickets', projectId, 'backlog'],
    queryFn: () => fetch(`/api/tickets?projectId=${projectId}&backlog=true`).then((r) => r.json()),
  })

  const { data: project } = useQuery<ProjectWithRelations>({
    queryKey: ['project', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then((r) => r.json()),
  })

  const { data: allSprintTickets = [] } = useQuery<TicketWithRelations[]>({
    queryKey: ['tickets', projectId],
    queryFn: () => fetch(`/api/tickets?projectId=${projectId}`).then((r) => r.json()),
  })

  const startSprint = useMutation({
    mutationFn: (sprintId: string) =>
      fetch(`/api/sprints/${sprintId}/start`, { method: 'POST' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Sprint started!')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const assignToSprint = useMutation({
    mutationFn: ({ ticketIds, sprintId }: { ticketIds: string[]; sprintId: string }) =>
      Promise.all(
        ticketIds.map((id) =>
          fetch(`/api/tickets/${id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ sprintId }),
          })
        )
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', projectId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', projectId, 'backlog'] })
      setSelectedTickets(new Set())
      toast.success('Tickets added to sprint!')
    },
  })

  const sprints = project?.sprints ?? []
  const plannedSprints = sprints.filter((s) => s.status === 'PLANNED')

  const getSprintTickets = (sprintId: string) =>
    allSprintTickets.filter((t) => t.sprintId === sprintId)

  const toggleSelect = (ticketId: string) => {
    const next = new Set(selectedTickets)
    if (next.has(ticketId)) next.delete(ticketId)
    else next.add(ticketId)
    setSelectedTickets(next)
  }

  return (
    <div className="flex h-full">
      {/* Backlog list */}
      <div className="flex-1 p-6 overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <ListTodo className="w-4 h-4 text-slate-400" />
            <h2 className="text-base font-semibold text-slate-200">Backlog</h2>
            <span
              className="text-xs px-2 py-0.5 rounded-full"
              style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8' }}
            >
              {backlogTickets.length}
            </span>
          </div>
          <div className="flex items-center gap-2">
            {selectedTickets.size > 0 && (
              <span className="text-xs text-slate-400">{selectedTickets.size} selected</span>
            )}
            <Button
              size="sm"
              onClick={() => setCreateOpen(true)}
              className="bg-indigo-600 hover:bg-indigo-500 text-white h-7 text-xs gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              Add
            </Button>
          </div>
        </div>

        {backlogLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-12 rounded-lg shimmer" style={{ background: 'rgba(19,19,31,0.8)' }} />
            ))}
          </div>
        ) : backlogTickets.length === 0 ? (
          <div className="text-center py-16">
            <ListTodo className="w-12 h-12 text-slate-700 mx-auto mb-3" />
            <p className="text-slate-500 text-sm">Backlog is empty</p>
            <p className="text-slate-600 text-xs mt-1">Create tickets to plan your work</p>
          </div>
        ) : (
          <div
            className="rounded-xl overflow-hidden"
            style={{ border: '1px solid rgba(255,255,255,0.06)' }}
          >
            {backlogTickets.map((ticket, i) => (
              <motion.div
                key={ticket.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.03 }}
                className="flex items-center gap-3 px-4 py-3 hover:bg-white/[0.03] transition-colors group border-b border-white/[0.03] last:border-0 cursor-pointer"
                style={{ background: 'rgba(19,19,31,0.8)' }}
              >
                <input
                  type="checkbox"
                  checked={selectedTickets.has(ticket.id)}
                  onChange={() => toggleSelect(ticket.id)}
                  onClick={(e) => e.stopPropagation()}
                  className="rounded border-white/20 bg-transparent"
                />
                <GripVertical className="w-3.5 h-3.5 text-slate-700 group-hover:text-slate-500 cursor-grab" />
                <TypeBadge type={ticket.type} />
                <span className="text-xs text-slate-500 font-medium w-16 flex-shrink-0">{ticket.code}</span>
                <span
                  className="flex-1 text-sm text-slate-300 hover:text-white cursor-pointer truncate"
                  onClick={() => setSelectedTicketId(ticket.id)}
                >
                  {ticket.title}
                </span>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {ticket.epic && (
                    <span
                      className="hidden sm:inline-block text-xs px-1.5 py-0.5 rounded"
                      style={{ color: ticket.epic.color, background: `${ticket.epic.color}15` }}
                    >
                      {ticket.epic.title}
                    </span>
                  )}
                  <PriorityBadge priority={ticket.priority} />
                  {ticket.storyPoints !== null && ticket.storyPoints !== undefined && (
                    <span className="text-xs text-slate-500 bg-white/[0.05] px-1.5 py-0.5 rounded">
                      {ticket.storyPoints}p
                    </span>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Sprints panel */}
      <div
        className="w-80 flex-shrink-0 border-l border-white/[0.06] p-4 overflow-auto"
        style={{ background: 'rgba(10,10,15,0.6)' }}
      >
        <h3 className="text-sm font-semibold text-slate-300 mb-4">Sprints</h3>

        <div className="space-y-3">
          {sprints.map((sprint) => {
            const sprintTickets = getSprintTickets(sprint.id)
            const progress = calculateSprintProgress(sprintTickets)

            return (
              <div
                key={sprint.id}
                className="rounded-lg p-3"
                style={{
                  background: 'rgba(19,19,31,0.8)',
                  border: '1px solid rgba(255,255,255,0.06)',
                }}
              >
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <p className="text-sm font-medium text-slate-200">{sprint.name}</p>
                    <p className="text-xs text-slate-500">
                      {sprint.status === 'ACTIVE' ? (
                        <span className="text-indigo-400">Active</span>
                      ) : sprint.status === 'COMPLETED' ? (
                        <span className="text-emerald-400">Completed</span>
                      ) : (
                        'Planned'
                      )}
                      {' • '}
                      {sprintTickets.length} tickets
                    </p>
                  </div>
                  {sprint.status === 'PLANNED' && (
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-6 text-xs border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                      onClick={() => startSprint.mutate(sprint.id)}
                    >
                      Start
                    </Button>
                  )}
                </div>

                {sprint.status !== 'PLANNED' && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-xs text-slate-600">
                      <span>{progress.completed}/{progress.total} pts</span>
                      <span>{progress.percentage}%</span>
                    </div>
                    <Progress value={progress.percentage} className="h-1 bg-white/5" />
                  </div>
                )}

                {/* Drop zone for selected tickets */}
                {selectedTickets.size > 0 && sprint.status !== 'COMPLETED' && (
                  <button
                    className="w-full mt-2 py-2 text-xs text-indigo-400 rounded border border-dashed border-indigo-500/30 hover:bg-indigo-500/10 transition-colors"
                    onClick={() =>
                      assignToSprint.mutate({
                        ticketIds: Array.from(selectedTickets),
                        sprintId: sprint.id,
                      })
                    }
                  >
                    Add {selectedTickets.size} ticket{selectedTickets.size > 1 ? 's' : ''} to sprint
                  </button>
                )}
              </div>
            )
          })}

          {sprints.length === 0 && (
            <p className="text-xs text-slate-600 text-center py-4">No sprints yet</p>
          )}
        </div>
      </div>

      <CreateTicketDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        defaultStatus="BACKLOG"
      />

      {selectedTicketId && (
        <TicketModal
          ticketId={selectedTicketId}
          projectId={projectId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}
    </div>
  )
}
