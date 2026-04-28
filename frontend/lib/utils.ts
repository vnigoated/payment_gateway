import { type ClassValue, clsx } from 'clsx'
import { format, parseISO } from 'date-fns'

export function cn(...inputs: ClassValue[]) {
  return clsx(inputs)
}

export function formatCurrency(amount: number, currency = 'INR') {
  return new Intl.NumberFormat('en-IN', { style: 'currency', currency, maximumFractionDigits: 2 }).format(amount)
}

export function formatDate(dateStr: string) {
  try { return format(parseISO(dateStr), 'dd MMM yyyy') } catch { return dateStr }
}

export function formatDateTime(dateStr: string) {
  try { return format(parseISO(dateStr), 'dd MMM yyyy, h:mm a') } catch { return dateStr }
}

export const STATUS_COLORS: Record<string, string> = {
  draft:     'bg-slate-100 text-slate-600',
  sent:      'bg-blue-100 text-blue-700',
  pending:   'bg-yellow-100 text-yellow-700',
  paid:      'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-600',
  overdue:   'bg-orange-100 text-orange-700',
  submitted: 'bg-purple-100 text-purple-700',
  confirmed: 'bg-green-100 text-green-700',
  rejected:  'bg-red-100 text-red-600',
}

export const PLAN_COLORS: Record<string, string> = {
  free:    'bg-slate-100 text-slate-600',
  starter: 'bg-blue-100 text-blue-700',
  pro:     'bg-purple-100 text-purple-700',
}
