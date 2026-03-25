'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Search, Bell, Plus, Command } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { CommandPalette } from '@/components/ui/CommandPalette'

interface HeaderProps {
  title?: string
  breadcrumbs?: Array<{ label: string; href?: string }>
}

export function Header({ title, breadcrumbs }: HeaderProps) {
  const [commandOpen, setCommandOpen] = useState(false)
  const pathname = usePathname()

  // Global Cmd+K / Ctrl+K shortcut — registered here so it works on every page
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if (e.key.toLowerCase() === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault()
        setCommandOpen((v) => !v)
      }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [])

  const getTitle = () => {
    if (title) return title
    if (pathname === '/dashboard') return 'Dashboard'
    if (pathname === '/projects') return 'Projects'
    if (pathname.includes('/board')) return 'Board'
    if (pathname.includes('/backlog')) return 'Backlog'
    if (pathname.includes('/sprints')) return 'Sprints'
    if (pathname.includes('/analytics')) return 'Analytics'
    if (pathname.includes('/epics')) return 'Epics'
    if (pathname.includes('/settings')) return 'Settings'
    return 'Nexus'
  }

  return (
    <>
      <header
        className="fixed top-0 right-0 h-14 flex items-center justify-between px-6 z-20"
        style={{
          left: '240px',
          background: 'rgba(10, 10, 15, 0.85)',
          backdropFilter: 'blur(12px)',
          borderBottom: '1px solid rgba(255,255,255,0.06)',
        }}
      >
        {/* Left: Title / Breadcrumb */}
        <div className="flex items-center gap-2">
          {breadcrumbs ? (
            <nav className="flex items-center gap-1 text-sm">
              {breadcrumbs.map((crumb, i) => (
                <span key={i} className="flex items-center gap-1">
                  {i > 0 && <span className="text-slate-600">/</span>}
                  <span
                    className={cn(
                      i === breadcrumbs.length - 1
                        ? 'text-slate-200 font-medium'
                        : 'text-slate-500'
                    )}
                  >
                    {crumb.label}
                  </span>
                </span>
              ))}
            </nav>
          ) : (
            <h1 className="text-base font-semibold text-slate-200">{getTitle()}</h1>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-3">
          {/* Search */}
          <button
            onClick={() => setCommandOpen(true)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-sm text-slate-500 hover:text-slate-400 transition-colors"
            style={{ background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)' }}
          >
            <Search className="w-3.5 h-3.5" />
            <span>Search...</span>
            <div className="flex items-center gap-0.5 ml-2">
              <kbd className="text-xs bg-white/10 px-1 py-0.5 rounded">⌘</kbd>
              <kbd className="text-xs bg-white/10 px-1 py-0.5 rounded">K</kbd>
            </div>
          </button>

          {/* Notifications */}
          <button className="relative p-2 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-white/[0.04] transition-colors">
            <Bell className="w-4 h-4" />
            <span className="absolute top-1 right-1 w-2 h-2 bg-indigo-500 rounded-full" />
          </button>

          {/* Create */}
          <Button
            size="sm"
            onClick={() => setCommandOpen(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-sm gap-1.5"
          >
            <Plus className="w-4 h-4" />
            Create
          </Button>
        </div>
      </header>

      <CommandPalette open={commandOpen} onOpenChange={setCommandOpen} />
    </>
  )
}
