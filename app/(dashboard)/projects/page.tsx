'use client'

import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import Link from 'next/link'
import { Plus, FolderKanban, Users, Ticket, Zap } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatDateRelative } from '@/lib/utils'
import type { ProjectWithRelations } from '@/types'

export default function ProjectsPage() {
  const { data: projects = [], isLoading } = useQuery<ProjectWithRelations[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then((r) => r.json()),
  })

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-100">Projects</h1>
          <p className="text-slate-500 text-sm mt-1">
            {projects.length} project{projects.length !== 1 ? 's' : ''} in your workspace
          </p>
        </div>
        <Link href="/projects/new">
          <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
            <Plus className="w-4 h-4" />
            New Project
          </Button>
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {Array.from({ length: 6 }).map((_, i) => (
            <div
              key={i}
              className="rounded-xl h-48 shimmer"
              style={{ background: 'rgba(19,19,31,0.8)' }}
            />
          ))}
        </div>
      ) : projects.length === 0 ? (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24"
        >
          <FolderKanban className="w-16 h-16 text-slate-700 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-slate-300 mb-2">No projects yet</h3>
          <p className="text-slate-500 mb-6">
            Create your first project to start managing your work
          </p>
          <Link href="/projects/new">
            <Button className="bg-indigo-600 hover:bg-indigo-500 text-white gap-2">
              <Plus className="w-4 h-4" />
              Create Project
            </Button>
          </Link>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {projects.map((project, i) => (
            <motion.div
              key={project.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
            >
              <Link href={`/projects/${project.id}`}>
                <div
                  className="rounded-xl p-6 hover:border-white/10 transition-all duration-200 cursor-pointer group relative overflow-hidden"
                  style={{
                    background: 'rgba(19,19,31,0.8)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}
                >
                  {/* Color accent top bar */}
                  <div
                    className="absolute top-0 left-0 right-0 h-0.5"
                    style={{ background: project.color }}
                  />

                  {/* Header */}
                  <div className="flex items-start justify-between mb-4">
                    <div className="flex items-center gap-3">
                      <div
                        className="w-10 h-10 rounded-lg flex items-center justify-center text-white text-sm font-bold"
                        style={{
                          background: `linear-gradient(135deg, ${project.color}, ${project.color}99)`,
                        }}
                      >
                        {project.key.slice(0, 2)}
                      </div>
                      <div>
                        <h3 className="font-semibold text-slate-200 group-hover:text-white transition-colors">
                          {project.name}
                        </h3>
                        <span className="text-xs text-slate-500">{project.key}</span>
                      </div>
                    </div>
                    <Badge
                      className="text-xs"
                      style={{
                        background: project.status === 'ACTIVE' ? 'rgba(16,185,129,0.1)' : 'rgba(100,116,139,0.1)',
                        color: project.status === 'ACTIVE' ? '#10b981' : '#64748b',
                        border: 'none',
                      }}
                    >
                      {project.status}
                    </Badge>
                  </div>

                  {/* Description */}
                  {project.description && (
                    <p className="text-sm text-slate-500 mb-4 line-clamp-2">
                      {project.description}
                    </p>
                  )}

                  {/* Stats */}
                  <div className="flex items-center gap-4 mt-4 pt-4 border-t border-white/[0.04]">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Ticket className="w-3.5 h-3.5" />
                      <span>{project._count?.tickets ?? 0} tickets</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Users className="w-3.5 h-3.5" />
                      <span>{project._count?.members ?? 0} members</span>
                    </div>
                    {project.sprints && project.sprints.length > 0 && (
                      <div className="flex items-center gap-1.5 text-xs text-indigo-400">
                        <Zap className="w-3.5 h-3.5" />
                        <span>Sprint active</span>
                      </div>
                    )}
                  </div>

                  {/* Member avatars */}
                  {project.members && project.members.length > 0 && (
                    <div className="flex items-center mt-3">
                      {project.members.slice(0, 4).map((member, i) => (
                        <div
                          key={member.id}
                          className="w-6 h-6 rounded-full border-2 border-[#0a0a0f] -ml-1 first:ml-0 flex items-center justify-center text-xs font-medium"
                          style={{
                            background: `hsl(${member.userId.charCodeAt(0) * 7 % 360}, 60%, 40%)`,
                            zIndex: project.members!.length - i,
                          }}
                        >
                          {member.user?.name?.[0] ?? '?'}
                        </div>
                      ))}
                      {project.members.length > 4 && (
                        <span className="text-xs text-slate-500 ml-2">
                          +{project.members.length - 4}
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </Link>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
