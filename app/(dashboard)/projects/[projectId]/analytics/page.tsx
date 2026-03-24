'use client'

import { use } from 'react'
import { useQuery } from '@tanstack/react-query'
import { motion } from 'framer-motion'
import { BarChart3, TrendingUp, Clock, Zap } from 'lucide-react'
import { BurndownChart } from '@/components/analytics/BurndownChart'
import { VelocityChart } from '@/components/analytics/VelocityChart'
import { FlowChart } from '@/components/analytics/FlowChart'

interface AnalyticsData {
  velocity: Array<{ sprint: string; points: number }>
  burndown: Array<{ date: string; remaining: number; ideal: number }>
  distribution: Array<{ status: string; count: number }>
  cycleTime: Array<{ status: string; avgDays: number }>
  avgCycleTime: number
  recentActivity: number
}

function ChartCard({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-xl p-5"
      style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-4 h-4 text-indigo-400" />
        <h3 className="text-sm font-semibold text-slate-200">{title}</h3>
      </div>
      {children}
    </motion.div>
  )
}

export default function AnalyticsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params)

  const { data: analytics, isLoading } = useQuery<AnalyticsData>({
    queryKey: ['analytics', projectId],
    queryFn: () => fetch(`/api/analytics/${projectId}`).then((r) => r.json()),
  })

  if (isLoading) {
    return (
      <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="h-64 rounded-xl shimmer"
            style={{ background: 'rgba(19,19,31,0.8)' }}
          />
        ))}
      </div>
    )
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-200">Analytics</h2>
        <p className="text-sm text-slate-500 mt-0.5">Project performance insights</p>
      </div>

      {/* Summary stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs text-slate-500">Avg Velocity</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">
            {analytics?.velocity?.length
              ? Math.round(analytics.velocity.reduce((s, v) => s + v.points, 0) / analytics.velocity.length)
              : 0}
            <span className="text-sm text-slate-500 font-normal ml-1">pts</span>
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs text-slate-500">Avg Cycle Time</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">
            {analytics?.avgCycleTime ?? 0}
            <span className="text-sm text-slate-500 font-normal ml-1">days</span>
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs text-slate-500">Total Done</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">
            {analytics?.distribution?.find((d) => d.status === 'DONE')?.count ?? 0}
            <span className="text-sm text-slate-500 font-normal ml-1">tickets</span>
          </p>
        </div>
        <div
          className="rounded-xl p-4"
          style={{ background: 'rgba(19,19,31,0.8)', border: '1px solid rgba(255,255,255,0.06)' }}
        >
          <p className="text-xs text-slate-500">Recent Activity</p>
          <p className="text-2xl font-bold text-slate-100 mt-1">
            {analytics?.recentActivity ?? 0}
            <span className="text-sm text-slate-500 font-normal ml-1">tickets/7d</span>
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ChartCard title="Sprint Burndown" icon={TrendingUp}>
          <BurndownChart data={analytics?.burndown ?? []} />
        </ChartCard>

        <ChartCard title="Team Velocity" icon={Zap}>
          <VelocityChart data={analytics?.velocity ?? []} />
        </ChartCard>

        <ChartCard title="Ticket Distribution" icon={BarChart3}>
          <FlowChart data={analytics?.distribution ?? []} />
        </ChartCard>

        <ChartCard title="Cycle Time" icon={Clock}>
          <div className="space-y-3">
            {analytics?.cycleTime && analytics.cycleTime.length > 0 ? (
              analytics.cycleTime.map((item) => (
                <div key={item.status} className="flex items-center justify-between">
                  <span className="text-sm text-slate-400">{item.status.replace('_', ' ')}</span>
                  <div className="flex items-center gap-2">
                    <div className="w-32 h-2 bg-white/5 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{ width: `${Math.min(100, (item.avgDays / 14) * 100)}%` }}
                      />
                    </div>
                    <span className="text-xs text-slate-500 w-16 text-right">
                      {item.avgDays} days
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="flex items-center justify-center h-32 text-slate-600 text-sm">
                No completed tickets yet
              </div>
            )}
          </div>
        </ChartCard>
      </div>
    </div>
  )
}
