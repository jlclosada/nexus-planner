'use client'

import { use, useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { motion } from 'framer-motion'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, Trash2, UserPlus, Mail, GitBranch, Eye, EyeOff, CheckCircle2 } from 'lucide-react'
import { toast } from 'sonner'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { getInitials } from '@/lib/utils'
import type { ProjectWithRelations } from '@/types'

const schema = z.object({
  name: z.string().min(2),
  description: z.string().optional(),
})

const colors = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f43f5e',
  '#f97316', '#f59e0b', '#10b981', '#14b8a6',
  '#3b82f6', '#06b6d4', '#84cc16',
]

export default function SettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)
  const router = useRouter()
  const queryClient = useQueryClient()
  const [inviteEmail, setInviteEmail] = useState('')
  const [selectedColor, setSelectedColor] = useState<string | null>(null)
  const [showToken, setShowToken] = useState(false)
  const [repoProvider, setRepoProvider] = useState('github')
  const [repoOwner, setRepoOwner] = useState('')
  const [repoName, setRepoName] = useState('')
  const [repoToken, setRepoToken] = useState('')
  const [repoDefaultBranch, setRepoDefaultBranch] = useState('main')
  const [repoSaved, setRepoSaved] = useState(false)

  const { data: project } = useQuery<ProjectWithRelations>({
    queryKey: ['project', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then((r) => r.json()),
  })

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
    values: { name: project?.name ?? '', description: project?.description ?? '' },
  })

  /* sync repo state once project loads */
  useEffect(() => {
    if (!project) return
    if ((project as any).repoProvider) setRepoProvider((project as any).repoProvider)
    if ((project as any).repoOwner) setRepoOwner((project as any).repoOwner)
    if ((project as any).repoName) setRepoName((project as any).repoName)
    if ((project as any).repoDefaultBranch) setRepoDefaultBranch((project as any).repoDefaultBranch)
  }, [project])

  const saveRepo = useMutation({
    mutationFn: () =>
      fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          repoProvider,
          repoOwner: repoOwner.trim(),
          repoName: repoName.trim(),
          repoToken: repoToken || undefined,
          repoDefaultBranch: repoDefaultBranch.trim(),
        }),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      setRepoToken('')
      setRepoSaved(true)
      setTimeout(() => setRepoSaved(false), 3000)
    },
    onError: () => toast.error('Failed to save repository settings'),
  })

  const updateProject = useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      fetch(`/api/projects/${projectId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project updated!')
    },
  })

  const inviteMember = useMutation({
    mutationFn: () =>
      fetch(`/api/projects/${projectId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: 'MEMBER' }),
      }).then((r) => {
        if (!r.ok) return r.json().then((d) => { throw new Error(d.error) })
        return r.json()
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['project', projectId] })
      toast.success('Member invited!')
      setInviteEmail('')
    },
    onError: (e: Error) => toast.error(e.message),
  })

  const deleteProject = useMutation({
    mutationFn: () =>
      fetch(`/api/projects/${projectId}`, { method: 'DELETE' }).then((r) => r.json()),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] })
      toast.success('Project deleted')
      router.push('/projects')
    },
  })

  const currentColor = selectedColor ?? project?.color ?? '#6366f1'

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      {/* General settings */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-base font-semibold text-slate-200 mb-5">General Settings</h3>

        <form
          onSubmit={handleSubmit((data) =>
            updateProject.mutate({ ...data, color: currentColor })
          )}
          className="space-y-4"
        >
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Project Name</Label>
            <Input
              className="bg-white/[0.04] border-white/10 text-slate-200"
              {...register('name')}
            />
            {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
          </div>

          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Description</Label>
            <Textarea
              rows={3}
              className="bg-white/[0.04] border-white/10 text-slate-200 resize-none text-sm"
              {...register('description')}
            />
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 text-sm">Color</Label>
            <div className="flex flex-wrap gap-2">
              {colors.map((color) => (
                <button
                  key={color}
                  type="button"
                  onClick={() => setSelectedColor(color)}
                  className="w-7 h-7 rounded-lg transition-all duration-200"
                  style={{
                    background: color,
                    boxShadow: currentColor === color ? `0 0 0 2px rgba(255,255,255,0.3), 0 0 8px ${color}60` : 'none',
                    transform: currentColor === color ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              ))}
            </div>
          </div>

          <Button
            type="submit"
            disabled={updateProject.isPending}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {updateProject.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Save Changes'}
          </Button>
        </form>
      </div>

      {/* Members */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <h3 className="text-base font-semibold text-slate-200 mb-5">Team Members</h3>

        <div className="space-y-3 mb-5">
          {project?.members?.map((member) => (
            <div key={member.id} className="flex items-center gap-3">
              <Avatar className="w-8 h-8">
                <AvatarImage src={member.user?.image ?? undefined} />
                <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-xs">
                  {getInitials(member.user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="text-sm text-slate-200">{member.user?.name}</p>
                <p className="text-xs text-slate-500">{member.user?.email}</p>
              </div>
              <Badge
                className="text-xs"
                style={{ background: 'rgba(99,102,241,0.15)', color: '#818cf8', border: 'none' }}
              >
                {member.role}
              </Badge>
            </div>
          ))}
        </div>

        <Separator className="bg-white/[0.06] mb-4" />

        <div className="space-y-2">
          <Label className="text-slate-300 text-sm">Invite Member</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <Input
                type="email"
                placeholder="email@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="pl-9 bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm"
                onKeyDown={(e) => e.key === 'Enter' && inviteEmail && inviteMember.mutate()}
              />
            </div>
            <Button
              onClick={() => inviteMember.mutate()}
              disabled={!inviteEmail || inviteMember.isPending}
              className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5"
            >
              {inviteMember.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <UserPlus className="w-3.5 h-3.5" />}
              Invite
            </Button>
          </div>
        </div>
      </div>

      {/* Repository */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
      >
        <div className="flex items-center gap-2 mb-1">
          <GitBranch className="w-4 h-4 text-indigo-400" />
          <h3 className="text-base font-semibold text-slate-200">Repository</h3>
          {(project as any)?.repoOwner && (
            <span className="ml-2 text-xs text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-2 py-0.5 rounded-full flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Connected
            </span>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-5">
          Connect a Git repository to create branches directly from tickets.
        </p>

        <div className="space-y-4">
          {/* Provider */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Provider</Label>
            <div className="flex gap-2">
              {(['github', 'gitlab', 'bitbucket'] as const).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setRepoProvider(p)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium transition-all capitalize"
                  style={
                    repoProvider === p
                      ? { background: 'rgba(99,102,241,0.2)', color: '#818cf8', border: '1px solid rgba(99,102,241,0.35)' }
                      : { background: 'rgba(255,255,255,0.04)', color: '#64748b', border: '1px solid rgba(255,255,255,0.08)' }
                  }
                >
                  {p}
                </button>
              ))}
            </div>
          </div>

          {/* Owner + Repo */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Owner / Organization</Label>
              <Input
                placeholder="e.g. octocat"
                value={repoOwner}
                onChange={(e) => setRepoOwner(e.target.value)}
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Repository Name</Label>
              <Input
                placeholder="e.g. my-repo"
                value={repoName}
                onChange={(e) => setRepoName(e.target.value)}
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm"
              />
            </div>
          </div>

          {/* Default branch */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Default Branch</Label>
            <Input
              placeholder="main"
              value={repoDefaultBranch}
              onChange={(e) => setRepoDefaultBranch(e.target.value)}
              className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm"
            />
          </div>

          {/* Token */}
          <div className="space-y-1.5">
            <Label className="text-slate-300 text-sm">Personal Access Token</Label>
            <div className="relative">
              <Input
                type={showToken ? 'text' : 'password'}
                placeholder={(project as any)?.repoOwner ? '••••••••••••••••••••• (leave blank to keep current)' : 'ghp_xxxxxxxxxxxx'}
                value={repoToken}
                onChange={(e) => setRepoToken(e.target.value)}
                className="bg-white/[0.04] border-white/10 text-slate-200 placeholder:text-slate-600 text-sm pr-10"
              />
              <button
                type="button"
                onClick={() => setShowToken((v) => !v)}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
              >
                {showToken ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
            <p className="text-xs text-slate-600">
              Needs <code className="text-indigo-400 bg-indigo-500/10 px-1 rounded">repo</code> scope (GitHub) or equivalent.
              Token is stored encrypted in your database.
            </p>
          </div>

          <Button
            type="button"
            onClick={() => saveRepo.mutate()}
            disabled={saveRepo.isPending || !repoOwner.trim() || !repoName.trim()}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2"
          >
            {saveRepo.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : repoSaved ? (
              <><CheckCircle2 className="w-4 h-4" /> Saved!</>
            ) : (
              <><GitBranch className="w-4 h-4" /> Save Repository</>
            )}
          </Button>

          {(project as any)?.repoOwner && (
            <p className="text-xs text-slate-500">
              Connected to <span className="text-slate-300 font-medium">{(project as any).repoOwner}/{(project as any).repoName}</span> via {(project as any).repoProvider}
            </p>
          )}
        </div>
      </div>

      {/* Danger zone */}
      <div
        className="rounded-xl p-6"
        style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(239,68,68,0.2)' }}
      >
        <h3 className="text-base font-semibold text-red-400 mb-2">Danger Zone</h3>
        <p className="text-sm text-slate-500 mb-4">
          Once you delete a project, there is no going back. All tickets, sprints, and data will be permanently deleted.
        </p>
        <Button
          variant="destructive"
          size="sm"
          onClick={() => {
            if (confirm('Are you sure? This action cannot be undone.')) {
              deleteProject.mutate()
            }
          }}
          disabled={deleteProject.isPending}
          className="bg-red-500/15 text-red-400 hover:bg-red-500/25 border border-red-500/30 gap-2"
        >
          <Trash2 className="w-4 h-4" />
          Delete Project
        </Button>
      </div>
    </div>
  )
}
