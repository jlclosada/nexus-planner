'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import {
  LayoutDashboard,
  FolderKanban,
  CheckSquare,
  Bell,
  Settings,
  LogOut,
  ChevronDown,
  ChevronRight,
  Plus,
  Hexagon,
} from 'lucide-react'
import { cn, getInitials } from '@/lib/utils'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useState } from 'react'
import type { ProjectWithRelations } from '@/types'

const navItems = [
  { href: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { href: '/projects', icon: FolderKanban, label: 'Projects' },
  { href: '/my-work', icon: CheckSquare, label: 'My Work' },
  { href: '/notifications', icon: Bell, label: 'Notifications' },
]

export function Sidebar() {
  const pathname = usePathname()
  const { data: session } = useSession()
  const [projectsExpanded, setProjectsExpanded] = useState(true)

  const { data: projects } = useQuery<ProjectWithRelations[]>({
    queryKey: ['projects'],
    queryFn: () => fetch('/api/projects').then((r) => r.json()),
  })

  const isActive = (href: string) => {
    if (href === '/dashboard') return pathname === '/dashboard'
    return pathname.startsWith(href)
  }

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      className="fixed left-0 top-0 h-full w-[240px] flex flex-col z-30"
      style={{
        background: 'linear-gradient(180deg, #0f0f1a 0%, #0a0a0f 100%)',
        borderRight: '1px solid rgba(255,255,255,0.06)',
      }}
    >
      {/* Logo */}
      <div className="flex items-center gap-3 px-5 py-5 border-b border-white/[0.06]">
        <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-violet-600 shadow-lg">
          <Hexagon className="w-4 h-4 text-white" strokeWidth={2.5} />
        </div>
        <span className="text-lg font-bold gradient-text">Nexus</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200',
              isActive(item.href)
                ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20'
                : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
            )}
          >
            <item.icon className={cn('w-4 h-4', isActive(item.href) ? 'text-indigo-400' : '')} />
            {item.label}
            {item.label === 'Notifications' && (
              <span className="ml-auto bg-indigo-500 text-white text-xs px-1.5 py-0.5 rounded-full">3</span>
            )}
          </Link>
        ))}

        {/* Projects section */}
        <div className="pt-4">
          <button
            onClick={() => setProjectsExpanded(!projectsExpanded)}
            className="flex items-center gap-2 w-full px-3 py-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hover:text-slate-400 transition-colors"
          >
            {projectsExpanded ? (
              <ChevronDown className="w-3 h-3" />
            ) : (
              <ChevronRight className="w-3 h-3" />
            )}
            Projects
            <Link
              href="/projects/new"
              onClick={(e) => e.stopPropagation()}
              className="ml-auto p-0.5 hover:bg-white/10 rounded"
            >
              <Plus className="w-3.5 h-3.5 text-slate-400 hover:text-slate-200" />
            </Link>
          </button>

          {projectsExpanded && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-1 space-y-0.5"
            >
              {projects?.slice(0, 8).map((project) => (
                <Link
                  key={project.id}
                  href={`/projects/${project.id}`}
                  className={cn(
                    'flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm transition-all duration-200',
                    pathname.includes(project.id)
                      ? 'bg-white/[0.06] text-slate-200'
                      : 'text-slate-500 hover:text-slate-300 hover:bg-white/[0.03]'
                  )}
                >
                  <div
                    className="w-2 h-2 rounded-full flex-shrink-0"
                    style={{ backgroundColor: project.color }}
                  />
                  <span className="truncate">{project.name}</span>
                  <span className="ml-auto text-xs text-slate-600">{project.key}</span>
                </Link>
              ))}
            </motion.div>
          )}
        </div>
      </nav>

      {/* User menu */}
      <div className="border-t border-white/[0.06] p-3">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-3 w-full px-2 py-2 rounded-lg hover:bg-white/[0.04] transition-colors">
              <Avatar className="w-8 h-8">
                <AvatarImage src={session?.user?.image ?? undefined} />
                <AvatarFallback className="bg-indigo-500/20 text-indigo-400 text-xs">
                  {getInitials(session?.user?.name)}
                </AvatarFallback>
              </Avatar>
              <div className="flex-1 text-left min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {session?.user?.name ?? 'User'}
                </p>
                <p className="text-xs text-slate-500 truncate">{session?.user?.email}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-slate-500 flex-shrink-0" />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="end"
            side="top"
            className="w-52 bg-[#1a1a2e] border-white/10"
          >
            <DropdownMenuItem asChild>
              <Link href="/settings" className="flex items-center gap-2 text-slate-300">
                <Settings className="w-4 h-4" />
                Settings
              </Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-white/10" />
            <DropdownMenuItem
              onClick={() => signOut({ callbackUrl: '/login' })}
              className="flex items-center gap-2 text-red-400 focus:text-red-400 focus:bg-red-500/10"
            >
              <LogOut className="w-4 h-4" />
              Sign out
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </motion.aside>
  )
}
