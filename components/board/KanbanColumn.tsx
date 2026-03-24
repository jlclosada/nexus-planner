'use client'

import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { TicketCard } from './TicketCard'
import { cn, getStatusColor } from '@/lib/utils'
import type { TicketWithRelations, TicketStatus } from '@/types'

interface KanbanColumnProps {
  id: string
  title: string
  status: TicketStatus
  tickets: TicketWithRelations[]
  onTicketClick: (ticket: TicketWithRelations) => void
  onAddTicket: (status: TicketStatus) => void
}

export function KanbanColumn({
  id,
  title,
  status,
  tickets,
  onTicketClick,
  onAddTicket,
}: KanbanColumnProps) {
  const { setNodeRef, isOver } = useDroppable({ id })
  const color = getStatusColor(status)

  return (
    <div
      className={cn(
        'flex flex-col rounded-xl transition-all duration-150',
        isOver ? 'ring-1' : ''
      )}
      style={{
        minWidth: '280px',
        maxWidth: '300px',
        flex: '0 0 280px',
        background: isOver ? `${color}0a` : 'rgba(15,15,26,0.6)',
        border: isOver ? `1px solid ${color}50` : '1px solid rgba(255,255,255,0.05)',
        ringColor: undefined,
      }}
    >
      {/* Column header */}
      <div className="p-3 border-b border-white/[0.04]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
            <h3 className="text-sm font-semibold text-slate-300">{title}</h3>
            <span
              className="text-xs px-1.5 py-0.5 rounded-full font-medium"
              style={{ background: `${color}15`, color }}
            >
              {tickets.length}
            </span>
          </div>
          <button
            onClick={() => onAddTicket(status)}
            className="p-1 rounded hover:bg-white/[0.06] text-slate-600 hover:text-slate-400 transition-colors"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Cards — NO motion.div layout wrapper: conflicts with dnd-kit transforms */}
      <SortableContext
        id={id}
        items={tickets.map((t) => t.id)}
        strategy={verticalListSortingStrategy}
      >
        <div
          ref={setNodeRef}
          className="flex-1 p-2 space-y-2 overflow-y-auto min-h-[120px]"
          style={{ maxHeight: 'calc(100vh - 280px)' }}
        >
          {tickets.map((ticket) => (
            <TicketCard
              key={ticket.id}
              ticket={ticket}
              onClick={() => onTicketClick(ticket)}
            />
          ))}

          {tickets.length === 0 && (
            <div
              className="flex items-center justify-center h-20 rounded-lg border border-dashed text-xs"
              style={{
                borderColor: isOver ? `${color}60` : 'rgba(255,255,255,0.06)',
                color: isOver ? color : '#334155',
              }}
            >
              {isOver ? 'Soltar aquí' : 'Sin tickets'}
            </div>
          )}
        </div>
      </SortableContext>
    </div>
  )
}
