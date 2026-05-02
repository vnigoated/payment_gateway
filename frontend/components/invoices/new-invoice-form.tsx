'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Plus, Trash2, ArrowLeft, ScanSearch, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { formatCurrency } from '@/lib/utils'

interface Item {
  name: string
  quantity: number
  rate: number
}

const emptyItem = (): Item => ({ name: '', quantity: 1, rate: 0 })
const GST_RATES = [0, 5, 12, 18, 28]

export function NewInvoiceForm() {
  const router = useRouter()
  const [customer, setCustomer] = useState({ name: '', email: '', phone: '', address: '', gstin: '' })
  const [items, setItems] = useState<Item[]>([emptyItem()])
  const [gstRate, setGstRate] = useState(18)
  const [discount, setDiscount] = useState(0)
  const [dueDate, setDueDate] = useState('')
  const [notes, setNotes] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [scanning, setScanning] = useState(false)

  const onScan = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    setScanning(true)
    setError('')

    try {
      const data = await api.scanInvoice(file)

      setCustomer(prev => ({
        name: data.customer_name || prev.name,
        email: data.customer_email || prev.email,
        phone: data.customer_phone || prev.phone,
        address: data.customer_address || prev.address,
        gstin: data.customer_gstin || prev.gstin,
      }))

      if (Array.isArray(data.line_items) && data.line_items.length > 0) {
        setItems(
          data.line_items.map(item => ({
            name: item.name || '',
            quantity: Number(item.quantity) || 1,
            rate: Number(item.rate) || 0,
          })),
        )
      }

      if (typeof data.gst_rate === 'number' && GST_RATES.includes(data.gst_rate)) {
        setGstRate(data.gst_rate)
      }

      if (typeof data.discount === 'number') {
        setDiscount(data.discount)
      }

      if (data.due_date) {
        setDueDate(data.due_date)
      }

      if (data.notes) {
        setNotes(data.notes)
      }
    } catch (err: unknown) {
      setError(`AI scanning failed: ${err instanceof Error ? err.message : 'Unknown error'}`)
    } finally {
      setScanning(false)
      e.target.value = ''
    }
  }

  const setItem = (i: number, k: keyof Item, v: string | number) =>
    setItems(prev => prev.map((it, idx) => (idx === i ? { ...it, [k]: v } : it)))

  const subtotal = items.reduce((sum, item) => sum + item.quantity * item.rate, 0)
  const afterDiscount = Math.max(subtotal - discount, 0)
  const gstAmount = (afterDiscount * gstRate) / 100
  const total = afterDiscount + gstAmount

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!customer.name.trim()) {
      setError('Customer name is required')
      return
    }

    if (items.some(item => !item.name.trim())) {
      setError('All line items need a name')
      return
    }

    setError('')
    setLoading(true)

    try {
      const invoice = await api.createInvoice({
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

      router.push(`/dashboard/invoices/${invoice.id}`)
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create invoice')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="max-w-4xl">
      <div className="mb-6 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard/invoices" className="text-slate-400 hover:text-slate-600">
            <ArrowLeft size={20} />
          </Link>
          <h1 className="text-2xl font-bold text-slate-900">New Invoice</h1>
        </div>

        <label
          className={`inline-flex items-center justify-center gap-2 rounded-xl bg-blue-600 px-5 py-2.5 text-sm font-semibold text-white shadow-md transition-all hover:bg-blue-700 active:scale-95 ${
            scanning ? 'cursor-not-allowed opacity-70' : 'cursor-pointer'
          }`}
        >
          {scanning ? <Loader2 className="animate-spin" size={18} /> : <ScanSearch size={18} />}
          {scanning ? 'Analyzing...' : 'Scan & Auto-fill'}
          <input
            type="file"
            className="hidden"
            accept="image/*,application/pdf"
            onChange={onScan}
            disabled={scanning}
          />
        </label>
      </div>

      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-5 lg:col-span-2">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Customer Details</h2>
            <div className="grid gap-4 sm:grid-cols-2">
              {([
                ['name', 'Customer / Company Name *', 'text', 'Acme Corp'],
                ['email', 'Email', 'email', 'billing@acme.com'],
                ['phone', 'Phone', 'tel', '+91 98765 43210'],
                ['gstin', 'GSTIN (optional)', 'text', '29AABCU9603R1ZX'],
              ] as [keyof typeof customer, string, string, string][]).map(([k, label, type, ph]) => (
                <div key={k}>
                  <label className="mb-1.5 block text-sm text-slate-500">{label}</label>
                  <input
                    type={type}
                    value={customer[k]}
                    onChange={e => setCustomer(prev => ({ ...prev, [k]: e.target.value }))}
                    placeholder={ph}
                    className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm transition-colors focus:border-brand-400"
                  />
                </div>
              ))}

              <div className="sm:col-span-2">
                <label className="mb-1.5 block text-sm text-slate-500">Billing Address</label>
                <textarea
                  value={customer.address}
                  onChange={e => setCustomer(prev => ({ ...prev, address: e.target.value }))}
                  placeholder="123 Main St, Mumbai, MH 400001"
                  rows={2}
                  className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2 text-sm transition-colors focus:border-brand-400"
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-4 font-semibold text-slate-900">Line Items</h2>
            <div className="space-y-2">
              <div className="grid grid-cols-12 gap-2 px-1 text-xs uppercase tracking-wide text-slate-400">
                <span className="col-span-5">Description</span>
                <span className="col-span-2 text-right">Qty</span>
                <span className="col-span-3 text-right">Rate (Rs)</span>
                <span className="col-span-2 text-right">Amount</span>
              </div>

              {items.map((item, i) => (
                <div key={i} className="grid grid-cols-12 items-center gap-2">
                  <input
                    className="col-span-5 rounded-lg border border-slate-200 px-3 py-2 text-sm transition-colors focus:border-brand-400"
                    placeholder="Web Design"
                    value={item.name}
                    onChange={e => setItem(i, 'name', e.target.value)}
                  />
                  <input
                    className="col-span-2 rounded-lg border border-slate-200 px-3 py-2 text-right text-sm transition-colors focus:border-brand-400"
                    type="number"
                    min="0.01"
                    step="any"
                    value={item.quantity}
                    onChange={e => setItem(i, 'quantity', parseFloat(e.target.value) || 0)}
                  />
                  <input
                    className="col-span-3 rounded-lg border border-slate-200 px-3 py-2 text-right text-sm transition-colors focus:border-brand-400"
                    type="number"
                    min="0"
                    step="any"
                    value={item.rate}
                    onChange={e => setItem(i, 'rate', parseFloat(e.target.value) || 0)}
                  />
                  <div className="col-span-1 text-right text-sm font-medium text-slate-700">
                    {(item.quantity * item.rate).toLocaleString('en-IN')}
                  </div>
                  <button
                    type="button"
                    onClick={() => setItems(prev => prev.filter((_, idx) => idx !== i))}
                    disabled={items.length === 1}
                    className="col-span-1 flex justify-center text-slate-300 transition-colors hover:text-red-400 disabled:opacity-0"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              ))}
            </div>

            <button
              type="button"
              onClick={() => setItems(prev => [...prev, emptyItem()])}
              className="mt-3 flex items-center gap-1.5 text-sm font-medium text-brand-600 hover:text-brand-700"
            >
              <Plus size={15} /> Add item
            </button>
          </div>
        </div>

        <div className="space-y-5">
          <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900">Invoice Settings</h2>
            <div>
              <label className="mb-1.5 block text-sm text-slate-500">GST Rate</label>
              <select
                value={gstRate}
                onChange={e => setGstRate(Number(e.target.value))}
                className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm focus:border-brand-400"
              >
                {GST_RATES.map(rate => (
                  <option key={rate} value={rate}>
                    {rate}%
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-500">Discount (Rs)</label>
              <input
                type="number"
                min="0"
                step="any"
                value={discount || ''}
                onChange={e => setDiscount(parseFloat(e.target.value) || 0)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm transition-colors focus:border-brand-400"
                placeholder="0"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-500">Due Date</label>
              <input
                type="date"
                value={dueDate}
                onChange={e => setDueDate(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-3.5 py-2 text-sm transition-colors focus:border-brand-400"
              />
            </div>
            <div>
              <label className="mb-1.5 block text-sm text-slate-500">Notes</label>
              <textarea
                value={notes}
                onChange={e => setNotes(e.target.value)}
                rows={2}
                placeholder="Payment terms, bank details..."
                className="w-full resize-none rounded-lg border border-slate-200 px-3.5 py-2 text-sm transition-colors focus:border-brand-400"
              />
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="mb-3 font-semibold text-slate-900">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- {formatCurrency(discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST ({gstRate}%)</span>
                <span>{formatCurrency(gstAmount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>

          {error && <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-500">{error}</p>}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-xl bg-brand-600 py-3 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:opacity-50"
          >
            {loading ? 'Creating...' : 'Create Invoice'}
          </button>
        </div>
      </form>
    </div>
  )
}
