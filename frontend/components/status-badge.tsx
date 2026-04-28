import { cn, STATUS_COLORS } from '@/lib/utils'

export function StatusBadge({ status }: { status: string }) {
  return (
    <span className={cn('inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold capitalize', STATUS_COLORS[status] ?? 'bg-slate-100 text-slate-600')}>
      {status}
    </span>
  )
}
