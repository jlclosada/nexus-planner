import { cn, getPriorityColor, getStatusColor, getTicketTypeColor } from '@/lib/utils'
import {
  AlertCircle, Bug, Layers, Zap, CheckSquare, BookOpen,
  FlaskConical, ArrowUp, ArrowDown, Minus, ChevronsUp, ChevronDown,
} from 'lucide-react'
import type { Priority, TicketStatus, TicketType } from '@/types'

export function PriorityBadge({ priority }: { priority: Priority }) {
  const color = getPriorityColor(priority)
  const icons: Record<Priority, React.ElementType> = {
    CRITICAL: ChevronsUp,
    HIGH: ArrowUp,
    MEDIUM: Minus,
    LOW: ChevronDown,
  }
  const Icon = icons[priority]

  return (
    <div
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs font-medium"
      style={{ color, background: `${color}15` }}
    >
      <Icon className="w-3 h-3" />
      {priority}
    </div>
  )
}

export function StatusBadge({ status }: { status: TicketStatus }) {
  const color = getStatusColor(status)
  return (
    <div
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
      style={{ color, background: `${color}15` }}
    >
      <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: color }} />
      {status.replace('_', ' ')}
    </div>
  )
}

export function TypeBadge({ type }: { type: TicketType }) {
  const color = getTicketTypeColor(type)
  const icons: Record<TicketType, React.ElementType> = {
    EPIC: Layers,
    STORY: BookOpen,
    TASK: CheckSquare,
    BUG: Bug,
    SUBTASK: CheckSquare,
    SPIKE: FlaskConical,
  }
  const Icon = icons[type]

  return (
    <div
      className="inline-flex items-center justify-center w-5 h-5 rounded"
      style={{ color, background: `${color}20` }}
      title={type}
    >
      <Icon className="w-3 h-3" />
    </div>
  )
}
