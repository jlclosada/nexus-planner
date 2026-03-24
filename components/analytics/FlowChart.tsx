'use client'

import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts'
import { getStatusColor } from '@/lib/utils'

interface FlowChartProps {
  data: Array<{ status: string; count: number }>
}

export function FlowChart({ data }: FlowChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-slate-600 text-sm">
        No ticket data available
      </div>
    )
  }

  const chartData = data.map((d) => ({
    name: d.status.replace('_', ' '),
    value: d.count,
    color: getStatusColor(d.status),
  }))

  return (
    <ResponsiveContainer width="100%" height={200}>
      <PieChart>
        <Pie
          data={chartData}
          cx="50%"
          cy="50%"
          innerRadius={50}
          outerRadius={80}
          paddingAngle={2}
          dataKey="value"
        >
          {chartData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.color} />
          ))}
        </Pie>
        <Tooltip
          contentStyle={{
            background: '#1a1a2e',
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '8px',
            color: '#f1f5f9',
          }}
        />
        <Legend
          formatter={(value) => <span style={{ color: '#94a3b8', fontSize: '11px' }}>{value}</span>}
        />
      </PieChart>
    </ResponsiveContainer>
  )
}
