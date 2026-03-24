'use client'

import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { FIBONACCI_POINTS } from '@/lib/utils'
import type { TicketStatus, SprintWithTickets, EpicWithTickets, User } from '@/types'

const schema = z.object({
  title: z.string().min(1, 'Title is required').max(500),
  description: z.string().optional(),
  type: z.enum(['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK', 'SPIKE']),
  priority: z.enum(['CRITICAL', 'HIGH', 'MEDIUM', 'LOW']),
  storyPoints: z.string().optional(),
  sprintId: z.string().optional(),
  epicId: z.string().optional(),
  assigneeId: z.string().optional(),
})

type FormData = z.infer<typeof schema>

interface CreateTicketDialogProps {
  open: boolean
  onClose: () => void
  projectId: string
  defaultStatus?: TicketStatus
}

export function CreateTicketDialog({ open, onClose, projectId, defaultStatus = 'BACKLOG' }: CreateTicketDialogProps) {
  const queryClient = useQueryClient()

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: { type: 'TASK', priority: 'MEDIUM' },
  })

  const { data: sprints = [] } = useQuery<SprintWithTickets[]>({
    queryKey: ['sprints', projectId],
    queryFn: () =>
      fetch(`/api/projects/${projectId}`)
        .then((r) => r.json())
        .then((p) => (Array.isArray(p.sprints) ? p.sprints : [])),
    enabled: open,
  })

  const { data: epics = [] } = useQuery<EpicWithTickets[]>({
    queryKey: ['epics', projectId],
    queryFn: () => fetch(`/api/epics?projectId=${projectId}`).then((r) => r.json()),
    enabled: open,
  })

  const { data: members = [] } = useQuery<User[]>({
    queryKey: ['project-members', projectId],
    queryFn: () =>
      fetch(`/api/projects/${projectId}/members`)
        .then((r) => r.json())
        .then((data) => (Array.isArray(data) ? data.map((m: { user: User }) => m.user) : [])),
    enabled: open,
  })

  const { mutate, isPending } = useMutation({
    mutationFn: (data: FormData) =>
      fetch('/api/tickets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...data,
          projectId,
          status: defaultStatus,
          storyPoints: data.storyPoints ? parseInt(data.storyPoints) : undefined,
          sprintId: data.sprintId || undefined,
          epicId: data.epicId || undefined,
          assigneeId: data.assigneeId || undefined,
        }),
      }).then((r) => {
        if (!r.ok) throw new Error('Failed')
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tickets', projectId] })
      toast.success('Ticket created!')
      reset()
      onClose()
    },
    onError: () => toast.error('Failed to create ticket'),
  })

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" onClick={onClose}>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.97 }}
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-lg rounded-2xl p-6"
            style={{
              background: '#13131f',
              border: '1px solid rgba(255,255,255,0.08)',
            }}
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-lg font-semibold text-slate-100">Create Ticket</h2>
              <button onClick={onClose} className="p-1.5 hover:bg-white/[0.06] rounded-lg text-slate-500">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSubmit((data) => mutate(data))} className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Title *</Label>
                <Input
                  placeholder="What needs to be done?"
                  className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600"
                  {...register('title')}
                />
                {errors.title && <p className="text-red-400 text-xs">{errors.title.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300 text-sm">Description</Label>
                <Textarea
                  placeholder="Optional description..."
                  rows={3}
                  className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 resize-none text-sm"
                  {...register('description')}
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Type</Label>
                  <Select onValueChange={(v) => setValue('type', v as FormData['type'])} defaultValue="TASK">
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {['EPIC', 'STORY', 'TASK', 'BUG', 'SUBTASK', 'SPIKE'].map((t) => (
                        <SelectItem key={t} value={t} className="text-slate-300">{t}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Priority</Label>
                  <Select onValueChange={(v) => setValue('priority', v as FormData['priority'])} defaultValue="MEDIUM">
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-200">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => (
                        <SelectItem key={p} value={p} className="text-slate-300">{p}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Story Points</Label>
                  <Select onValueChange={(v) => setValue('storyPoints', v)}>
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-200">
                      <SelectValue placeholder="No estimate" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {FIBONACCI_POINTS.map((pts) => (
                        <SelectItem key={pts} value={String(pts)} className="text-slate-300">{pts} pts</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Sprint</Label>
                  <Select onValueChange={(v) => setValue('sprintId', v)}>
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-200">
                      <SelectValue placeholder="Backlog" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {sprints.map((sprint) => (
                        <SelectItem key={sprint.id} value={sprint.id} className="text-slate-300">
                          {sprint.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {epics.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Epic</Label>
                  <Select onValueChange={(v) => setValue('epicId', v)}>
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-200">
                      <SelectValue placeholder="No epic" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {epics.map((epic) => (
                        <SelectItem key={epic.id} value={epic.id} className="text-slate-300">
                          {epic.title}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {members.length > 0 && (
                <div className="space-y-1.5">
                  <Label className="text-slate-300 text-sm">Assignee</Label>
                  <Select onValueChange={(v) => setValue('assigneeId', v)}>
                    <SelectTrigger className="bg-white/[0.04] border-white/10 text-slate-200">
                      <SelectValue placeholder="Unassigned" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1a1a2e] border-white/10">
                      {members.map((user) => (
                        <SelectItem key={user.id} value={user.id} className="text-slate-300">
                          {user.name ?? user.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="border-white/10 text-slate-400"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  disabled={isPending}
                  className="bg-indigo-600 hover:bg-indigo-500 text-white flex-1"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Ticket'}
                </Button>
              </div>
            </form>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}
