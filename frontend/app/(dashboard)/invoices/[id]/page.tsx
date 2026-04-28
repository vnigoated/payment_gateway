'use client'
import { useEffect, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import { ArrowLeft, Send, CheckCircle2, XCircle, Copy, ExternalLink, Trash2 } from 'lucide-react'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { Invoice, Payment } from '@/lib/types'

export default function InvoiceDetailPage() {
  const { id } = useParams<{ id: string }>()
  const router = useRouter()
  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.getInvoice(id), api.listPayments(id)])
      .then(([inv, pmts]) => { setInvoice(inv); setPayments(pmts) })
      .catch(() => router.push('/dashboard/invoices'))
      .finally(() => setLoading(false))
  }, [id, router])

  const handleSend = async () => {
    setActionLoading('send'); setError('')
    try {
      const res = await api.sendInvoice(id)
      setPaymentUrl(res.payment_url)
      setInvoice(p => p ? { ...p, status: 'sent' } : p)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setActionLoading('') }
  }

  const handleConfirm = async () => {
    setActionLoading('confirm'); setError('')
    try {
      await api.confirmPayment(id)
      setInvoice(p => p ? { ...p, status: 'paid' } : p)
      const pmts = await api.listPayments(id); setPayments(pmts)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setActionLoading('') }
  }

  const handleReject = async () => {
    const reason = prompt('Reason for rejection (shown to customer):')
    if (!reason) return
    setActionLoading('reject'); setError('')
    try {
      await api.rejectPayment(id, reason)
      const pmts = await api.listPayments(id); setPayments(pmts)
      setInvoice(p => p ? { ...p, status: 'sent' } : p)
    } catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed') }
    finally { setActionLoading('') }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this invoice? This cannot be undone.')) return
    setActionLoading('cancel')
    try { await api.cancelInvoice(id); router.push('/dashboard/invoices') }
    catch (e: unknown) { setError(e instanceof Error ? e.message : 'Failed'); setActionLoading('') }
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const pendingPayment = payments.find(p => p.status === 'submitted')

  if (loading) return (
    <div className="flex justify-center py-24">
      <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
    </div>
  )
  if (!invoice) return null

  const payUrl = paymentUrl || `${process.env.NEXT_PUBLIC_API_URL}/pay/${id}`

  return (
    <div className="max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard/invoices" className="text-slate-400 hover:text-slate-600">
          <ArrowLeft size={20} />
        </Link>
        <div className="flex-1">
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</h1>
            <StatusBadge status={invoice.status} />
          </div>
          <p className="text-slate-500 text-sm mt-0.5">Created {formatDateTime(invoice.created_at)}</p>
        </div>
        {/* Actions */}
        <div className="flex items-center gap-2">
          {invoice.status === 'draft' && (
            <button onClick={handleSend} disabled={actionLoading === 'send'}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
              <Send size={14} /> {actionLoading === 'send' ? 'Sending…' : 'Send Invoice'}
            </button>
          )}
          {pendingPayment && (
            <>
              <button onClick={handleConfirm} disabled={actionLoading === 'confirm'}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <CheckCircle2 size={14} /> {actionLoading === 'confirm' ? 'Confirming…' : 'Confirm Payment'}
              </button>
              <button onClick={handleReject} disabled={actionLoading === 'reject'}
                className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors">
                <XCircle size={14} /> Reject
              </button>
            </>
          )}
          {!['paid', 'cancelled'].includes(invoice.status) && (
            <button onClick={handleCancel} disabled={actionLoading === 'cancel'}
              className="text-slate-400 hover:text-red-500 transition-colors p-2 rounded-lg hover:bg-red-50">
              <Trash2 size={16} />
            </button>
          )}
        </div>
      </div>

      {error && <p className="mb-4 text-red-500 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">{error}</p>}

      {/* Payment URL banner */}
      {['sent', 'pending'].includes(invoice.status) && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4 flex items-center gap-3">
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-blue-900">Payment link ready — share with customer</p>
            <p className="text-xs text-blue-700 mt-0.5 truncate font-mono">{payUrl}</p>
          </div>
          <button onClick={() => copy(payUrl)}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors">
            <Copy size={13} /> {copied ? 'Copied!' : 'Copy'}
          </button>
          <a href={payUrl} target="_blank" rel="noreferrer"
            className="flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap hover:bg-blue-50 transition-colors">
            <ExternalLink size={13} /> Preview
          </a>
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Customer</h2>
            <div className="grid sm:grid-cols-2 gap-y-2 text-sm">
              {[
                ['Name',    invoice.customer_name],
                ['Email',   invoice.customer_email],
                ['Phone',   invoice.customer_phone],
                ['GSTIN',   invoice.customer_gstin],
                ['Address', invoice.customer_address],
              ].filter(([, v]) => v).map(([k, v]) => (
                <div key={k as string} className={k === 'Address' ? 'sm:col-span-2' : ''}>
                  <span className="text-slate-400">{k}: </span>
                  <span className="text-slate-700">{v}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Line Items */}
          <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs text-slate-400 uppercase tracking-wide">
                  <th className="px-5 py-3">Description</th>
                  <th className="px-5 py-3 text-right">Qty</th>
                  <th className="px-5 py-3 text-right">Rate</th>
                  <th className="px-5 py-3 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {invoice.line_items.map((item, i) => (
                  <tr key={i}>
                    <td className="px-5 py-3.5 font-medium text-slate-800">{item.name}</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{item.quantity}</td>
                    <td className="px-5 py-3.5 text-right text-slate-600">{formatCurrency(item.rate)}</td>
                    <td className="px-5 py-3.5 text-right font-semibold">{formatCurrency(item.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Payments */}
          {payments.length > 0 && (
            <div className="bg-white rounded-xl border border-slate-200 p-5">
              <h2 className="font-semibold text-slate-900 mb-3">Payment Attempts</h2>
              <div className="space-y-2">
                {payments.map(p => (
                  <div key={p.id} className="flex items-start justify-between text-sm bg-slate-50 rounded-lg px-4 py-3">
                    <div>
                      <p className="font-medium text-slate-800">UTR: {p.utr ?? '—'}</p>
                      {p.customer_note && <p className="text-slate-500 text-xs mt-0.5">{p.customer_note}</p>}
                      {p.rejection_reason && <p className="text-red-500 text-xs mt-0.5">Rejected: {p.rejection_reason}</p>}
                    </div>
                    <div className="text-right">
                      <StatusBadge status={p.status} />
                      <p className="text-xs text-slate-400 mt-1">{formatDateTime(p.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Totals */}
        <div className="space-y-5">
          <div className="bg-white rounded-xl border border-slate-200 p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span><span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span><span>− {formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST ({invoice.gst_rate}%)</span><span>{formatCurrency(invoice.gst_amount)}</span>
              </div>
              <div className="flex justify-between font-bold text-slate-900 text-base pt-2 border-t border-slate-100">
                <span>Total</span><span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>
          {invoice.due_date && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm">
              <span className="text-slate-400">Due date: </span>
              <span className="font-medium">{formatDate(invoice.due_date)}</span>
            </div>
          )}
          {invoice.notes && (
            <div className="bg-white rounded-xl border border-slate-200 p-5 text-sm">
              <p className="text-slate-400 mb-1">Notes</p>
              <p className="text-slate-700">{invoice.notes}</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
