'use client'

import { use, useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { Plus, Layers, X, Loader2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { getStatusColor } from '@/lib/utils'
import type { EpicWithTickets } from '@/types'

const epicColors = [
  '#8b5cf6', '#6366f1', '#ec4899', '#f43f5e',
  '#f97316', '#10b981', '#14b8a6', '#3b82f6',
]

export default function EpicsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const queryClient = useQueryClient()
  const [showCreate, setShowCreate] = useState(false)
  const [epicTitle, setEpicTitle] = useState('')
  const [epicDesc, setEpicDesc] = useState('')
  const [epicColor, setEpicColor] = useState(epicColors[0])

  const { data: epics = [], isLoading } = useQuery<EpicWithTickets[]>({
    queryKey: ['epics', projectId],
    queryFn: () => fetch(`/api/epics?projectId=${projectId}`).then((r) => r.json()),
  })

  const createEpic = useMutation({
    mutationFn: () =>
      fetch('/api/epics', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projectId, title: epicTitle, description: epicDesc, color: epicColor }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['epics', projectId] })
      toast.success('Epic created!')
      setShowCreate(false)
      setEpicTitle('')
      setEpicDesc('')
    },
  })

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-semibold text-slate-200">Epics</h2>
          <p className="text-sm text-slate-500 mt-0.5">{epics.length} epics</p>
        </div>
        <Button
          size="sm"
          onClick={() => setShowCreate(!showCreate)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
        >
          <Plus className="w-4 h-4" />
          New Epic
        </Button>
      </div>

      {showCreate && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-xl p-5 mb-6"
          style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(139,92,246,0.2)' }}
        >
          <h3 className="text-sm font-semibold text-slate-200 mb-4">Create Epic</h3>
          <div className="space-y-4">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Title *</Label>
              <Input
                placeholder="Epic title"
                value={epicTitle}
                onChange={(e) => setEpicTitle(e.target.value)}
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-xs">Description</Label>
              <Textarea
                placeholder="What does this epic cover?"
                value={epicDesc}
                onChange={(e) => setEpicDesc(e.target.value)}
                rows={2}
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-slate-300 text-xs">Color</Label>
              <div className="flex gap-2">
                {epicColors.map((color) => (
                  <button
                    key={color}
                    type="button"
                    onClick={() => setEpicColor(color)}
                    className="w-6 h-6 rounded transition-all duration-200"
                    style={{
                      background: color,
                      boxShadow: epicColor === color ? `0 0 0 2px rgba(255,255,255,0.3)` : 'none',
                      transform: epicColor === color ? 'scale(1.2)' : 'scale(1)',
                    }}
                  />
                ))}
              </div>
            </div>
          </div>
          <div className="flex gap-2 mt-4">
            <Button variant="outline" size="sm" onClick={() => setShowCreate(false)} className="border-white/10 text-slate-400">Cancel</Button>
            <Button
              size="sm"
              disabled={!epicTitle.trim() || createEpic.isPending}
              onClick={() => createEpic.mutate()}
              className="bg-violet-600 hover:bg-violet-500 text-white"
            >
              {createEpic.isPending ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Create Epic'}
            </Button>
          </div>
        </motion.div>
      )}

      {isLoading ? (
        <div className="space-y-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl shimmer" style={{ background: 'rgba(19,19,31,0.8)' }} />
          ))}
        </div>
      ) : epics.length === 0 ? (
        <div className="text-center py-16">
          <Layers className="w-12 h-12 text-slate-700 mx-auto mb-3" />
          <p className="text-slate-500 text-sm">No epics yet</p>
        </div>
      ) : (
        <div className="space-y-3">
          {epics.map((epic, i) => {
            const tickets = epic.tickets ?? []
            const doneCount = tickets.filter((t) => t.status === 'DONE').length
            const pct = tickets.length > 0 ? Math.round((doneCount / tickets.length) * 100) : 0

            return (
              <motion.div
                key={epic.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className="rounded-xl p-5"
                style={{
                  background: 'rgba(19,19,31,0.8)',
                  border: '1px solid rgba(255,255,255,0.06)',
                  borderLeft: `3px solid ${epic.color}`,
                }}
              >
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-slate-200">{epic.title}</h3>
                      <Badge
                        className="text-xs"
                        style={{
                          background: `${getStatusColor(epic.status)}15`,
                          color: getStatusColor(epic.status === 'IN_PROGRESS' ? 'IN_PROGRESS' : epic.status === 'DONE' ? 'DONE' : 'BACKLOG'),
                          border: 'none',
                        }}
                      >
                        {epic.status.replace('_', ' ')}
                      </Badge>
                    </div>
                    {epic.description && (
                      <p className="text-xs text-slate-500 mt-1">{epic.description}</p>
                    )}
                  </div>
                  <span className="text-xs text-slate-500">{tickets.length} tickets</span>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs text-slate-500">
                    <span>{doneCount} of {tickets.length} done</span>
                    <span>{pct}%</span>
                  </div>
                  <Progress
                    value={pct}
                    className="h-1.5 bg-white/5"
                  />
                </div>

                {/* Ticket status breakdown */}
                <div className="flex gap-3 mt-3">
                  {['DONE', 'IN_PROGRESS', 'TODO', 'BACKLOG'].map((status) => {
                    const count = tickets.filter((t) => t.status === status).length
                    if (count === 0) return null
                    return (
                      <div key={status} className="flex items-center gap-1">
                        <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: getStatusColor(status) }} />
                        <span className="text-xs text-slate-500">{count} {status.replace('_', ' ').toLowerCase()}</span>
                      </div>
                    )
                  })}
                </div>
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}
