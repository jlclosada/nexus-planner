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

export function TypeBadge({ type, showLabel }: { type: TicketType; showLabel?: boolean }) {
  const color = getTicketTypeColor(type)
  const icons: Record<TicketType, React.ElementType> = {
    EPIC: Layers, STORY: BookOpen, TASK: CheckSquare,
    BUG: Bug, SUBTASK: CheckSquare, SPIKE: FlaskConical,
  }
  const labels: Record<TicketType, string> = {
    EPIC: 'Epic', STORY: 'Story', TASK: 'Task',
    BUG: 'Bug', SUBTASK: 'Subtask', SPIKE: 'Spike',
  }
  const Icon = icons[type]

  if (showLabel) {
    return (
      <div
        className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-medium"
        style={{ color, background: `${color}18` }}
      >
        <Icon className="w-3 h-3" />
        {labels[type]}
      </div>
    )
  }

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
