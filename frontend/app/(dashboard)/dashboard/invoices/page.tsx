'use client'
import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Plus, FileText, Search } from 'lucide-react'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { formatCurrency, formatDate } from '@/lib/utils'
import type { Invoice } from '@/lib/types'

const TABS: { label: string; value: string }[] = [
  { label: 'All',       value: '' },
  { label: 'Draft',     value: 'draft' },
  { label: 'Sent',      value: 'sent' },
  { label: 'Paid',      value: 'paid' },
  { label: 'Cancelled', value: 'cancelled' },
]

export default function InvoicesPage() {
  const [invoices, setInvoices] = useState<Invoice[]>([])
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('')
  const [search, setSearch] = useState('')

  const load = (status: string) => {
    setLoading(true)
    api.listInvoices(status || undefined)
      .then(setInvoices)
      .catch(() => setInvoices([]))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load(tab) }, [tab])

  const visible = search
    ? invoices.filter(i =>
        i.invoice_number.toLowerCase().includes(search.toLowerCase()) ||
        i.customer_name.toLowerCase().includes(search.toLowerCase()))
    : invoices

  return (
    <div className="max-w-5xl">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Invoices</h1>
        <Link href="/dashboard/invoices/new"
          className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-semibold px-4 py-2.5 rounded-xl transition-colors">
          <Plus size={16} /> New Invoice
        </Link>
      </div>

      <div className="bg-white rounded-xl border border-slate-200">
        {/* Toolbar */}
        <div className="flex items-center gap-4 px-5 py-3.5 border-b border-slate-100">
          {/* Tabs */}
          <div className="flex items-center gap-1">
            {TABS.map(t => (
              <button key={t.value} onClick={() => setTab(t.value)}
                className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${tab === t.value ? 'bg-brand-600 text-white' : 'text-slate-500 hover:bg-slate-100'}`}>
                {t.label}
              </button>
            ))}
          </div>
          {/* Search */}
          <div className="ml-auto relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search invoices…"
              className="pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg focus:border-brand-400 transition-colors w-52"
            />
          </div>
        </div>

        {/* Table */}
        {loading ? (
          <div className="py-12 flex justify-center">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : visible.length === 0 ? (
          <div className="py-16 text-center">
            <FileText size={36} className="mx-auto text-slate-300 mb-3" />
            <p className="text-slate-500 font-medium">{search ? 'No invoices match your search' : 'No invoices yet'}</p>
            {!search && (
              <Link href="/dashboard/invoices/new"
                className="mt-4 inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <Plus size={14} /> Create your first invoice
              </Link>
            )}
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs text-slate-400 uppercase tracking-wide border-b border-slate-100">
                {['Invoice #', 'Customer', 'Amount', 'GST', 'Status', 'Date', ''].map(h => (
                  <th key={h} className="px-5 py-3 font-medium">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {visible.map(inv => (
                <tr key={inv.id} className="hover:bg-slate-50 transition-colors group">
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/invoices/${inv.id}`} className="font-semibold text-brand-600 hover:underline">
                      {inv.invoice_number}
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-slate-700">
                    <div>{inv.customer_name}</div>
                    {inv.customer_email && <div className="text-xs text-slate-400">{inv.customer_email}</div>}
                  </td>
                  <td className="px-5 py-3.5 font-semibold">{formatCurrency(inv.total)}</td>
                  <td className="px-5 py-3.5 text-slate-500">{inv.gst_rate}%</td>
                  <td className="px-5 py-3.5"><StatusBadge status={inv.status} /></td>
                  <td className="px-5 py-3.5 text-slate-400">{formatDate(inv.created_at)}</td>
                  <td className="px-5 py-3.5">
                    <Link href={`/dashboard/invoices/${inv.id}`}
                      className="text-xs text-brand-600 opacity-0 group-hover:opacity-100 transition-opacity">
                      View →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
