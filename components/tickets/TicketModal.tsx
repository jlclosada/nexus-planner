'use client'

import { useState, useEffect, useRef } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Edit2, MessageSquare, Clock, User, Tag,
  Hash, GitBranch, Plus, Check, Loader2,
  AlertCircle, CheckCircle2, ArrowUpRight,
  Paperclip, Download, Trash2, ImageIcon, FileIcon,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { PriorityBadge, StatusBadge, TypeBadge } from './TicketBadge'
import {
  getInitials, formatDateRelative, getStatusColor,
  getPriorityColor, FIBONACCI_POINTS,
} from '@/lib/utils'
import type {
  TicketWithRelations, TicketStatus, Priority,
  TicketType, SprintWithTickets, EpicWithTickets,
  User as UserType, AttachmentWithUser,
} from '@/types'

const STATUSES: TicketStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']
const PRIORITIES: Priority[] = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const TYPES: TicketType[] = ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK', 'SPIKE']

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

function isImage(mime: string) {
  return mime.startsWith('image/')
}

interface TicketModalProps {
  ticketId: string | null
  projectId: string
  onClose: () => void
}

export function TicketModal({ ticketId, projectId, onClose }: TicketModalProps) {
  const queryClient = useQueryClient()
  const [newComment, setNewComment] = useState('')
  const [editingTitle, setEditingTitle] = useState(false)
  const [titleValue, setTitleValue] = useState('')
  const [uploading, setUploading] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const { data: ticket, isLoading, error: ticketError } = useQuery<TicketWithRelations>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const r = await fetch(`/api/tickets/${ticketId}`)
      if (!r.ok) throw new Error(`HTTP ${r.status}`)
      return r.json()
    },
    enabled: !!ticketId,
    retry: 1,
  })

  const { data: sprints = [] } = useQuery<SprintWithTickets[]>({
    queryKey: ['sprints', projectId],
    queryFn: () =>
      fetch(`/api/projects/${projectId}`)
        .then((r) => r.json())
        .then((p) => (Array.isArray(p.sprints) ? p.sprints : [])),
  })

  const { data: epics = [] } = useQuery<EpicWithTickets[]>({
    queryKey: ['epics', projectId],
    queryFn: () => fetch(`/api/epics?projectId=${projectId}`).then((r) => r.json()),
  })

  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then((r) => r.json()),
  })

  useEffect(() => {
    if (ticket) setTitleValue(ticket.title)
  }, [ticket])

  const updateTicket = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      queryClient.invalidateQueries({ queryKey: ['tickets', projectId] })
    },
    onError: () => toast.error('Failed to update ticket'),
  })

  const addComment = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      setNewComment('')
      toast.success('Comment added')
    },
  })

  const deleteAttachment = useMutation({
    mutationFn: (attachmentId: string) =>
      fetch(`/api/tickets/${ticketId}/attachments/${attachmentId}`, { method: 'DELETE' }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      toast.success('Attachment deleted')
    },
  })

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData()
        fd.append('file', file)
        const res = await fetch(`/api/tickets/${ticketId}/attachments`, { method: 'POST', body: fd })
        if (!res.ok) {
          const err = await res.json()
          toast.error(err.error ?? 'Upload failed')
        }
      }
      queryClient.invalidateQueries({ queryKey: ['ticket', ticketId] })
      toast.success(`${files.length > 1 ? `${files.length} files` : 'File'} uploaded`)
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  if (!ticketId) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-start justify-center pt-10 px-4" onClick={onClose}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/60 backdrop-blur-sm"
        />
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 10, scale: 0.97 }}
          transition={{ type: 'spring', duration: 0.3 }}
          onClick={(e) => e.stopPropagation()}
          className="relative w-full max-w-5xl max-h-[90vh] flex rounded-2xl overflow-hidden"
          style={{ background: '#13131f', border: '1px solid rgba(255,255,255,0.08)' }}
        >
          {isLoading ? (
            <div className="flex items-center justify-center w-full h-64">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          ) : ticket ? (
            <>
              {/* ── LEFT PANEL ─────────────────────────────── */}
              <div className="flex-1 flex flex-col overflow-hidden">
                {/* Header */}
                <div className="p-5 border-b border-white/[0.06]">
                  <div className="flex items-start gap-3">
                    <TypeBadge type={ticket.type} />
                    <div className="flex-1">
                      <span className="text-xs text-slate-500 font-medium">{ticket.code}</span>
                      {editingTitle ? (
                        <div className="flex items-center gap-2 mt-1">
                          <input
                            autoFocus
                            value={titleValue}
                            onChange={(e) => setTitleValue(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') { updateTicket.mutate({ title: titleValue }); setEditingTitle(false) }
                              if (e.key === 'Escape') setEditingTitle(false)
                            }}
                            className="flex-1 bg-white/[0.05] border border-white/10 rounded px-2 py-1 text-slate-200 text-base focus:outline-none focus:border-indigo-500/50"
                          />
                          <button onClick={() => { updateTicket.mutate({ title: titleValue }); setEditingTitle(false) }}
                            className="p-1 hover:bg-white/10 rounded text-emerald-400">
                            <Check className="w-4 h-4" />
                          </button>
                        </div>
                      ) : (
                        <h2
                          className="text-lg font-semibold text-slate-100 mt-0.5 cursor-pointer hover:text-white group flex items-start gap-2"
                          onClick={() => setEditingTitle(true)}
                        >
                          {ticket.title}
                          <Edit2 className="w-3.5 h-3.5 text-slate-600 group-hover:text-slate-400 opacity-0 group-hover:opacity-100 mt-1 flex-shrink-0 transition-all" />
                        </h2>
                      )}
                    </div>
                    <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-slate-500 hover:text-slate-300 transition-colors">
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-6">
                  {/* Description */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">Description</h4>
                    {ticket.description ? (
                      <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap">{ticket.description}</p>
                    ) : (
                      <p className="text-sm text-slate-600 italic">No description</p>
                    )}
                  </div>

                  {/* Subtasks */}
                  {(ticket.subtasks?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-2">
                        Subtasks ({ticket.subtasks?.length})
                      </h4>
                      <div className="space-y-1.5">
                        {ticket.subtasks?.map((sub) => (
                          <div key={sub.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-white/[0.03]">
                            <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(sub.status) }} />
                            <span className="text-xs text-slate-400">{sub.code}</span>
                            <span className="text-sm text-slate-300 flex-1 truncate">{sub.title}</span>
                            {sub.assignee && (
                              <Avatar className="w-4 h-4">
                                <AvatarFallback className="text-[8px] bg-indigo-500/20 text-indigo-400">
                                  {getInitials(sub.assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* ── ATTACHMENTS ─────────────────────── */}
                  <div>
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-2">
                        <Paperclip className="w-3.5 h-3.5" />
                        Attachments ({ticket.attachments?.length ?? 0})
                      </h4>
                      <button
                        onClick={() => fileInputRef.current?.click()}
                        disabled={uploading}
                        className="flex items-center gap-1.5 text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50"
                      >
                        {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                        {uploading ? 'Uploading…' : 'Attach file'}
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.json,.ts,.tsx,.js,.jsx,.md"
                        onChange={handleFileUpload}
                      />
                    </div>

                    {/* Drop zone */}
                    <div
                      className="border-2 border-dashed border-white/[0.08] rounded-lg p-3 mb-3 text-center cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all"
                      onClick={() => fileInputRef.current?.click()}
                      onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
                      onDragLeave={(e) => { e.currentTarget.style.borderColor = '' }}
                      onDrop={async (e) => {
                        e.preventDefault()
                        e.currentTarget.style.borderColor = ''
                        const dt = e.dataTransfer
                        if (!dt.files.length) return
                        const fakeEv = { target: { files: dt.files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
                        await handleFileUpload(fakeEv)
                      }}
                    >
                      <p className="text-xs text-slate-600">
                        Drag & drop files here or <span className="text-indigo-400">browse</span>
                      </p>
                      <p className="text-xs text-slate-700 mt-0.5">Max 20 MB per file</p>
                    </div>

                    {ticket.attachments && ticket.attachments.length > 0 && (
                      <div className="space-y-2">
                        {ticket.attachments.map((att) => (
                          <div
                            key={att.id}
                            className="flex items-center gap-3 p-2.5 rounded-lg group"
                            style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}
                          >
                            {/* Preview or icon */}
                            {isImage(att.mimeType) ? (
                              <div className="w-10 h-10 rounded overflow-hidden flex-shrink-0 bg-black/20">
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                              </div>
                            ) : (
                              <div className="w-10 h-10 rounded flex items-center justify-center flex-shrink-0 bg-indigo-500/10">
                                <FileIcon className="w-5 h-5 text-indigo-400" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <p className="text-sm text-slate-200 truncate">{att.name}</p>
                              <p className="text-xs text-slate-500">
                                {formatBytes(att.size)} · {att.uploadedBy.name} · {formatDateRelative(att.createdAt)}
                              </p>
                            </div>
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                              <a
                                href={att.url}
                                download={att.name}
                                target="_blank"
                                rel="noreferrer"
                                className="p-1.5 hover:bg-white/10 rounded text-slate-500 hover:text-slate-300"
                              >
                                <Download className="w-3.5 h-3.5" />
                              </a>
                              <button
                                onClick={() => deleteAttachment.mutate(att.id)}
                                className="p-1.5 hover:bg-red-500/10 rounded text-slate-500 hover:text-red-400"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* ── COMMENTS ───────────────────────── */}
                  <div>
                    <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                      <MessageSquare className="w-3.5 h-3.5" />
                      Comments ({ticket.comments?.length ?? 0})
                    </h4>
                    <div className="space-y-3 mb-4">
                      {ticket.comments?.map((comment) => (
                        <div key={comment.id} className="flex gap-3">
                          <Avatar className="w-6 h-6 flex-shrink-0">
                            <AvatarImage src={comment.user?.image ?? undefined} />
                            <AvatarFallback className="text-[8px] bg-indigo-500/20 text-indigo-400">
                              {getInitials(comment.user?.name)}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-medium text-slate-300">{comment.user?.name}</span>
                              <span className="text-xs text-slate-600">{formatDateRelative(comment.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-400 leading-relaxed">{comment.content}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="space-y-2">
                      <Textarea
                        value={newComment}
                        onChange={(e) => setNewComment(e.target.value)}
                        placeholder="Add a comment…"
                        rows={3}
                        className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 resize-none text-sm"
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && newComment.trim()) {
                            addComment.mutate(newComment)
                          }
                        }}
                      />
                      <Button
                        size="sm"
                        onClick={() => newComment.trim() && addComment.mutate(newComment)}
                        disabled={!newComment.trim() || addComment.isPending}
                        className="bg-indigo-600 hover:bg-indigo-500 text-white"
                      >
                        {addComment.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Comment'}
                      </Button>
                    </div>
                  </div>

                  {/* Activity */}
                  {(ticket.activities?.length ?? 0) > 0 && (
                    <div>
                      <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Clock className="w-3.5 h-3.5" />
                        Activity
                      </h4>
                      <div className="space-y-2">
                        {ticket.activities?.slice(0, 8).map((activity) => (
                          <div key={activity.id} className="flex gap-2 items-start text-xs text-slate-500">
                            <Avatar className="w-4 h-4 flex-shrink-0 mt-0.5">
                              <AvatarFallback className="text-[6px] bg-indigo-500/20 text-indigo-400">
                                {getInitials(activity.user?.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span>
                              <span className="text-slate-400">{activity.user?.name}</span>{' '}
                              {activity.type === 'STATUS_CHANGED' && <>moved to <span className="text-slate-300">{activity.newValue?.replace(/_/g, ' ')}</span></>}
                              {activity.type === 'ASSIGNED' && <>assigned ticket</>}
                              {activity.type === 'PRIORITY_CHANGED' && <>changed priority to <span className="text-slate-300">{activity.newValue}</span></>}
                              {activity.type === 'COMMENT_ADDED' && <>commented</>}
                              {activity.type === 'CREATED' && <>created this ticket</>}
                              {activity.type === 'STORY_POINTS_CHANGED' && <>set story points to <span className="text-slate-300">{activity.newValue}</span></>}
                              {' '}<span className="text-slate-600">{formatDateRelative(activity.createdAt)}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* ── RIGHT PANEL — PROPERTIES ──────────────── */}
              <div
                className="w-64 flex-shrink-0 border-l border-white/[0.06] p-4 overflow-y-auto"
                style={{ background: 'rgba(10,10,15,0.6)' }}
              >
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">Properties</h4>
                <div className="space-y-4">

                  {/* Status */}
                  <PropertyRow label="Status" icon={CheckCircle2}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full text-left"><StatusBadge status={ticket.status} /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                        {STATUSES.map((s) => (
                          <DropdownMenuItem key={s} onClick={() => updateTicket.mutate({ status: s })} className="text-slate-300 focus:text-white">
                            <StatusBadge status={s} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PropertyRow>

                  {/* Priority */}
                  <PropertyRow label="Priority" icon={AlertCircle}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full text-left"><PriorityBadge priority={ticket.priority} /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                        {PRIORITIES.map((p) => (
                          <DropdownMenuItem key={p} onClick={() => updateTicket.mutate({ priority: p })} className="text-slate-300 focus:text-white">
                            <PriorityBadge priority={p} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PropertyRow>

                  {/* Type */}
                  <PropertyRow label="Type" icon={Tag}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="w-full text-left"><TypeBadge type={ticket.type} /></button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                        {TYPES.map((t) => (
                          <DropdownMenuItem key={t} onClick={() => updateTicket.mutate({ type: t })} className="text-slate-300 focus:text-white">
                            <TypeBadge type={t} />
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PropertyRow>

                  {/* Assignee */}
                  <PropertyRow label="Assignee" icon={User}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-2 text-sm text-slate-300 hover:text-white transition-colors w-full">
                          {ticket.assignee ? (
                            <>
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={ticket.assignee.image ?? undefined} />
                                <AvatarFallback className="text-[8px] bg-indigo-500/20 text-indigo-400">
                                  {getInitials(ticket.assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="text-xs truncate">{ticket.assignee.name}</span>
                            </>
                          ) : (
                            <span className="text-xs text-slate-600">Unassigned</span>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-48">
                        <DropdownMenuItem onClick={() => updateTicket.mutate({ assigneeId: null })} className="text-slate-400">
                          Unassigned
                        </DropdownMenuItem>
                        {users.map((user) => (
                          <DropdownMenuItem
                            key={user.id}
                            onClick={() => updateTicket.mutate({ assigneeId: user.id })}
                            className="flex items-center gap-2 text-slate-300"
                          >
                            <Avatar className="w-5 h-5">
                              <AvatarImage src={user.image ?? undefined} />
                              <AvatarFallback className="text-[8px] bg-indigo-500/20 text-indigo-400">
                                {getInitials(user.name)}
                              </AvatarFallback>
                            </Avatar>
                            <span className="truncate">{user.name}</span>
                            {ticket.assigneeId === user.id && <Check className="w-3 h-3 ml-auto text-indigo-400 flex-shrink-0" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PropertyRow>

                  {/* Story Points */}
                  <PropertyRow label="Story Points" icon={Hash}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="flex items-center gap-1 text-sm text-slate-300 hover:text-white">
                          {ticket.storyPoints != null ? (
                            <span className="bg-indigo-500/15 text-indigo-400 px-2 py-0.5 rounded text-xs font-medium">
                              {ticket.storyPoints} pts
                            </span>
                          ) : (
                            <span className="text-xs text-slate-600">No estimate</span>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                        <DropdownMenuItem onClick={() => updateTicket.mutate({ storyPoints: null })} className="text-slate-400">No estimate</DropdownMenuItem>
                        {FIBONACCI_POINTS.map((pts) => (
                          <DropdownMenuItem key={pts} onClick={() => updateTicket.mutate({ storyPoints: pts })} className="text-slate-300">
                            {pts} points
                            {ticket.storyPoints === pts && <Check className="w-3 h-3 ml-auto text-indigo-400" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PropertyRow>

                  {/* Sprint */}
                  <PropertyRow label="Sprint" icon={ArrowUpRight}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-xs text-slate-300 hover:text-white truncate max-w-full">
                          {ticket.sprint ? <span>{ticket.sprint.name}</span> : <span className="text-slate-600">No sprint</span>}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-48">
                        <DropdownMenuItem onClick={() => updateTicket.mutate({ sprintId: null })} className="text-slate-400">No sprint (Backlog)</DropdownMenuItem>
                        {sprints.map((sprint) => (
                          <DropdownMenuItem key={sprint.id} onClick={() => updateTicket.mutate({ sprintId: sprint.id })} className="text-slate-300">
                            {sprint.name}
                            {sprint.status === 'ACTIVE' && <span className="ml-2 text-xs text-indigo-400">Active</span>}
                            {ticket.sprintId === sprint.id && <Check className="w-3 h-3 ml-auto text-indigo-400" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PropertyRow>

                  {/* Epic */}
                  <PropertyRow label="Epic" icon={GitBranch}>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <button className="text-xs text-slate-300 hover:text-white">
                          {ticket.epic ? (
                            <span className="px-1.5 py-0.5 rounded" style={{ color: ticket.epic.color, background: `${ticket.epic.color}15` }}>
                              {ticket.epic.title}
                            </span>
                          ) : (
                            <span className="text-slate-600">No epic</span>
                          )}
                        </button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-48">
                        <DropdownMenuItem onClick={() => updateTicket.mutate({ epicId: null })} className="text-slate-400">No epic</DropdownMenuItem>
                        {epics.map((epic) => (
                          <DropdownMenuItem key={epic.id} onClick={() => updateTicket.mutate({ epicId: epic.id })} className="text-slate-300">
                            <div className="w-2 h-2 rounded-full mr-2 flex-shrink-0" style={{ backgroundColor: epic.color }} />
                            <span className="truncate">{epic.title}</span>
                            {ticket.epicId === epic.id && <Check className="w-3 h-3 ml-auto text-indigo-400" />}
                          </DropdownMenuItem>
                        ))}
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </PropertyRow>

                  {/* Attachments count shortcut */}
                  <PropertyRow label="Files" icon={Paperclip}>
                    <button
                      className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200"
                      onClick={() => fileInputRef.current?.click()}
                    >
                      <span>{ticket.attachments?.length ?? 0} attached</span>
                      <Plus className="w-3 h-3" />
                    </button>
                  </PropertyRow>

                  {/* Dates */}
                  <div className="pt-2 border-t border-white/[0.06] space-y-2">
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Created</span>
                      <span className="text-slate-400">{ticket.createdAt ? formatDateRelative(ticket.createdAt) : '—'}</span>
                    </div>
                    <div className="flex items-center justify-between text-xs">
                      <span className="text-slate-600">Updated</span>
                      <span className="text-slate-400">{ticket.updatedAt ? formatDateRelative(ticket.updatedAt) : '—'}</span>
                    </div>
                    {ticket.completedAt && (
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-slate-600">Completed</span>
                        <span className="text-emerald-400">{formatDateRelative(ticket.completedAt)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex items-center justify-center w-full h-32 text-slate-500">Ticket not found</div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

function PropertyRow({ label, icon: Icon, children }: { label: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs text-slate-600 mb-1.5 flex items-center gap-1">
        <Icon className="w-3 h-3" />
        {label}
      </p>
      {children}
    </div>
  )
}
