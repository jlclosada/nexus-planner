'use client'

import { useParams, usePathname } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import {
  LayoutDashboard,
  Kanban,
  ListTodo,
  Zap,
  BarChart3,
  Layers,
  Settings,
} from 'lucide-react'
import type { ProjectWithRelations } from '@/types'

const tabs = [
  { label: 'Overview', icon: LayoutDashboard, path: '' },
  { label: 'Board', icon: Kanban, path: '/board' },
  { label: 'Backlog', icon: ListTodo, path: '/backlog' },
  { label: 'Sprints', icon: Zap, path: '/sprints' },
  { label: 'Epics', icon: Layers, path: '/epics' },
  { label: 'Analytics', icon: BarChart3, path: '/analytics' },
  { label: 'Settings', icon: Settings, path: '/settings' },
]

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const params = useParams()
  const pathname = usePathname()
  const projectId = params.projectId as string

  const { data: project } = useQuery<ProjectWithRelations>({
    queryKey: ['project', projectId],
    queryFn: () => fetch(`/api/projects/${projectId}`).then((r) => r.json()),
  })

  const basePath = `/projects/${projectId}`

  return (
    <div className="flex flex-col h-full">
      {/* Project header */}
      <div
        className="px-6 pt-6 pb-0"
        style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}
      >
        {/* Project info */}
        <div className="flex items-center gap-3 mb-4">
          <div
            className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold"
            style={{ background: project?.color ?? '#6366f1' }}
          >
            {project?.key?.slice(0, 2) ?? '...'}
          </div>
          <div>
            <h1 className="text-base font-semibold text-slate-200">
              {project?.name ?? 'Loading...'}
            </h1>
            <p className="text-xs text-slate-500">{project?.key}</p>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex items-center gap-1">
          {tabs.map((tab) => {
            const href = `${basePath}${tab.path}`
            const isActive =
              tab.path === ''
                ? pathname === basePath
                : pathname.startsWith(href)

            return (
              <Link key={tab.path} href={href}>
                <button
                  className={cn(
                    'flex items-center gap-1.5 px-3 py-2 rounded-t-lg text-sm font-medium transition-all relative',
                    isActive
                      ? 'text-indigo-400'
                      : 'text-slate-500 hover:text-slate-300'
                  )}
                >
                  <tab.icon className="w-3.5 h-3.5" />
                  {tab.label}
                  {isActive && (
                    <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full" />
                  )}
                </button>
              </Link>
            )
          })}
        </div>
      </div>

      {/* Page content */}
      <div className="flex-1 overflow-auto">
        {children}
      </div>
    </div>
  )
}
