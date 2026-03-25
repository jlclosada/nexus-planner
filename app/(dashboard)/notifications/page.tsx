'use client'

import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Bell, CheckCheck, Ticket, MessageSquare, GitBranch,
  Zap, UserPlus, AtSign, BellOff, ArrowRight,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { formatDateRelative } from '@/lib/utils'
import { cn } from '@/lib/utils'

type NotificationType =
  | 'TICKET_ASSIGNED'
  | 'TICKET_COMMENTED'
  | 'TICKET_STATUS_CHANGED'
  | 'SPRINT_STARTED'
  | 'SPRINT_COMPLETED'
  | 'MENTION'
  | 'PROJECT_INVITED'

interface Notification {
  id: string
  type: NotificationType
  title: string
  body: string | null
  read: boolean
  link: string | null
  createdAt: string
}

const typeConfig: Record<NotificationType, { icon: React.ElementType; color: string; bg: string }> = {
  TICKET_ASSIGNED:      { icon: Ticket,       color: '#6366f1', bg: 'rgba(99,102,241,0.12)' },
  TICKET_COMMENTED:     { icon: MessageSquare, color: '#8b5cf6', bg: 'rgba(139,92,246,0.12)' },
  TICKET_STATUS_CHANGED:{ icon: GitBranch,    color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  SPRINT_STARTED:       { icon: Zap,          color: '#f59e0b', bg: 'rgba(245,158,11,0.12)' },
  SPRINT_COMPLETED:     { icon: CheckCheck,   color: '#10b981', bg: 'rgba(16,185,129,0.12)' },
  MENTION:              { icon: AtSign,       color: '#ec4899', bg: 'rgba(236,72,153,0.12)' },
  PROJECT_INVITED:      { icon: UserPlus,     color: '#06b6d4', bg: 'rgba(6,182,212,0.12)' },
}

function groupByDate(notifications: Notification[]) {
  const now   = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const yesterday = new Date(today.getTime() - 86400000)
  const thisWeek  = new Date(today.getTime() - 6 * 86400000)

  const groups: Record<string, Notification[]> = {
    Today: [],
    Yesterday: [],
    'This Week': [],
    Older: [],
  }

  for (const n of notifications) {
    const d = new Date(n.createdAt)
    if (d >= today)                    groups['Today'].push(n)
    else if (d >= yesterday)           groups['Yesterday'].push(n)
    else if (d >= thisWeek)            groups['This Week'].push(n)
    else                               groups['Older'].push(n)
  }

  return groups
}

export default function NotificationsPage() {
  const queryClient = useQueryClient()
  const [filter, setFilter] = useState<'all' | 'unread'>('all')

  const { data: notifications = [], isLoading } = useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => fetch('/api/notifications').then((r) => r.json()),
    refetchInterval: 30_000,
  })

  const markOne = useMutation({
    mutationFn: (id: string) =>
      fetch(`/api/notifications/${id}`, { method: 'PATCH' }),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['notifications'] }),
  })

  const markAll = useMutation({
    mutationFn: () => fetch('/api/notifications/read-all', { method: 'POST' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] })
      toast.success('All notifications marked as read')
    },
  })

  const visible = filter === 'unread'
    ? notifications.filter((n) => !n.read)
    : notifications

  const unreadCount = notifications.filter((n) => !n.read).length
  const groups = groupByDate(visible)

  return (
    <div className="flex-1 overflow-auto">
      <div className="max-w-2xl mx-auto px-6 py-8">

        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-2xl font-bold text-slate-100 flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/15 flex items-center justify-center">
                <Bell className="w-5 h-5 text-indigo-400" />
              </div>
              Notifications
              {unreadCount > 0 && (
                <span className="text-sm bg-indigo-500 text-white px-2.5 py-0.5 rounded-full font-medium">
                  {unreadCount}
                </span>
              )}
            </h1>
            <p className="text-slate-500 text-sm mt-1 ml-13">Stay up to date with your team activity</p>
          </div>
          {unreadCount > 0 && (
            <Button
              size="sm"
              variant="outline"
              onClick={() => markAll.mutate()}
              disabled={markAll.isPending}
              className="border-white/10 text-slate-400 hover:text-slate-200 hover:border-white/20 gap-2"
            >
              <CheckCheck className="w-3.5 h-3.5" />
              Mark all read
            </Button>
          )}
        </div>

        {/* Filter tabs */}
        <div className="flex items-center gap-1 mb-6 p-1 rounded-xl w-fit"
          style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
          {(['all', 'unread'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilter(tab)}
              className={cn(
                'px-4 py-1.5 rounded-lg text-sm font-medium transition-all duration-150 capitalize',
                filter === tab
                  ? 'bg-indigo-500/20 text-indigo-400'
                  : 'text-slate-500 hover:text-slate-300'
              )}
            >
              {tab}
              {tab === 'unread' && unreadCount > 0 && (
                <span className="ml-1.5 text-xs bg-indigo-500/30 text-indigo-400 px-1.5 py-0.5 rounded-full">
                  {unreadCount}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Content */}
        {isLoading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="h-20 rounded-xl shimmer"
                style={{ background: 'rgba(19,19,31,0.8)' }} />
            ))}
          </div>
        ) : visible.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center py-24"
          >
            <div className="w-20 h-20 rounded-2xl mx-auto mb-4 flex items-center justify-center"
              style={{ background: 'rgba(99,102,241,0.08)', border: '1px solid rgba(99,102,241,0.15)' }}>
              <BellOff className="w-9 h-9 text-slate-600" />
            </div>
            <p className="text-slate-400 font-medium">
              {filter === 'unread' ? 'All caught up!' : 'No notifications yet'}
            </p>
            <p className="text-slate-600 text-sm mt-1">
              {filter === 'unread'
                ? 'You have no unread notifications.'
                : 'Notifications will appear here when there is team activity.'}
            </p>
          </motion.div>
        ) : (
          <div className="space-y-6">
            <AnimatePresence>
              {Object.entries(groups).map(([group, items]) => {
                if (!items.length) return null
                return (
                  <motion.div
                    key={group}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                  >
                    <p className="text-xs font-semibold text-slate-600 uppercase tracking-wider mb-3 px-1">
                      {group}
                    </p>
                    <div className="space-y-1.5">
                      {items.map((n) => (
                        <NotificationItem
                          key={n.id}
                          notification={n}
                          onRead={() => !n.read && markOne.mutate(n.id)}
                        />
                      ))}
                    </div>
                  </motion.div>
                )
              })}
            </AnimatePresence>
          </div>
        )}
      </div>
    </div>
  )
}

function NotificationItem({
  notification: n,
  onRead,
}: {
  notification: Notification
  onRead: () => void
}) {
  const cfg = typeConfig[n.type] ?? typeConfig.TICKET_ASSIGNED
  const Icon = cfg.icon

  const inner = (
    <motion.div
      layout
      initial={{ opacity: 0, x: -8 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 8 }}
      onClick={onRead}
      className={cn(
        'group flex items-start gap-4 px-4 py-3.5 rounded-xl cursor-pointer transition-all duration-150',
        n.read
          ? 'hover:bg-white/[0.03]'
          : 'hover:bg-white/[0.05]'
      )}
      style={{
        background: n.read ? 'rgba(19,19,31,0.5)' : 'rgba(19,19,31,0.85)',
        border: n.read
          ? '1px solid rgba(255,255,255,0.04)'
          : '1px solid rgba(99,102,241,0.18)',
      }}
    >
      {/* Icon */}
      <div
        className="w-9 h-9 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5"
        style={{ background: cfg.bg }}
      >
        <Icon className="w-4 h-4" style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-3">
          <p className={cn(
            'text-sm leading-snug',
            n.read ? 'text-slate-400' : 'text-slate-200 font-medium'
          )}>
            {n.title}
          </p>
          <div className="flex items-center gap-2 flex-shrink-0">
            <span className="text-xs text-slate-600 whitespace-nowrap">
              {formatDateRelative(n.createdAt)}
            </span>
            {!n.read && (
              <div className="w-2 h-2 rounded-full bg-indigo-400 flex-shrink-0" />
            )}
          </div>
        </div>
        {n.body && (
          <p className="text-xs text-slate-500 mt-0.5 truncate">{n.body}</p>
        )}
      </div>

      {/* Arrow on hover */}
      {n.link && (
        <ArrowRight className="w-4 h-4 text-slate-600 flex-shrink-0 mt-1 opacity-0 group-hover:opacity-100 transition-opacity -translate-x-1 group-hover:translate-x-0 duration-150" />
      )}
    </motion.div>
  )

  if (n.link) {
    return <Link href={n.link}>{inner}</Link>
  }
  return inner
}
