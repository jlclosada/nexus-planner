'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X, Edit3, MessageSquare, Clock, User, Tag, Hash, GitBranch,
  Plus, Check, Loader2, AlertCircle, CheckCircle2, ArrowUpRight,
  Paperclip, Download, Trash2, FileIcon, Copy, CalendarDays,
  ChevronRight, Zap, Send, Flag, BarChart2, ExternalLink,
  Circle, CheckSquare,
} from 'lucide-react'
import { toast } from 'sonner'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu'
import { PriorityBadge, StatusBadge, TypeBadge } from './TicketBadge'
import {
  getInitials, formatDateRelative, formatDate,
  getStatusColor, getPriorityColor, FIBONACCI_POINTS,
} from '@/lib/utils'
import { cn } from '@/lib/utils'
import type {
  TicketWithRelations, TicketStatus, Priority,
  TicketType, SprintWithTickets, EpicWithTickets,
  User as UserType,
} from '@/types'

/* ── constants ───────────────────────────────────────────────── */
const STATUSES: TicketStatus[] = ['BACKLOG', 'TODO', 'IN_PROGRESS', 'IN_REVIEW', 'BLOCKED', 'DONE']
const PRIORITIES: Priority[]   = ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']
const TYPES: TicketType[]      = ['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK', 'SPIKE']

const STATUS_LABELS: Record<TicketStatus, string> = {
  BACKLOG: 'Backlog', TODO: 'Todo', IN_PROGRESS: 'In Progress',
  IN_REVIEW: 'In Review', BLOCKED: 'Blocked', DONE: 'Done',
}

const PRIORITY_ICONS: Record<Priority, React.ElementType> = {
  CRITICAL: AlertCircle, HIGH: Flag, MEDIUM: BarChart2, LOW: ArrowUpRight,
}

/* ── helpers ─────────────────────────────────────────────────── */
function formatBytes(b: number) {
  if (b < 1024)        return `${b} B`
  if (b < 1048576)     return `${(b / 1024).toFixed(1)} KB`
  return `${(b / 1048576).toFixed(1)} MB`
}
function isImg(mime: string) { return mime.startsWith('image/') }

function isOverdue(d?: string | Date | null) {
  if (!d) return false
  return new Date(d) < new Date()
}

/* ── props ───────────────────────────────────────────────────── */
interface Props { ticketId: string | null; projectId: string; onClose: () => void }

/* ═══════════════════════════════════════════════════════════════
   MAIN COMPONENT
═══════════════════════════════════════════════════════════════ */
export function TicketModal({ ticketId, projectId, onClose }: Props) {
  const qc = useQueryClient()

  /* local state */
  const [editingTitle, setEditingTitle]         = useState(false)
  const [titleDraft, setTitleDraft]             = useState('')
  const [editingDesc, setEditingDesc]           = useState(false)
  const [descDraft, setDescDraft]               = useState('')
  const [comment, setComment]                   = useState('')
  const [addingSubtask, setAddingSubtask]       = useState(false)
  const [subtaskTitle, setSubtaskTitle]         = useState('')
  const [codeCopied, setCodeCopied]             = useState(false)
  const [confirmDelete, setConfirmDelete]       = useState(false)
  const [uploading, setUploading]               = useState(false)
  const [activeTab, setActiveTab]               = useState<'comments' | 'activity'>('comments')

  const fileRef     = useRef<HTMLInputElement>(null)
  const titleRef    = useRef<HTMLInputElement>(null)
  const subtaskRef  = useRef<HTMLInputElement>(null)

  /* queries */
  const { data: ticket, isLoading, error: ticketError } = useQuery<TicketWithRelations>({
    queryKey: ['ticket', ticketId],
    queryFn: async () => {
      const r = await fetch(`/api/tickets/${ticketId}`)
      if (!r.ok) { const b = await r.json().catch(() => ({})); throw new Error(b.error ?? `HTTP ${r.status}`) }
      return r.json()
    },
    enabled: !!ticketId,
    retry: false,
  })

  const { data: sprints = [] } = useQuery<SprintWithTickets[]>({
    queryKey: ['sprints', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then(r => r.json()).then(p => Array.isArray(p.sprints) ? p.sprints : []),
  })
  const { data: epics = [] } = useQuery<EpicWithTickets[]>({
    queryKey: ['epics', projectId],
    queryFn: () => fetch(`/api/epics?projectId=${projectId}`).then(r => r.json()),
  })
  const { data: users = [] } = useQuery<UserType[]>({
    queryKey: ['users'],
    queryFn: () => fetch('/api/users').then(r => r.json()),
  })

  useEffect(() => {
    if (ticket) { setTitleDraft(ticket.title); setDescDraft(ticket.description ?? '') }
  }, [ticket])

  useEffect(() => {
    if (editingTitle && titleRef.current) titleRef.current.focus()
  }, [editingTitle])

  useEffect(() => {
    if (addingSubtask && subtaskRef.current) subtaskRef.current.focus()
  }, [addingSubtask])

  /* Esc to close */
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape' && !editingTitle && !editingDesc) onClose() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose, editingTitle, editingDesc])

  /* mutations */
  const update = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`/api/tickets/${ticketId}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(data),
      }).then(r => r.json()),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] })
      qc.invalidateQueries({ queryKey: ['tickets', projectId] })
    },
    onError: () => toast.error('Failed to update'),
  })

  const addComment = useMutation({
    mutationFn: (content: string) =>
      fetch(`/api/tickets/${ticketId}/comments`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ content }),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', ticketId] }); setComment('') },
  })

  const deleteTicket = useMutation({
    mutationFn: () => fetch(`/api/tickets/${ticketId}`, { method: 'DELETE' }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['tickets', projectId] })
      toast.success('Ticket deleted')
      onClose()
    },
  })

  const deleteAttachment = useMutation({
    mutationFn: (id: string) => fetch(`/api/tickets/${ticketId}/attachments/${id}`, { method: 'DELETE' }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['ticket', ticketId] }),
  })

  const createSubtask = useMutation({
    mutationFn: (title: string) =>
      fetch('/api/tickets', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, type: 'SUBTASK', status: 'TODO', priority: 'MEDIUM', projectId, parentId: ticketId }),
      }).then(r => r.json()),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['ticket', ticketId] }); setSubtaskTitle(''); setAddingSubtask(false) },
  })

  /* helpers */
  const saveTitle = useCallback(() => {
    if (titleDraft.trim() && titleDraft !== ticket?.title) update.mutate({ title: titleDraft.trim() })
    setEditingTitle(false)
  }, [titleDraft, ticket?.title, update])

  const saveDesc = useCallback(() => {
    if (descDraft !== (ticket?.description ?? '')) update.mutate({ description: descDraft })
    setEditingDesc(false)
  }, [descDraft, ticket?.description, update])

  const copyCode = () => {
    if (!ticket?.code) return
    navigator.clipboard.writeText(ticket.code)
    setCodeCopied(true)
    setTimeout(() => setCodeCopied(false), 1500)
  }

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? [])
    if (!files.length) return
    setUploading(true)
    try {
      for (const file of files) {
        const fd = new FormData(); fd.append('file', file)
        const res = await fetch(`/api/tickets/${ticketId}/attachments`, { method: 'POST', body: fd })
        if (!res.ok) { const e2 = await res.json(); toast.error(e2.error ?? 'Upload failed') }
      }
      qc.invalidateQueries({ queryKey: ['ticket', ticketId] })
      toast.success(`${files.length} file${files.length > 1 ? 's' : ''} uploaded`)
    } finally { setUploading(false); if (fileRef.current) fileRef.current.value = '' }
  }

  if (!ticketId) return null

  /* subtask progress */
  const subtasks = ticket?.subtasks ?? []
  const doneSubtasks = subtasks.filter(s => s.status === 'DONE').length
  const subtaskPct = subtasks.length ? Math.round((doneSubtasks / subtasks.length) * 100) : 0

  const overdue = ticket ? isOverdue(ticket.dueDate) && ticket.status !== 'DONE' : false

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
        {/* backdrop */}
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="absolute inset-0 bg-black/70 backdrop-blur-md"
        />
        {/* modal */}
        <motion.div
          initial={{ opacity: 0, y: 24, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 12, scale: 0.97 }}
          transition={{ type: 'spring', duration: 0.3, bounce: 0.1 }}
          onClick={e => e.stopPropagation()}
          className="relative w-full max-w-6xl max-h-[92vh] flex flex-col rounded-2xl overflow-hidden"
          style={{ background: '#0f0f1c', border: '1px solid rgba(255,255,255,0.09)' }}
        >
          {/* ── LOADING ── */}
          {isLoading && (
            <div className="flex items-center justify-center h-64">
              <Loader2 className="w-6 h-6 animate-spin text-slate-500" />
            </div>
          )}

          {/* ── ERROR ── */}
          {!isLoading && !ticket && (
            <div className="flex flex-col items-center justify-center h-40 gap-2">
              <p className="text-slate-400 text-sm">Could not load ticket</p>
              {ticketError && <p className="text-red-400/60 text-xs font-mono">{(ticketError as Error).message}</p>}
            </div>
          )}

          {/* ── CONTENT ── */}
          {ticket && (
            <div className="flex flex-col h-full overflow-hidden">

              {/* ══ TOP BAR ══════════════════════════════════════════ */}
              <div className="flex items-center gap-3 px-5 py-3.5 border-b border-white/[0.06] flex-shrink-0"
                style={{ background: 'rgba(10,10,20,0.6)' }}>
                {/* breadcrumb */}
                <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-1 min-w-0">
                  <TypeBadge type={ticket.type} />
                  <ChevronRight className="w-3 h-3" />
                  <button
                    onClick={copyCode}
                    className="flex items-center gap-1 text-slate-500 hover:text-indigo-400 transition-colors font-mono font-medium"
                    title="Copy code"
                  >
                    {ticket.code}
                    {codeCopied
                      ? <Check className="w-3 h-3 text-emerald-400" />
                      : <Copy className="w-3 h-3 opacity-0 hover:opacity-100" />}
                  </button>
                  {ticket.sprint && (
                    <>
                      <ChevronRight className="w-3 h-3" />
                      <span className="text-slate-600 truncate">{ticket.sprint.name}</span>
                    </>
                  )}
                </div>

                {/* quick status pills */}
                <div className="hidden md:flex items-center gap-1">
                  {STATUSES.map(s => (
                    <button
                      key={s}
                      onClick={() => update.mutate({ status: s })}
                      className={cn(
                        'px-2.5 py-1 rounded-lg text-xs font-medium transition-all duration-150',
                        ticket.status === s
                          ? 'text-white'
                          : 'text-slate-600 hover:text-slate-300'
                      )}
                      style={ticket.status === s
                        ? { background: `${getStatusColor(s)}25`, color: getStatusColor(s), border: `1px solid ${getStatusColor(s)}40` }
                        : { background: 'transparent', border: '1px solid transparent' }}
                    >
                      {STATUS_LABELS[s]}
                    </button>
                  ))}
                </div>

                {/* actions */}
                <div className="flex items-center gap-1 flex-shrink-0">
                  {confirmDelete ? (
                    <>
                      <span className="text-xs text-red-400 mr-1">Delete ticket?</span>
                      <Button size="sm" variant="ghost" onClick={() => setConfirmDelete(false)}
                        className="h-7 px-2 text-slate-400 text-xs">Cancel</Button>
                      <Button size="sm" onClick={() => deleteTicket.mutate()}
                        disabled={deleteTicket.isPending}
                        className="h-7 px-2 bg-red-500/20 hover:bg-red-500/30 text-red-400 text-xs border border-red-500/30">
                        {deleteTicket.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Confirm'}
                      </Button>
                    </>
                  ) : (
                    <button onClick={() => setConfirmDelete(true)}
                      className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-600 hover:text-red-400 transition-all">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button onClick={onClose}
                    className="p-1.5 hover:bg-white/[0.06] rounded-lg text-slate-500 hover:text-slate-200 transition-all">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* ══ BODY (scroll) ════════════════════════════════════ */}
              <div className="flex flex-1 overflow-hidden">

                {/* ── LEFT: main content ─────────────────────────── */}
                <div className="flex-1 overflow-y-auto">
                  <div className="p-6 space-y-6">

                    {/* overdue banner */}
                    {overdue && (
                      <div className="flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-red-400"
                        style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)' }}>
                        <CalendarDays className="w-4 h-4 flex-shrink-0" />
                        Overdue · due {formatDate(ticket.dueDate)}
                      </div>
                    )}

                    {/* ── TITLE ────────────────────── */}
                    {editingTitle ? (
                      <div className="flex items-start gap-2">
                        <input
                          ref={titleRef}
                          value={titleDraft}
                          onChange={e => setTitleDraft(e.target.value)}
                          onKeyDown={e => { if (e.key === 'Enter') saveTitle(); if (e.key === 'Escape') setEditingTitle(false) }}
                          className="flex-1 bg-white/[0.05] border border-indigo-500/40 rounded-xl px-4 py-2.5 text-xl font-bold text-slate-100 focus:outline-none focus:border-indigo-500/70 resize-none"
                        />
                        <button onClick={saveTitle} className="mt-1 p-2 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-indigo-400 transition-all">
                          <Check className="w-4 h-4" />
                        </button>
                        <button onClick={() => setEditingTitle(false)} className="mt-1 p-2 hover:bg-white/[0.06] rounded-lg text-slate-500 transition-all">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                    ) : (
                      <button
                        onClick={() => setEditingTitle(true)}
                        className="group w-full text-left"
                      >
                        <h2 className="text-xl font-bold text-slate-100 leading-snug group-hover:text-white transition-colors flex items-start gap-2">
                          <span className="flex-1">{ticket.title}</span>
                          <Edit3 className="w-4 h-4 text-slate-700 group-hover:text-slate-400 mt-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all" />
                        </h2>
                      </button>
                    )}

                    {/* ── LABELS ─────────────────────────────── */}
                    {(ticket.labels ?? []).length > 0 && (
                      <div className="flex flex-wrap gap-1.5">
                        {ticket.labels!.map(({ label }) => (
                          <span key={label.id}
                            className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium"
                            style={{ background: `${label.color}20`, color: label.color, border: `1px solid ${label.color}35` }}>
                            {label.name}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* ── DESCRIPTION ────────────────────────── */}
                    <Section icon={Edit3} title="Description">
                      {editingDesc ? (
                        <div className="space-y-2">
                          <Textarea
                            value={descDraft}
                            onChange={e => setDescDraft(e.target.value)}
                            autoFocus
                            rows={6}
                            placeholder="Add a detailed description…"
                            className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 resize-none text-sm focus:border-indigo-500/40"
                          />
                          <div className="flex gap-2">
                            <Button size="sm" onClick={saveDesc}
                              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs">
                              <Check className="w-3 h-3" /> Save
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => { setEditingDesc(false); setDescDraft(ticket.description ?? '') }}
                              className="text-slate-400 text-xs">
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setEditingDesc(true)}
                          className="group w-full text-left"
                        >
                          {ticket.description ? (
                            <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-wrap group-hover:text-slate-200 transition-colors">
                              {ticket.description}
                            </p>
                          ) : (
                            <p className="text-sm text-slate-600 italic group-hover:text-slate-500 transition-colors">
                              Click to add a description…
                            </p>
                          )}
                        </button>
                      )}
                    </Section>

                    {/* ── SUBTASKS ───────────────────────────── */}
                    <Section
                      icon={CheckSquare}
                      title={`Subtasks${subtasks.length ? ` (${doneSubtasks}/${subtasks.length})` : ''}`}
                      action={
                        <button onClick={() => setAddingSubtask(v => !v)}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors">
                          <Plus className="w-3 h-3" /> Add
                        </button>
                      }
                    >
                      {/* progress bar */}
                      {subtasks.length > 0 && (
                        <div className="mb-3">
                          <div className="flex items-center justify-between text-xs text-slate-500 mb-1.5">
                            <span>{subtaskPct}% complete</span>
                            <span>{doneSubtasks}/{subtasks.length} done</span>
                          </div>
                          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,0.06)' }}>
                            <motion.div
                              className="h-full rounded-full"
                              style={{ background: 'linear-gradient(90deg, #6366f1, #8b5cf6)' }}
                              initial={{ width: 0 }}
                              animate={{ width: `${subtaskPct}%` }}
                              transition={{ duration: 0.4, ease: 'easeOut' }}
                            />
                          </div>
                        </div>
                      )}

                      {/* subtask list */}
                      <div className="space-y-1">
                        {subtasks.map(sub => (
                          <div key={sub.id}
                            className="flex items-center gap-2.5 p-2 rounded-lg hover:bg-white/[0.03] transition-colors group">
                            <button
                              onClick={() => update.mutate({ /* handled at subtask level — placeholder */ })}
                              className="flex-shrink-0"
                            >
                              {sub.status === 'DONE'
                                ? <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                                : <Circle className="w-4 h-4 text-slate-600 group-hover:text-slate-400 transition-colors" />}
                            </button>
                            <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(sub.status) }} />
                            <span className="text-xs text-slate-500 font-mono flex-shrink-0">{sub.code}</span>
                            <span className={cn('text-sm flex-1 truncate', sub.status === 'DONE' ? 'text-slate-600 line-through' : 'text-slate-300')}>
                              {sub.title}
                            </span>
                            {sub.assignee && (
                              <Avatar className="w-5 h-5 flex-shrink-0">
                                <AvatarFallback className="text-[7px] bg-indigo-500/20 text-indigo-400">
                                  {getInitials(sub.assignee.name)}
                                </AvatarFallback>
                              </Avatar>
                            )}
                          </div>
                        ))}
                      </div>

                      {/* inline add */}
                      <AnimatePresence>
                        {addingSubtask && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-2"
                          >
                            <div className="flex items-center gap-2">
                              <Circle className="w-4 h-4 text-slate-600 flex-shrink-0" />
                              <input
                                ref={subtaskRef}
                                value={subtaskTitle}
                                onChange={e => setSubtaskTitle(e.target.value)}
                                placeholder="New subtask title…"
                                className="flex-1 bg-white/[0.04] border border-white/10 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder:text-slate-600 focus:outline-none focus:border-indigo-500/40"
                                onKeyDown={e => {
                                  if (e.key === 'Enter' && subtaskTitle.trim()) createSubtask.mutate(subtaskTitle.trim())
                                  if (e.key === 'Escape') { setAddingSubtask(false); setSubtaskTitle('') }
                                }}
                              />
                              <button
                                onClick={() => subtaskTitle.trim() && createSubtask.mutate(subtaskTitle.trim())}
                                disabled={!subtaskTitle.trim() || createSubtask.isPending}
                                className="p-1.5 bg-indigo-500/20 hover:bg-indigo-500/30 rounded-lg text-indigo-400 transition-all disabled:opacity-40"
                              >
                                {createSubtask.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                              </button>
                              <button onClick={() => { setAddingSubtask(false); setSubtaskTitle('') }}
                                className="p-1.5 hover:bg-white/[0.06] rounded-lg text-slate-500 transition-all">
                                <X className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </Section>

                    {/* ── ATTACHMENTS ────────────────────────── */}
                    <Section
                      icon={Paperclip}
                      title={`Attachments${(ticket.attachments?.length ?? 0) > 0 ? ` (${ticket.attachments!.length})` : ''}`}
                      action={
                        <button onClick={() => fileRef.current?.click()} disabled={uploading}
                          className="flex items-center gap-1 text-xs text-indigo-400 hover:text-indigo-300 transition-colors disabled:opacity-50">
                          {uploading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                          {uploading ? 'Uploading…' : 'Attach'}
                        </button>
                      }
                    >
                      <input ref={fileRef} type="file" multiple className="hidden"
                        accept="image/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip,.json,.ts,.tsx,.js,.md"
                        onChange={handleUpload}
                      />
                      {/* drop zone */}
                      <div
                        className="border border-dashed border-white/[0.08] rounded-xl p-4 text-center cursor-pointer hover:border-indigo-500/30 hover:bg-indigo-500/[0.03] transition-all mb-3"
                        onClick={() => fileRef.current?.click()}
                        onDragOver={e => { e.preventDefault(); e.currentTarget.style.borderColor = 'rgba(99,102,241,0.5)' }}
                        onDragLeave={e => { e.currentTarget.style.borderColor = '' }}
                        onDrop={async e => {
                          e.preventDefault(); e.currentTarget.style.borderColor = ''
                          const fake = { target: { files: e.dataTransfer.files, value: '' } } as unknown as React.ChangeEvent<HTMLInputElement>
                          await handleUpload(fake)
                        }}
                      >
                        <p className="text-xs text-slate-600">Drag & drop or <span className="text-indigo-400">browse</span> · max 20 MB</p>
                      </div>

                      {(ticket.attachments?.length ?? 0) > 0 && (
                        <div className="grid grid-cols-1 gap-2">
                          {ticket.attachments!.map(att => (
                            <div key={att.id}
                              className="flex items-center gap-3 p-2.5 rounded-xl group transition-all"
                              style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                              {isImg(att.mimeType) ? (
                                <div className="w-10 h-10 rounded-lg overflow-hidden flex-shrink-0 bg-black/20">
                                  {/* eslint-disable-next-line @next/next/no-img-element */}
                                  <img src={att.url} alt={att.name} className="w-full h-full object-cover" />
                                </div>
                              ) : (
                                <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0"
                                  style={{ background: 'rgba(99,102,241,0.1)' }}>
                                  <FileIcon className="w-5 h-5 text-indigo-400" />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="text-sm text-slate-200 truncate">{att.name}</p>
                                <p className="text-xs text-slate-500">{formatBytes(att.size)} · {att.uploadedBy.name} · {formatDateRelative(att.createdAt)}</p>
                              </div>
                              <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <a href={att.url} download={att.name} target="_blank" rel="noreferrer"
                                  className="p-1.5 hover:bg-white/10 rounded-lg text-slate-500 hover:text-slate-300 transition-all">
                                  <Download className="w-3.5 h-3.5" />
                                </a>
                                <button onClick={() => deleteAttachment.mutate(att.id)}
                                  className="p-1.5 hover:bg-red-500/10 rounded-lg text-slate-500 hover:text-red-400 transition-all">
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>

                    {/* ── ACTIVITY + COMMENTS ────────────────── */}
                    <Section icon={MessageSquare} title="">
                      {/* tab switcher */}
                      <div className="flex items-center gap-1 mb-4 p-1 rounded-xl w-fit"
                        style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}>
                        {(['comments', 'activity'] as const).map(tab => (
                          <button key={tab} onClick={() => setActiveTab(tab)}
                            className={cn(
                              'px-3 py-1 rounded-lg text-xs font-medium transition-all capitalize',
                              activeTab === tab ? 'bg-indigo-500/20 text-indigo-400' : 'text-slate-500 hover:text-slate-300'
                            )}>
                            {tab === 'comments' ? `Comments (${ticket.comments?.length ?? 0})` : 'Activity'}
                          </button>
                        ))}
                      </div>

                      {activeTab === 'comments' && (
                        <div className="space-y-4">
                          {(ticket.comments ?? []).length === 0 && (
                            <p className="text-sm text-slate-600 italic text-center py-4">No comments yet. Be the first!</p>
                          )}
                          {ticket.comments?.map(c => (
                            <div key={c.id} className="flex gap-3">
                              <Avatar className="w-7 h-7 flex-shrink-0 mt-0.5">
                                <AvatarImage src={c.user?.image ?? undefined} />
                                <AvatarFallback className="text-[9px] bg-indigo-500/20 text-indigo-400">
                                  {getInitials(c.user?.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 rounded-xl p-3" style={{ background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)' }}>
                                <div className="flex items-center gap-2 mb-1.5">
                                  <span className="text-xs font-semibold text-slate-300">{c.user?.name}</span>
                                  <span className="text-xs text-slate-600">{formatDateRelative(c.createdAt)}</span>
                                </div>
                                <p className="text-sm text-slate-400 leading-relaxed">{c.content}</p>
                              </div>
                            </div>
                          ))}

                          {/* add comment */}
                          <div className="flex gap-3 pt-1">
                            <div className="w-7 h-7 rounded-full bg-indigo-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                              <User className="w-3.5 h-3.5 text-indigo-400" />
                            </div>
                            <div className="flex-1 space-y-2">
                              <Textarea
                                value={comment}
                                onChange={e => setComment(e.target.value)}
                                placeholder="Leave a comment… (Ctrl+Enter to send)"
                                rows={3}
                                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 resize-none text-sm focus:border-indigo-500/40"
                                onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey) && comment.trim()) addComment.mutate(comment) }}
                              />
                              <Button size="sm"
                                onClick={() => comment.trim() && addComment.mutate(comment)}
                                disabled={!comment.trim() || addComment.isPending}
                                className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2 text-xs">
                                {addComment.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
                                Comment
                              </Button>
                            </div>
                          </div>
                        </div>
                      )}

                      {activeTab === 'activity' && (
                        <div className="space-y-1">
                          {(ticket.activities ?? []).length === 0 && (
                            <p className="text-sm text-slate-600 italic text-center py-4">No activity yet.</p>
                          )}
                          {ticket.activities?.slice(0, 15).map((a, i) => (
                            <div key={a.id} className="flex gap-2.5 items-start py-1.5 text-xs text-slate-500">
                              <Avatar className="w-5 h-5 flex-shrink-0 mt-0.5">
                                <AvatarFallback className="text-[7px] bg-indigo-500/15 text-indigo-400">
                                  {getInitials(a.user?.name)}
                                </AvatarFallback>
                              </Avatar>
                              <div className="flex-1 leading-relaxed">
                                <span className="text-slate-400 font-medium">{a.user?.name} </span>
                                {a.type === 'CREATED'               && 'created this ticket'}
                                {a.type === 'STATUS_CHANGED'        && <><span>moved to </span><span className="font-medium text-slate-300">{a.newValue?.replace(/_/g, ' ')}</span></>}
                                {a.type === 'PRIORITY_CHANGED'      && <><span>changed priority to </span><span className="font-medium text-slate-300">{a.newValue}</span></>}
                                {a.type === 'ASSIGNED'              && 'assigned this ticket'}
                                {a.type === 'COMMENT_ADDED'         && 'left a comment'}
                                {a.type === 'STORY_POINTS_CHANGED'  && <><span>set story points to </span><span className="font-medium text-slate-300">{a.newValue}</span></>}
                                {a.type === 'SPRINT_CHANGED'        && 'changed sprint'}
                                <span className="text-slate-700 ml-1.5">{formatDateRelative(a.createdAt)}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </Section>
                  </div>
                </div>

                {/* ── RIGHT: properties ──────────────────────────────── */}
                <aside className="w-72 flex-shrink-0 overflow-y-auto border-l border-white/[0.06]"
                  style={{ background: 'rgba(8,8,18,0.7)' }}>
                  <div className="p-4 space-y-0.5">
                    <p className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-3 px-2">Properties</p>

                    {/* Status */}
                    <PropField label="Status" icon={CheckCircle2}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-full text-left hover:opacity-80 transition-opacity">
                            <StatusBadge status={ticket.status} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-44">
                          {STATUSES.map(s => (
                            <DropdownMenuItem key={s} onClick={() => update.mutate({ status: s })}
                              className="flex items-center gap-2 text-slate-300 focus:bg-white/5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: getStatusColor(s) }} />
                              {STATUS_LABELS[s]}
                              {ticket.status === s && <Check className="w-3 h-3 ml-auto text-indigo-400" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PropField>

                    {/* Priority */}
                    <PropField label="Priority" icon={Flag}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-full text-left hover:opacity-80 transition-opacity">
                            <PriorityBadge priority={ticket.priority} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-40">
                          {PRIORITIES.map(p => {
                            const PIcon = PRIORITY_ICONS[p]
                            return (
                              <DropdownMenuItem key={p} onClick={() => update.mutate({ priority: p })}
                                className="flex items-center gap-2 text-slate-300 focus:bg-white/5">
                                <PIcon className="w-3.5 h-3.5 flex-shrink-0" style={{ color: getPriorityColor(p) }} />
                                {p}
                                {ticket.priority === p && <Check className="w-3 h-3 ml-auto text-indigo-400" />}
                              </DropdownMenuItem>
                            )
                          })}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PropField>

                    {/* Type */}
                    <PropField label="Type" icon={Tag}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="w-full text-left hover:opacity-80 transition-opacity">
                            <TypeBadge type={ticket.type} />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-36">
                          {TYPES.map(t => (
                            <DropdownMenuItem key={t} onClick={() => update.mutate({ type: t })}
                              className="text-slate-300 focus:bg-white/5">
                              <TypeBadge type={t} />
                              {ticket.type === t && <Check className="w-3 h-3 ml-auto text-indigo-400" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PropField>

                    <div className="my-3 border-t border-white/[0.05]" />

                    {/* Assignee */}
                    <PropField label="Assignee" icon={User}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="flex items-center gap-2 w-full hover:bg-white/[0.04] rounded-lg px-2 py-1.5 -mx-2 transition-colors">
                            {ticket.assignee ? (
                              <>
                                <Avatar className="w-5 h-5">
                                  <AvatarImage src={ticket.assignee.image ?? undefined} />
                                  <AvatarFallback className="text-[7px] bg-indigo-500/20 text-indigo-400">
                                    {getInitials(ticket.assignee.name)}
                                  </AvatarFallback>
                                </Avatar>
                                <span className="text-xs text-slate-300 truncate">{ticket.assignee.name}</span>
                              </>
                            ) : (
                              <span className="text-xs text-slate-600 italic">Unassigned</span>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-52">
                          <DropdownMenuItem onClick={() => update.mutate({ assigneeId: null })} className="text-slate-400 focus:bg-white/5">
                            Unassigned
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          {users.map(u => (
                            <DropdownMenuItem key={u.id} onClick={() => update.mutate({ assigneeId: u.id })}
                              className="flex items-center gap-2 text-slate-300 focus:bg-white/5">
                              <Avatar className="w-5 h-5">
                                <AvatarImage src={u.image ?? undefined} />
                                <AvatarFallback className="text-[7px] bg-indigo-500/20 text-indigo-400">
                                  {getInitials(u.name)}
                                </AvatarFallback>
                              </Avatar>
                              <span className="truncate">{u.name}</span>
                              {ticket.assigneeId === u.id && <Check className="w-3 h-3 ml-auto text-indigo-400 flex-shrink-0" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PropField>

                    {/* Reporter */}
                    {ticket.reporter && (
                      <PropField label="Reporter" icon={ExternalLink}>
                        <div className="flex items-center gap-2 px-2 py-1.5 -mx-2">
                          <Avatar className="w-5 h-5">
                            <AvatarImage src={ticket.reporter.image ?? undefined} />
                            <AvatarFallback className="text-[7px] bg-violet-500/20 text-violet-400">
                              {getInitials(ticket.reporter.name)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-slate-400 truncate">{ticket.reporter.name}</span>
                        </div>
                      </PropField>
                    )}

                    <div className="my-3 border-t border-white/[0.05]" />

                    {/* Story Points */}
                    <PropField label="Story Points" icon={Hash}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="hover:bg-white/[0.04] rounded-lg px-2 py-1.5 -mx-2 transition-colors w-full text-left">
                            {ticket.storyPoints != null ? (
                              <span className="inline-flex items-center gap-1 bg-indigo-500/15 text-indigo-400 px-2.5 py-0.5 rounded-lg text-xs font-semibold">
                                <Zap className="w-3 h-3" />{ticket.storyPoints} pts
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600 italic">No estimate</span>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10">
                          <DropdownMenuItem onClick={() => update.mutate({ storyPoints: null })} className="text-slate-400 focus:bg-white/5">
                            No estimate
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          <div className="flex flex-wrap gap-1.5 p-2 max-w-[160px]">
                            {FIBONACCI_POINTS.map(pts => (
                              <button key={pts} onClick={() => update.mutate({ storyPoints: pts })}
                                className={cn(
                                  'w-9 h-9 rounded-lg text-xs font-bold transition-all',
                                  ticket.storyPoints === pts
                                    ? 'bg-indigo-500 text-white'
                                    : 'bg-white/[0.06] text-slate-400 hover:bg-indigo-500/20 hover:text-indigo-400'
                                )}>
                                {pts}
                              </button>
                            ))}
                          </div>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PropField>

                    {/* Due Date */}
                    <PropField label="Due Date" icon={CalendarDays}>
                      <div className="relative">
                        <input
                          type="date"
                          value={ticket.dueDate ? new Date(ticket.dueDate).toISOString().split('T')[0] : ''}
                          onChange={e => update.mutate({ dueDate: e.target.value || null })}
                          className={cn(
                            'w-full bg-transparent text-xs rounded-lg px-2 py-1.5 -mx-2 hover:bg-white/[0.04] transition-colors focus:outline-none focus:bg-white/[0.06] cursor-pointer',
                            overdue ? 'text-red-400' : ticket.dueDate ? 'text-slate-300' : 'text-slate-600'
                          )}
                          style={{ colorScheme: 'dark' }}
                        />
                        {!ticket.dueDate && <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-slate-600 italic pointer-events-none">No due date</span>}
                      </div>
                    </PropField>

                    <div className="my-3 border-t border-white/[0.05]" />

                    {/* Sprint */}
                    <PropField label="Sprint" icon={ArrowUpRight}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="hover:bg-white/[0.04] rounded-lg px-2 py-1.5 -mx-2 transition-colors w-full text-left">
                            {ticket.sprint ? (
                              <div className="flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 flex-shrink-0" />
                                <span className="text-xs text-slate-300 truncate">{ticket.sprint.name}</span>
                              </div>
                            ) : (
                              <span className="text-xs text-slate-600 italic">No sprint (Backlog)</span>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-52">
                          <DropdownMenuItem onClick={() => update.mutate({ sprintId: null })} className="text-slate-400 focus:bg-white/5">
                            No sprint (Backlog)
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          {sprints.map(s => (
                            <DropdownMenuItem key={s.id} onClick={() => update.mutate({ sprintId: s.id })}
                              className="flex items-center gap-2 text-slate-300 focus:bg-white/5">
                              <div className="w-1.5 h-1.5 rounded-full flex-shrink-0"
                                style={{ backgroundColor: s.status === 'ACTIVE' ? '#6366f1' : '#64748b' }} />
                              <span className="flex-1 truncate">{s.name}</span>
                              {s.status === 'ACTIVE' && <span className="text-xs text-indigo-400">Active</span>}
                              {ticket.sprintId === s.id && <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PropField>

                    {/* Epic */}
                    <PropField label="Epic" icon={GitBranch}>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <button className="hover:bg-white/[0.04] rounded-lg px-2 py-1.5 -mx-2 transition-colors w-full text-left">
                            {ticket.epic ? (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg text-xs font-medium"
                                style={{ color: ticket.epic.color, background: `${ticket.epic.color}18`, border: `1px solid ${ticket.epic.color}30` }}>
                                <div className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: ticket.epic.color }} />
                                {ticket.epic.title}
                              </span>
                            ) : (
                              <span className="text-xs text-slate-600 italic">No epic</span>
                            )}
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="bg-[#1a1a2e] border-white/10 w-52">
                          <DropdownMenuItem onClick={() => update.mutate({ epicId: null })} className="text-slate-400 focus:bg-white/5">
                            No epic
                          </DropdownMenuItem>
                          <DropdownMenuSeparator className="bg-white/[0.06]" />
                          {epics.map(ep => (
                            <DropdownMenuItem key={ep.id} onClick={() => update.mutate({ epicId: ep.id })}
                              className="flex items-center gap-2 text-slate-300 focus:bg-white/5">
                              <div className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: ep.color }} />
                              <span className="truncate flex-1">{ep.title}</span>
                              {ticket.epicId === ep.id && <Check className="w-3 h-3 text-indigo-400 flex-shrink-0" />}
                            </DropdownMenuItem>
                          ))}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </PropField>

                    <div className="my-3 border-t border-white/[0.05]" />

                    {/* Metadata */}
                    <div className="px-2 space-y-2.5 py-1">
                      <MetaRow label="Created" value={formatDateRelative(ticket.createdAt)} />
                      <MetaRow label="Updated" value={formatDateRelative(ticket.updatedAt)} />
                      {ticket.completedAt && <MetaRow label="Completed" value={formatDateRelative(ticket.completedAt)} accent />}
                    </div>
                  </div>
                </aside>
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

/* ── Sub-components ─────────────────────────────────────── */

function Section({
  icon: Icon, title, children, action,
}: {
  icon: React.ElementType
  title: string
  children: React.ReactNode
  action?: React.ReactNode
}) {
  return (
    <div>
      {title && (
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Icon className="w-3.5 h-3.5 text-slate-600" />
            <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wider">{title}</h4>
          </div>
          {action}
        </div>
      )}
      {children}
    </div>
  )
}

function PropField({
  label, icon: Icon, children,
}: {
  label: string
  icon: React.ElementType
  children: React.ReactNode
}) {
  return (
    <div className="rounded-lg px-2 py-2 hover:bg-white/[0.02] transition-colors group">
      <p className="text-[10px] text-slate-600 uppercase tracking-wider mb-1.5 flex items-center gap-1">
        <Icon className="w-3 h-3" />{label}
      </p>
      {children}
    </div>
  )
}

function MetaRow({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <div className="flex items-center justify-between text-xs">
      <span className="text-slate-600">{label}</span>
      <span className={accent ? 'text-emerald-400' : 'text-slate-500'}>{value}</span>
    </div>
  )
}
