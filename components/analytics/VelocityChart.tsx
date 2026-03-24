'use client'

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts'

interface VelocityChartProps {
  data: Array<{ sprint: string; points: number }>
}

export function VelocityChart({ data }: VelocityChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        Complete at least one sprint to see velocity
      </div>
    )
  }

  const avg = data.length > 0 ? Math.round(data.reduce((s, d) => s + d.points, 0) / data.length) : 0

  return (
    <div>
      <div className="flex items-center gap-3 mb-3">
        <div className="text-xs text-slate-500">
          Avg velocity: <span className="text-indigo-400 font-semibold">{avg} pts/sprint</span>
        </div>
      </div>
      <ResponsiveContainer width="100%" height={200}>
        <BarChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
          <XAxis
            dataKey="sprint"
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <YAxis
            tick={{ fill: '#64748b', fontSize: 11 }}
            axisLine={{ stroke: 'rgba(255,255,255,0.06)' }}
            tickLine={false}
          />
          <Tooltip
            contentStyle={{
              background: '#1a1a2e',
              border: '1px solid rgba(255,255,255,0.1)',
              borderRadius: '8px',
              color: '#f1f5f9',
            }}
            cursor={{ fill: 'rgba(99,102,241,0.08)' }}
          />
          <Bar dataKey="points" fill="#6366f1" radius={[4, 4, 0, 0]} name="Story Points" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
