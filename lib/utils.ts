import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { format, formatDistanceToNow } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatDate(date: Date | string | null | undefined): string {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy')
}

export function formatDateRelative(date: Date | string | null | undefined): string {
  if (!date) return ''
  return formatDistanceToNow(new Date(date), { addSuffix: true })
}

export function formatDateTime(date: Date | string | null | undefined): string {
  if (!date) return ''
  return format(new Date(date), 'MMM d, yyyy HH:mm')
}

export function generateProjectKey(name: string): string {
  return name
    .split(' ')
    .map((word) => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 4)
}

export function getInitials(name: string | null | undefined): string {
  if (!name) return '?'
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

export function getPriorityColor(priority: string): string {
  switch (priority) {
    case 'CRITICAL':
      return '#ef4444'
    case 'HIGH':
      return '#f97316'
    case 'MEDIUM':
      return '#f59e0b'
    case 'LOW':
      return '#10b981'
    default:
      return '#94a3b8'
  }
}

export function getStatusColor(status: string): string {
  switch (status) {
    case 'BACKLOG':
      return '#64748b'
    case 'TODO':
      return '#94a3b8'
    case 'IN_PROGRESS':
      return '#6366f1'
    case 'IN_REVIEW':
      return '#8b5cf6'
    case 'BLOCKED':
      return '#ef4444'
    case 'DONE':
      return '#10b981'
    default:
      return '#94a3b8'
  }
}

export function getTicketTypeColor(type: string): string {
  switch (type) {
    case 'STORY':
      return '#6366f1'
    case 'TASK':
      return '#3b82f6'
    case 'BUG':
      return '#ef4444'
    case 'EPIC':
      return '#8b5cf6'
    case 'SUBTASK':
      return '#94a3b8'
    case 'SPIKE':
      return '#f59e0b'
    default:
      return '#94a3b8'
  }
}

export function getSprintStatusColor(status: string): string {
  switch (status) {
    case 'PLANNED':
      return '#94a3b8'
    case 'ACTIVE':
      return '#6366f1'
    case 'COMPLETED':
      return '#10b981'
    default:
      return '#94a3b8'
  }
}

export const FIBONACCI_POINTS = [1, 2, 3, 5, 8, 13, 21]

export function calculateSprintProgress(tickets: Array<{ status: string; storyPoints: number | null }>): {
  completed: number
  total: number
  percentage: number
} {
  const total = tickets.reduce((sum, t) => sum + (t.storyPoints || 0), 0)
  const completed = tickets
    .filter((t) => t.status === 'DONE')
    .reduce((sum, t) => sum + (t.storyPoints || 0), 0)
  const percentage = total > 0 ? Math.round((completed / total) * 100) : 0
  return { completed, total, percentage }
}

export function truncate(str: string, length: number): string {
  if (str.length <= length) return str
  return str.slice(0, length) + '...'
}
