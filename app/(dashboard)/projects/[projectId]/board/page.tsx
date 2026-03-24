'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Filter, Zap, RefreshCw } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { KanbanBoard } from '@/components/board/KanbanBoard'
import { TicketModal } from '@/components/tickets/TicketModal'
import { CreateTicketDialog } from '@/components/tickets/CreateTicketDialog'
import type { TicketWithRelations, TicketStatus, SprintWithTickets, ProjectWithRelations } from '@/types'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

export default function BoardPage({
  params,
}: {
  params: Promise<{ projectId: string }>
}) {
  const { projectId } = use(params)
  const queryClient = useQueryClient()
  const [selectedTicketId, setSelectedTicketId] = useState<string | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [createStatus, setCreateStatus] = useState<TicketStatus>('TODO')
  const [sprintFilter, setSprintFilter] = useState<string>('active')

  const { data: project } = useQuery<ProjectWithRelations>({
    queryKey: ['project', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then((r) => r.json()),
  })

  const { data: tickets = [], isLoading, refetch } = useQuery<TicketWithRelations[]>({
    queryKey: ['tickets', projectId, sprintFilter],
    queryFn: () => {
      const activeSprint = project?.sprints?.find((s) => s.status === 'ACTIVE')
      if (sprintFilter === 'active' && activeSprint) {
        return fetch(`/api/tickets?projectId=${projectId}&sprintId=${activeSprint.id}`).then((r) => r.json())
      }
      if (sprintFilter === 'all') {
        return fetch(`/api/tickets?projectId=${projectId}`).then((r) => r.json())
      }
      if (sprintFilter && sprintFilter !== 'active' && sprintFilter !== 'all') {
        return fetch(`/api/tickets?projectId=${projectId}&sprintId=${sprintFilter}`).then((r) => r.json())
      }
      return fetch(`/api/tickets?projectId=${projectId}`).then((r) => r.json())
    },
    enabled: !!projectId,
  })

  const updateTicket = useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<TicketWithRelations> }) =>
      fetch(`/api/tickets/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', projectId] })
    },
  })

  const activeSprint = project?.sprints?.find((s) => s.status === 'ACTIVE')

  const handleAddTicket = (status: TicketStatus) => {
    setCreateStatus(status)
    setCreateOpen(true)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Board toolbar */}
      <div
        className="flex items-center justify-between px-6 py-3 border-b border-white/[0.06]"
        style={{ background: 'rgba(10,10,15,0.5)' }}
      >
        <div className="flex items-center gap-3">
          {/* Sprint selector */}
          <div className="flex items-center gap-2">
            <Zap className="w-3.5 h-3.5 text-indigo-400" />
            <Select value={sprintFilter} onValueChange={setSprintFilter}>
              <SelectTrigger className="h-7 bg-white/[0.04] border-white/10 text-slate-300 text-xs w-40">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-[#1a1a2e] border-white/10">
                <SelectItem value="active" className="text-slate-300 text-xs">
                  {activeSprint ? activeSprint.name : 'Active Sprint'}
                </SelectItem>
                <SelectItem value="all" className="text-slate-300 text-xs">All Tickets</SelectItem>
                {project?.sprints?.filter((s) => s.id !== activeSprint?.id).map((sprint) => (
                  <SelectItem key={sprint.id} value={sprint.id} className="text-slate-300 text-xs">
                    {sprint.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <button
            onClick={() => refetch()}
            className="p-1.5 hover:bg-white/[0.06] rounded text-slate-500 hover:text-slate-300 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {tickets.length > 0 && (
            <span className="text-xs text-slate-500">{tickets.length} tickets</span>
          )}
        </div>

        <Button
          size="sm"
          onClick={() => setCreateOpen(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white h-7 text-xs gap-1.5"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Ticket
        </Button>
      </div>

      {/* Board */}
      <div className="flex-1 overflow-hidden p-4">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex gap-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div
                  key={i}
                  className="w-[280px] h-[400px] rounded-xl shimmer"
                  style={{ background: 'rgba(15,15,26,0.6)' }}
                />
              ))}
            </div>
          </div>
        ) : (
          <KanbanBoard
            tickets={tickets}
            onTicketClick={(ticket) => setSelectedTicketId(ticket.id)}
            onAddTicket={handleAddTicket}
            onTicketUpdate={async (id, data) => {
              await updateTicket.mutateAsync({ id, data })
            }}
          />
        )}
      </div>

      {/* Ticket modal */}
      {selectedTicketId && (
        <TicketModal
          ticketId={selectedTicketId}
          projectId={projectId}
          onClose={() => setSelectedTicketId(null)}
        />
      )}

      {/* Create ticket dialog */}
      <CreateTicketDialog
        open={createOpen}
        onClose={() => setCreateOpen(false)}
        projectId={projectId}
        defaultStatus={createStatus}
      />
    </div>
  )
}
