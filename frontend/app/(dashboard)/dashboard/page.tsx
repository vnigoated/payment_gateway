'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, IndianRupee, Clock, CheckCircle2, Plus, ArrowRight } from 'lucide-react'
import { api } from '@/lib/api'
import { useAuth } from '@/hooks/useAuth'
import { StatsCard } from '@/components/stats-card'
import { StatusBadge } from '@/components/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

export default function DashboardPage() {
  const { user } = useAuth()
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    api.listInvoices().then(setInvoices).catch(() => {}).finally(() => setLoading(false))
  }, [])

  const revenue  = invoices.filter(i => i.status === 'paid').reduce((s, i) => s + i.total, 0)
  const pending  = invoices.filter(i => ['sent', 'pending'].includes(i.status)).length
  const paid     = invoices.filter(i => i.status === 'paid').length
  const recent   = [...invoices].sort((a, b) => b.created_at.localeCompare(a.created_at)).slice(0, 5)

  return (
    <div className="max-w-5xl">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            {user ? `Welcome, ${user.name.split(' ')[0]}` : 'Dashboard'}
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            {user?.plan === 'free'
              ? `Free plan · ${user.invoice_count_this_month}/5 invoices used this month`
              : `${user?.plan} plan`}
          </p>
        </div>
        <Link href="/dashboard/invoices/new"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <StatsCard title="Total Invoices" value={invoices.length} icon={<FileText size={20} />} />
        <StatsCard title="Revenue" value={formatCurrency(revenue)} icon={<IndianRupee size={20} />} color="text-green-600" />
        <StatsCard title="Awaiting Payment" value={pending} icon={<Clock size={20} />} color="text-yellow-600" />
        <StatsCard title="Paid" value={paid} icon={<CheckCircle2 size={20} />} color="text-green-600" />
      </div>

      {/* Recent Invoices */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Recent Invoices</h2>
          <Link href="/dashboard/invoices" className="text-sm text-brand-600 hover:text-brand-700 flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>

        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : recent.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">No invoices yet</p>
            <p className="text-slate-400 text-sm mt-1">Create your first invoice to get started</p>
            <Link href="/dashboard/invoices/new"
              className="mt-4 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Plus size={14} /> Create Invoice
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                <th className="px-5 py-3 font-medium">Invoice</th>
                <th className="px-5 py-3 font-medium">Customer</th>
                <th className="px-5 py-3 font-medium">Amount</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {recent.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="font-medium text-brand-600 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">{inv.customer_name}</td>
                  <td className="px-5 py-3.5 font-semibold text-slate-900">{formatCurrency(inv.total)}</td>
                  <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3.5 text-slate-400">{formatDate(inv.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
