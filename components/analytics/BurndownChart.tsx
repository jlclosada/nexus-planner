'use client'

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'

interface BurndownChartProps {
  data: Array<{ date: string; remaining: number; ideal: number }>
}

export function BurndownChart({ data }: BurndownChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No burndown data available for this sprint
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={240}>
      <LineChart data={data} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
        <XAxis
          dataKey="date"
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
          labelStyle={{ color: '#94a3b8' }}
        />
        <Legend
          wrapperStyle={{ fontSize: '12px', color: '#94a3b8' }}
        />
        <Line
          type="monotone"
          dataKey="remaining"
          stroke="#6366f1"
          strokeWidth={2}
          dot={false}
          name="Remaining"
        />
        <Line
          type="monotone"
          dataKey="ideal"
          stroke="#475569"
          strokeWidth={1.5}
          strokeDasharray="5 5"
          dot={false}
          name="Ideal"
        />
      </LineChart>
    </ResponsiveContainer>
  )
}
