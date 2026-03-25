'use client'

import { useState } from 'react'
import { useParams } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GitBranch, GitCommit, ExternalLink, Copy, Check, Search,
  Star, AlertCircle, RefreshCw, Clock, User, ChevronRight,
  GitMerge, Code2,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'

/* ── types ── */
interface LastCommit {
  sha: string; shortSha: string; message: string
  authorName: string; authorLogin: string | null; authorAvatar: string | null
  date: string; url: string
}
interface BranchInfo {
  name: string; sha: string; isDefault: boolean
  lastCommit: LastCommit | null
  ticket: { id: string; code: string; title: string; status: string } | null
}
interface RepoInfo { owner: string; name: string; url: string; defaultBranch: string }
interface CommitInfo {
  sha: string; shortSha: string; message: string; fullMessage: string
  authorName: string; authorLogin: string | null; authorAvatar: string | null
  date: string; url: string; parents: string[]
}

/* ── helpers ── */
function relativeTime(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime()
  const m = Math.floor(diff / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m}m ago`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h}h ago`
  const d = Math.floor(h / 24)
  if (d < 30) return `${d}d ago`
  return new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleString('en-US', {
    month: 'short', day: 'numeric', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

const STATUS_COLORS: Record<string, string> = {
  DONE: '#22c55e', IN_PROGRESS: '#6366f1', IN_REVIEW: '#f59e0b',
  BACKLOG: '#64748b', TODO: '#94a3b8', BLOCKED: '#ef4444',
}

/* ── CopySha component ── */
function CopySha({ sha }: { sha: string }) {
  const [copied, setCopied] = useState(false)
  const copy = () => {
    navigator.clipboard.writeText(sha)
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }
  return (
    <button onClick={copy}
      className="flex items-center gap-1 px-1.5 py-0.5 rounded font-mono text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] transition-all group"
      title="Copy SHA">
      {copied ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />}
      {sha}
    </button>
  )
}

/* ═══════════════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════════════ */
export default function RepositoryPage() {
  const params = useParams()
  const projectId = params.projectId as string
  const [selectedBranch, setSelectedBranch] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [refreshKey, setRefreshKey] = useState(0)

  /* ── fetch branch list ── */
  const { data, isLoading, error, refetch } = useQuery<{ branches: BranchInfo[]; repo: RepoInfo }>({
    queryKey: ['repository', projectId, refreshKey],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/repository`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      return d
    },
    retry: false,
  })

  /* Set default selected branch once loaded */
  const branches = data?.branches ?? []
  const activeBranch = selectedBranch ?? data?.repo.defaultBranch ?? null

  /* ── fetch commits for selected branch ── */
  const { data: commitData, isLoading: loadingCommits } = useQuery<{ commits: CommitInfo[] }>({
    queryKey: ['repository-commits', projectId, activeBranch],
    queryFn: async () => {
      const r = await fetch(`/api/projects/${projectId}/repository?branch=${encodeURIComponent(activeBranch!)}`)
      const d = await r.json()
      if (!r.ok) throw new Error(d.error ?? `HTTP ${r.status}`)
      return d
    },
    enabled: !!activeBranch,
    retry: false,
  })

  const commits = commitData?.commits ?? []
  const filtered = branches.filter(b =>
    b.name.toLowerCase().includes(search.toLowerCase())
  )

  /* ── not connected ── */
  if (error?.message?.includes('No repository')) {
    return (
      <div className="flex flex-col items-center justify-center h-full py-24 text-center px-8">
        <div className="w-16 h-16 rounded-2xl bg-slate-800/60 flex items-center justify-center mb-4">
          <GitBranch className="w-8 h-8 text-slate-500" />
        </div>
        <h2 className="text-lg font-semibold text-slate-300 mb-2">No repository connected</h2>
        <p className="text-sm text-slate-500 max-w-sm">
          Connect a GitHub repository in <strong className="text-slate-400">Project Settings → Repository</strong> to see branches, commits, and linked tickets.
        </p>
      </div>
    )
  }

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* ── Header ── */}
      <div className="px-6 py-4 border-b border-white/[0.05] flex items-center gap-4 flex-shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <Code2 className="w-4 h-4 text-indigo-400 shrink-0" />
          {data?.repo ? (
            <a href={data.repo.url} target="_blank" rel="noreferrer"
              className="flex items-center gap-1.5 text-sm font-mono text-slate-300 hover:text-indigo-400 transition-colors truncate">
              <span className="text-slate-500">{data.repo.owner}</span>
              <span className="text-slate-600">/</span>
              <span>{data.repo.name}</span>
              <ExternalLink className="w-3 h-3 shrink-0" />
            </a>
          ) : (
            <div className="h-4 w-40 rounded bg-white/[0.06] animate-pulse" />
          )}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {data && (
            <div className="flex items-center gap-4 text-xs text-slate-500">
              <span className="flex items-center gap-1">
                <GitBranch className="w-3 h-3" />
                {branches.length} branches
              </span>
              <span className="flex items-center gap-1">
                <GitCommit className="w-3 h-3" />
                {commits.length > 0 ? `${commits.length}+ commits` : '—'}
              </span>
            </div>
          )}
          <button onClick={() => { setRefreshKey(k => k + 1); refetch() }}
            className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-slate-300 hover:bg-white/[0.06] px-2.5 py-1.5 rounded-lg transition-all">
            <RefreshCw className="w-3 h-3" />
            Refresh
          </button>
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-3 text-sm text-slate-500">
            <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
            Loading repository…
          </div>
        </div>
      ) : error ? (
        <div className="flex items-center justify-center flex-1">
          <div className="flex items-center gap-2 text-sm text-red-400 bg-red-500/10 border border-red-500/20 px-4 py-3 rounded-xl">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {(error as Error).message}
          </div>
        </div>
      ) : (
        <div className="flex flex-1 overflow-hidden">

          {/* ── LEFT: Branch list ── */}
          <div className="w-80 border-r border-white/[0.05] flex flex-col flex-shrink-0 overflow-hidden">
            <div className="p-3 border-b border-white/[0.04]">
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-600" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Filter branches…"
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg text-xs text-slate-300 placeholder-slate-600 outline-none"
                  style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.06)' }}
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto py-2 space-y-0.5 px-2">
              {filtered.map((branch, i) => (
                <motion.button
                  key={branch.name}
                  initial={{ opacity: 0, x: -8 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03, duration: 0.2 }}
                  onClick={() => setSelectedBranch(branch.name)}
                  className={cn(
                    'w-full text-left rounded-xl px-3 py-2.5 transition-all group',
                    activeBranch === branch.name
                      ? 'bg-indigo-500/10 border border-indigo-500/20'
                      : 'hover:bg-white/[0.04] border border-transparent'
                  )}
                >
                  <div className="flex items-start gap-2">
                    <GitBranch className={cn(
                      'w-3.5 h-3.5 mt-0.5 shrink-0',
                      activeBranch === branch.name ? 'text-indigo-400' : 'text-slate-600 group-hover:text-slate-400'
                    )} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        <span className={cn(
                          'font-mono text-xs font-medium truncate',
                          activeBranch === branch.name ? 'text-indigo-300' : 'text-slate-300'
                        )}>
                          {branch.name}
                        </span>
                        {branch.isDefault && (
                          <span className="flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[10px] bg-amber-500/10 text-amber-400 border border-amber-500/20 shrink-0">
                            <Star className="w-2.5 h-2.5" /> default
                          </span>
                        )}
                      </div>
                      {branch.ticket && (
                        <div className="mt-1 flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: STATUS_COLORS[branch.ticket.status] ?? '#64748b' }} />
                          <span className="text-[10px] text-slate-500 truncate">
                            <span className="text-slate-400 font-mono">{branch.ticket.code}</span>
                            {' '}{branch.ticket.title}
                          </span>
                        </div>
                      )}
                      {branch.lastCommit && (
                        <p className="text-[10px] text-slate-600 mt-0.5 truncate">
                          {branch.lastCommit.message}
                        </p>
                      )}
                      {branch.lastCommit && (
                        <div className="flex items-center gap-1.5 mt-1">
                          <Clock className="w-2.5 h-2.5 text-slate-700" />
                          <span className="text-[10px] text-slate-600">{relativeTime(branch.lastCommit.date)}</span>
                        </div>
                      )}
                    </div>
                    <ChevronRight className={cn(
                      'w-3 h-3 shrink-0 mt-0.5 transition-opacity',
                      activeBranch === branch.name ? 'text-indigo-500 opacity-100' : 'opacity-0 group-hover:opacity-100 text-slate-600'
                    )} />
                  </div>
                </motion.button>
              ))}
            </div>
          </div>

          {/* ── RIGHT: Commit timeline ── */}
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Branch header */}
            <div className="px-6 py-3 border-b border-white/[0.04] flex items-center gap-3 flex-shrink-0">
              <GitBranch className="w-4 h-4 text-indigo-400" />
              <span className="font-mono text-sm text-slate-300">{activeBranch}</span>
              {activeBranch && data?.repo && (
                <a href={`${data.repo.url}/tree/${activeBranch}`} target="_blank" rel="noreferrer"
                  className="ml-auto flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-400 transition-colors">
                  <ExternalLink className="w-3 h-3" /> View on GitHub
                </a>
              )}
            </div>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {loadingCommits ? (
                <div className="space-y-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="flex flex-col items-center">
                        <div className="w-3 h-3 rounded-full bg-white/[0.08]" />
                        <div className="w-px flex-1 bg-white/[0.04] mt-1" />
                      </div>
                      <div className="flex-1 pb-4 space-y-1.5">
                        <div className="h-3.5 w-3/4 rounded bg-white/[0.06]" />
                        <div className="h-3 w-1/3 rounded bg-white/[0.04]" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : commits.length === 0 ? (
                <div className="flex items-center justify-center py-16 text-sm text-slate-600">
                  No commits found
                </div>
              ) : (
                <div className="relative">
                  {commits.map((commit, i) => {
                    const isMerge = commit.parents.length > 1
                    return (
                      <motion.div
                        key={commit.sha}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.025, duration: 0.25 }}
                        className="flex gap-5 group"
                      >
                        {/* Timeline line + node */}
                        <div className="flex flex-col items-center flex-shrink-0 w-6">
                          <div className={cn(
                            'w-3 h-3 rounded-full border-2 shrink-0 z-10 transition-colors',
                            isMerge
                              ? 'border-violet-500 bg-violet-500/20'
                              : 'border-indigo-500 bg-indigo-500/20 group-hover:bg-indigo-500/40'
                          )} />
                          {i < commits.length - 1 && (
                            <div className="w-px flex-1 mt-1"
                              style={{ background: 'linear-gradient(to bottom, rgba(99,102,241,0.3), rgba(99,102,241,0.05))' }} />
                          )}
                        </div>

                        {/* Commit card */}
                        <div className={cn(
                          'flex-1 pb-5 min-w-0',
                          i < commits.length - 1 && 'border-b border-white/[0.03]'
                        )}>
                          <div className="flex items-start gap-3">
                            <div className="flex-1 min-w-0">
                              <div className="flex items-start gap-2 flex-wrap">
                                {isMerge && (
                                  <span className="flex items-center gap-1 text-[10px] text-violet-400 bg-violet-500/10 border border-violet-500/20 px-1.5 py-0.5 rounded-full shrink-0">
                                    <GitMerge className="w-2.5 h-2.5" /> merge
                                  </span>
                                )}
                                <p className="text-sm text-slate-200 font-medium leading-snug">
                                  {commit.message}
                                </p>
                              </div>

                              <div className="flex items-center gap-3 mt-2 flex-wrap">
                                {/* Author */}
                                <div className="flex items-center gap-1.5">
                                  {commit.authorAvatar ? (
                                    <Avatar className="w-4 h-4">
                                      <AvatarImage src={commit.authorAvatar} />
                                      <AvatarFallback className="text-[8px]">
                                        {commit.authorName[0]}
                                      </AvatarFallback>
                                    </Avatar>
                                  ) : (
                                    <User className="w-3 h-3 text-slate-600" />
                                  )}
                                  <span className="text-xs text-slate-500">
                                    {commit.authorLogin ?? commit.authorName}
                                  </span>
                                </div>

                                {/* Date */}
                                <span className="text-xs text-slate-600" title={formatDate(commit.date)}>
                                  <Clock className="w-3 h-3 inline mr-1 opacity-60" />
                                  {relativeTime(commit.date)}
                                </span>

                                {/* SHA */}
                                <CopySha sha={commit.shortSha} />

                                {/* GitHub link */}
                                <a href={commit.url} target="_blank" rel="noreferrer"
                                  className="flex items-center gap-1 text-xs text-slate-600 hover:text-indigo-400 transition-colors opacity-0 group-hover:opacity-100">
                                  <ExternalLink className="w-3 h-3" />
                                </a>
                              </div>
                            </div>
                          </div>
                        </div>
                      </motion.div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
