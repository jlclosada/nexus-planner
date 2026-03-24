'use client'

import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { motion } from 'framer-motion'
import { MessageSquare, GitBranch, Hash } from 'lucide-react'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { PriorityBadge, TypeBadge } from '@/components/tickets/TicketBadge'
import { getInitials } from '@/lib/utils'
import type { TicketWithRelations } from '@/types'
import { cn } from '@/lib/utils'

interface TicketCardProps {
  ticket: TicketWithRelations
  onClick: () => void
  isDragOverlay?: boolean
}

export function TicketCard({ ticket, onClick, isDragOverlay = false }: TicketCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: ticket.id,
    data: { ticket, type: 'ticket' },
  })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      onClick={(e) => {
        if (!isDragging) {
          e.stopPropagation()
          onClick()
        }
      }}
      className={cn(
        'group cursor-pointer select-none',
        isDragging && 'opacity-40',
        isDragOverlay && 'shadow-2xl rotate-1'
      )}
    >
      <div
        className={cn(
          'rounded-lg p-3 transition-all duration-200',
          'hover:border-white/15 hover:shadow-lg',
          isDragOverlay ? 'shadow-2xl' : ''
        )}
        style={{
          background: isDragOverlay
            ? 'rgba(30,30,50,0.98)'
            : 'rgba(19,19,31,0.9)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        {/* Top row: type + code + priority */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <TypeBadge type={ticket.type} />
            <span className="text-xs font-medium text-slate-500">{ticket.code}</span>
          </div>
          <PriorityBadge priority={ticket.priority} />
        </div>

        {/* Title */}
        <p className="text-sm text-slate-200 leading-snug mb-2 line-clamp-2 group-hover:text-white transition-colors">
          {ticket.title}
        </p>

        {/* Epic label */}
        {ticket.epic && (
          <div
            className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs mb-2"
            style={{
              color: ticket.epic.color,
              background: `${ticket.epic.color}15`,
              border: `1px solid ${ticket.epic.color}25`,
            }}
          >
            <div className="w-1 h-1 rounded-full" style={{ backgroundColor: ticket.epic.color }} />
            {ticket.epic.title}
          </div>
        )}

        {/* Labels */}
        {ticket.labels && ticket.labels.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {ticket.labels.slice(0, 3).map(({ label }) => (
              <span
                key={label.id}
                className="px-1.5 py-0.5 rounded text-xs"
                style={{ background: `${label.color}20`, color: label.color }}
              >
                {label.name}
              </span>
            ))}
          </div>
        )}

        {/* Bottom row: comments, subtasks, points, avatar */}
        <div className="flex items-center justify-between mt-2 pt-2 border-t border-white/[0.04]">
          <div className="flex items-center gap-2 text-xs text-slate-600">
            {(ticket._count?.comments ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <MessageSquare className="w-3 h-3" />
                {ticket._count?.comments}
              </span>
            )}
            {(ticket._count?.subtasks ?? 0) > 0 && (
              <span className="flex items-center gap-0.5">
                <GitBranch className="w-3 h-3" />
                {ticket._count?.subtasks}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {ticket.storyPoints !== null && ticket.storyPoints !== undefined && (
              <div className="flex items-center gap-0.5 text-xs text-slate-500 bg-white/[0.05] px-1.5 py-0.5 rounded">
                <Hash className="w-2.5 h-2.5" />
                {ticket.storyPoints}
              </div>
            )}
            {ticket.assignee && (
              <Avatar className="w-5 h-5">
                <AvatarImage src={ticket.assignee.image ?? undefined} />
                <AvatarFallback className="text-[8px] bg-indigo-500/20 text-indigo-400">
                  {getInitials(ticket.assignee.name)}
                </AvatarFallback>
              </Avatar>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
