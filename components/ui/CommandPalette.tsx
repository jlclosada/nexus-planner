'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useQuery } from '@tanstack/react-query'
import {
  Command,
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command'
import {
  LayoutDashboard,
  FolderKanban,
  Plus,
  Kanban,
  BarChart3,
  Layers,
} from 'lucide-react'
import type { ProjectWithRelations } from '@/types'

interface CommandPaletteProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function CommandPalette({ open, onOpenChange }: CommandPaletteProps) {
  const router = useRouter()

  const { data: projects } = useQuery<ProjectWithRelations[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then((r) => r.json()),
    enabled: open,
  })

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        onOpenChange(!open)
      }
    }
    document.addEventListener('keydown', down)
    return () => document.removeEventListener('keydown', down)
  }, [open, onOpenChange])

  const navigate = (href: string) => {
    router.push(href)
    onOpenChange(false)
  }

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput placeholder="Search tickets, projects, or navigate..." />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>

        <CommandGroup heading="Navigation">
          <CommandItem onSelect={() => navigate('/dashboard')}>
            <LayoutDashboard className="mr-2 h-4 w-4 text-slate-400" />
            Dashboard
          </CommandItem>
          <CommandItem onSelect={() => navigate('/projects')}>
            <FolderKanban className="mr-2 h-4 w-4 text-slate-400" />
            All Projects
          </CommandItem>
          <CommandItem onSelect={() => navigate('/projects/new')}>
            <Plus className="mr-2 h-4 w-4 text-slate-400" />
            Create New Project
          </CommandItem>
        </CommandGroup>

        {projects && projects.length > 0 && (
          <>
            <CommandSeparator />
            <CommandGroup heading="Projects">
              {projects.map((project) => (
                <CommandItem
                  key={project.id}
                  onSelect={() => navigate(`/projects/${project.id}/board`)}
                >
                  <div
                    className="mr-2 w-3 h-3 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span>{project.name}</span>
                  <span className="ml-2 text-xs text-slate-500">{project.key}</span>
                </CommandItem>
              ))}
            </CommandGroup>

            <CommandSeparator />
            <CommandGroup heading="Quick Actions">
              {projects.slice(0, 2).map((project) => (
                <CommandItem
                  key={`board-${project.id}`}
                  onSelect={() => navigate(`/projects/${project.id}/board`)}
                >
                  <Kanban className="mr-2 h-4 w-4 text-indigo-400" />
                  {project.name} — Board
                </CommandItem>
              ))}
              {projects.slice(0, 2).map((project) => (
                <CommandItem
                  key={`analytics-${project.id}`}
                  onSelect={() => navigate(`/projects/${project.id}/analytics`)}
                >
                  <BarChart3 className="mr-2 h-4 w-4 text-violet-400" />
                  {project.name} — Analytics
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        )}
      </CommandList>
    </CommandDialog>
  )
}
