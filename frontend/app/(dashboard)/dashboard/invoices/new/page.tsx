'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ArrowLeft } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface Item { name: string; quantity: number; rate: number }
const emptyItem = (): Item => ({ name: '', quantity: 1, rate: 0 })

const GST_RATES = [0, 5, 12, 18, 28]

export default function NewInvoicePage() {
  const router = useRouter()
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', gstin: '' })
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [gstRate, setGstRate] = useState(18)
  const [discount, setDiscount] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const setItem = (i: number, k: keyof Item, v: string | number) =>
    setItems(prev => prev.map((it, idx) => idx === i ? { ...it, [k]: v } : it))

  const subtotal = items.reduce((s, it) => s + it.quantity * it.rate, 0)
  const afterDiscount = Math.max(subtotal - discount, 0)
  const gstAmount = afterDiscount * gstRate / 100
  const total = afterDiscount + gstAmount

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!customer.name.trim()) { setError('Customer name is required'); return }
    if (items.some(it => !it.name.trim())) { setError('All line items need a name'); return }
    setError('')
    setLoading(true)
    try {
      const inv = await api.createInvoice({
        customer_name: customer.name,
        customer_email: customer.email || null,
        customer_phone: customer.phone || null,
        customer_address: customer.address || null,
        customer_gstin: customer.gstin || null,
        line_items: items,
        gst_rate: gstRate,
        discount,
        due_date: dueDate || null,
        notes: notes || null,
      })
      router.push(`/dashboard/invoices/${inv.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invoices" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
      </div>

      <form onSubmit={submit} className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          {/* Customer Details */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Customer Details</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              {([
                ['name',    'Customer / Company Name *', 'text',  'Acme Corp'],
                ['email',   'Email',                     'email', 'billing@acme.com'],
                ['phone',   'Phone',                     'tel',   '+91 98765 43210'],
                ['gstin',   'GSTIN (optional)',           'text',  '29AABCU9603R1ZX'],
              ] as [keyof typeof customer, string, string, string][]).map(([k, label, type, ph]) => (
                <div key={k} className={k === 'address' ? 'sm:col-span-2' : ''}>
                  <label className="block text-sm text-slate-500 mb-1.5">{label}</label>
                  <input
                    type={type}
                    value={customer[k]}
                    onChange={e => setCustomer(p => ({ ...p, [k]: e.target.value }))}
                    placeholder={ph}
                    className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:border-brand-400 transition-colors"
                  />
                </div>
              ))}
              <div className="sm:col-span-2">
                <label className="block text-sm text-slate-500 mb-1.5">Billing Address</label>
                <textarea
                  value={customer.address}
                  onChange={e => setCustomer(p => ({ ...p, address: e.target.value }))}
                  placeholder="123 Main St, Mumbai, MH 400001"
                  rows={2}
                  className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:border-brand-400 transition-colors resize-none"
                />
              </div>
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-4">Line Items</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 text-xs text-slate-400 uppercase tracking-wide px-1">
                <span className="col-span-5">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-3 text-right">Rate (₹)</span>
                <span className="col-span-2 text-right">Amount</span>
              </div>
              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 gap-2 items-center">
                  <input
                    className="col-span-5 border border-slate-200 rounded-lg px-3 py-2 text-sm focus:border-brand-400 transition-colors"
                    placeholder="Web Design"
                    value={item.name}
                    onChange={e => setItem(i, 'name', e.target.value)}
                  />
                  <input
                    className="col-span-2 border border-slate-200 rounded-lg px-3 py-2 text-sm text-right focus:border-brand-400 transition-colors"
                    type="number" min="0.01" step="any"
                    value={item.quantity}
                    onChange={e => setItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                  <input
                    className="col-span-3 border border-slate-200 rounded-lg px-3 py-2 text-sm text-right focus:border-brand-400 transition-colors"
                    type="number" min="0" step="any"
                    value={item.rate}
                    onChange={e => setItem(i, 'rate', parseFloat(e.target.value) || 0)}
                  />
                  <div className="col-span-1 text-sm font-medium text-right text-slate-700">
                    {(item.quantity * item.rate).toLocaleString('en-IN')}
                  </div>
                  <button type="button" onClick={() => setItems(p => p.filter((_, idx) => idx !== i))}
                    disabled={items.length === 1}
                    className="col-span-1 flex justify-center text-slate-300 hover:text-red-400 disabled:opacity-0 transition-colors">
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>
            <button type="button" onClick={() => setItems(p => [...p, emptyItem()])}
              className="mt-3 flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
              <Plus size={15} /> Add item
            </button>
          </div>
        </div>

        {/* Right column: settings + summary */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5 space-y-4">
            <h2 className="font-semibold text-slate-900">Invoice Settings</h2>
            <div>
              <label className="block text-sm text-slate-500 mb-1.5">GST Rate</label>
              <select
                value={gstRate}
                onChange={e => setGstRate(Number(e.target.value))}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:border-brand-400 bg-white">
                {GST_RATES.map(r => <option key={r} value={r}>{r}%</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1.5">Discount (₹)</label>
              <input type="number" min="0" step="any" value={discount || ''}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:border-brand-400 transition-colors"
                placeholder="0" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1.5">Due Date</label>
              <input type="date" value={dueDate} onChange={e => setDueDate(e.target.value)}
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:border-brand-400 transition-colors" />
            </div>
            <div>
              <label className="block text-sm text-slate-500 mb-1.5">Notes</label>
              <textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Payment terms, bank details…"
                className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:border-brand-400 transition-colors resize-none" />
            </div>
          </div>

          {/* Summary */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span><span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>− {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST ({gstRate}%)</span><span>{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-100">
                <span>Total</span><span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {error && <p className="text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg p-3">{error}</p>}

          <button type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-3 rounded-xl text-sm transition-colors">
            {loading ? 'Creating…' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
