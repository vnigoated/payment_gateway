import { cn } from '@/lib/utils'
import type { ReactNode } from 'react'

interface Props {
  title: string
  value: string | number
  sub?: string
  icon: ReactNode
  color?: string
}

export function StatsCard({ title, value, sub, icon, color = 'text-brand-600' }: Props) {
  return (
    <div className="bg-white rounded-xl border border-slate-200 p-5 flex items-start gap-4">
      <div className={cn('p-2.5 rounded-lg bg-slate-50', color)}>{icon}</div>
      <div className="min-w-0">
        <p className="text-sm text-slate-500">{title}</p>
        <p className="text-2xl font-bold text-slate-900 mt-0.5">{value}</p>
        {sub && <p className="text-xs text-slate-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}
