'use client'

import { useEffect, useMemo, useState } from 'react'
import { useParams, useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  FileDown,
  RefreshCw,
  Send,
  ShieldAlert,
  Trash2,
  XCircle,
  Clock3,
} from 'lucide-react'
import { api } from '@/lib/api'
import { StatusBadge } from '@/components/status-badge'
import { formatCurrency, formatDate, formatDateTime } from '@/lib/utils'
import type { Invoice, Payment } from '@/lib/types'

const STAGES = [
  { key: 'draft', label: 'Draft', description: 'Created and editable' },
  { key: 'sent', label: 'Sent', description: 'Payment link shared with customer' },
  { key: 'pending', label: 'Pending', description: 'Customer submitted payment proof' },
  { key: 'paid', label: 'Paid', description: 'Payment confirmed and complete' },
] as const

function safeDate(value: string | null | undefined) {
  return value ? formatDateTime(value) : 'Not yet'
}

export default function InvoiceDetailPage() {
  const params = useParams<{ id: string }>()
  const id = params.id
  const router = useRouter()

  const [invoice, setInvoice] = useState<Invoice | null>(null)
  const [payments, setPayments] = useState<Payment[]>([])
  const [loading, setLoading] = useState(true)
  const [actionLoading, setActionLoading] = useState('')
  const [paymentUrl, setPaymentUrl] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const [inv, pmts] = await Promise.all([api.getInvoice(id), api.listPayments(id)])
      setInvoice(inv)
      setPayments(pmts)
    } catch {
      router.push('/dashboard/invoices')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) load()
  }, [id])

  const pendingPayment = useMemo(
    () => payments.find(p => p.status === 'submitted') ?? null,
    [payments],
  )

  const payUrl = paymentUrl || `${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'}/pay/${id}`
  const canManage = invoice && !['paid', 'cancelled'].includes(invoice.status)
  const isResendable = invoice && ['sent', 'pending', 'overdue'].includes(invoice.status)

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleSend = async () => {
    setActionLoading('send')
    setError('')
    try {
      const res = await api.sendInvoice(id)
      setPaymentUrl(res.payment_url)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to send invoice')
    } finally {
      setActionLoading('')
    }
  }

  const handleDownloadPdf = async () => {
    setActionLoading('pdf')
    setError('')
    try {
      const blob = await api.downloadInvoicePdf(id)
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${invoice?.invoice_number || 'invoice'}.pdf`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to download PDF')
    } finally {
      setActionLoading('')
    }
  }

  const handleConfirm = async () => {
    setActionLoading('confirm')
    setError('')
    try {
      await api.confirmPayment(id)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to confirm payment')
    } finally {
      setActionLoading('')
    }
  }

  const handleReject = async () => {
    const reason = prompt('Reason for rejection (shown to customer):')
    if (!reason) return
    setActionLoading('reject')
    setError('')
    try {
      await api.rejectPayment(id, reason)
      await load()
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to reject payment')
    } finally {
      setActionLoading('')
    }
  }

  const handleCancel = async () => {
    if (!confirm('Cancel this invoice? This cannot be undone.')) return
    setActionLoading('cancel')
    setError('')
    try {
      await api.cancelInvoice(id)
      router.push('/dashboard/invoices')
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Failed to cancel invoice')
      setActionLoading('')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!invoice) return null

  const currentIndex = Math.max(0, STAGES.findIndex(stage => stage.key === invoice.status))
  const isCancelled = invoice.status === 'cancelled'
  const isOverdue = invoice.status === 'overdue'

  return (
    <div className="max-w-6xl">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between mb-6">
        <div className="flex items-start gap-3">
          <Link href="/dashboard/invoices" className="mt-1 text-slate-400 hover:text-slate-600">
            <ArrowLeft size={20} />
          </Link>
          <div>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-bold text-slate-900">{invoice.invoice_number}</h1>
              <StatusBadge status={invoice.status} />
            </div>
            <p className="text-slate-500 text-sm mt-1">
              Created {formatDateTime(invoice.created_at)} · Customer {invoice.customer_name}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canManage && (
            <button
              onClick={handleSend}
              disabled={actionLoading === 'send'}
              className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
            >
              {isResendable ? <RefreshCw size={14} /> : <Send size={14} />}
              {actionLoading === 'send' ? 'Sending…' : isResendable ? 'Resend Invoice' : 'Send Invoice'}
            </button>
          )}
          <button
            onClick={handleDownloadPdf}
            disabled={actionLoading === 'pdf'}
            className="inline-flex items-center gap-2 border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
          >
            <FileDown size={14} />
            {actionLoading === 'pdf' ? 'Preparing…' : 'Download PDF'}
          </button>
          {pendingPayment && (
            <>
              <button
                onClick={handleConfirm}
                disabled={actionLoading === 'confirm'}
                className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors"
              >
                <CheckCircle2 size={14} />
                {actionLoading === 'confirm' ? 'Confirming…' : 'Confirm Payment'}
              </button>
              <button
                onClick={handleReject}
                disabled={actionLoading === 'reject'}
                className="inline-flex items-center gap-2 bg-red-50 hover:bg-red-100 text-red-600 text-sm font-medium px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
              >
                <XCircle size={14} />
                Reject
              </button>
            </>
          )}
          {canManage && (
            <button
              onClick={handleCancel}
              disabled={actionLoading === 'cancel'}
              className="inline-flex items-center justify-center border border-red-200 text-red-500 hover:bg-red-50 text-sm font-medium px-3 py-2 rounded-lg transition-colors disabled:opacity-50"
              title="Cancel invoice"
            >
              <Trash2 size={15} />
            </button>
          )}
        </div>
      </div>

      {error && (
        <p className="mb-4 text-red-600 text-sm bg-red-50 border border-red-200 rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      {isCancelled && (
        <div className="mb-5 bg-red-50 border border-red-200 rounded-xl p-4 flex items-start gap-3">
          <ShieldAlert size={18} className="text-red-600 mt-0.5" />
          <div>
            <p className="font-semibold text-red-900">Invoice cancelled</p>
            <p className="text-sm text-red-700 mt-0.5">This invoice can no longer be sent or paid.</p>
          </div>
        </div>
      )}

      {['sent', 'pending', 'overdue'].includes(invoice.status) && (
        <div className="mb-5 bg-blue-50 border border-blue-200 rounded-xl p-4 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div className="min-w-0">
            <p className="text-sm font-medium text-blue-900">Payment link ready</p>
            <p className="text-xs text-blue-700 mt-0.5 truncate font-mono">{payUrl}</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => copy(payUrl)}
              className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              <Copy size={13} />
              {copied ? 'Copied' : 'Copy'}
            </button>
            <a
              href={payUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 bg-white border border-blue-200 text-blue-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-blue-50 transition-colors"
            >
              <ExternalLink size={13} />
              Preview
            </a>
          </div>
        </div>
      )}

      <div className="grid gap-5 xl:grid-cols-3">
        <div className="space-y-5 xl:col-span-2">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Total Due</p>
              <p className="mt-2 text-3xl font-black text-slate-900">{formatCurrency(invoice.total)}</p>
              <p className="mt-1 text-sm text-slate-500">
                Subtotal {formatCurrency(invoice.subtotal)} · GST {formatCurrency(invoice.gst_amount)}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Timeline</p>
              <p className="mt-2 text-3xl font-black text-slate-900">
                {invoice.status === 'paid' ? 'Done' : invoice.status === 'cancelled' ? 'Stopped' : 'In progress'}
              </p>
              <p className="mt-1 text-sm text-slate-500">
                Due {invoice.due_date ? formatDate(invoice.due_date) : 'not set'}
              </p>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <div className="flex items-center justify-between gap-3 mb-4">
              <div>
                <h2 className="font-semibold text-slate-900">Status Timeline</h2>
                <p className="text-sm text-slate-500 mt-0.5">Track where this invoice sits in the payment flow.</p>
              </div>
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <Clock3 size={14} />
                {invoice.status === 'pending' && 'Waiting on merchant review'}
                {invoice.status === 'paid' && 'Payment confirmed'}
                {isOverdue && 'Past due'}
                {invoice.status === 'draft' && 'Not sent yet'}
                {invoice.status === 'sent' && 'Sent to customer'}
              </div>
            </div>

            <div className="space-y-4">
              {STAGES.map((stage, index) => {
                const completed = currentIndex > index || invoice.status === stage.key || (invoice.status === 'paid' && stage.key !== 'draft')
                const active = invoice.status === stage.key || (isOverdue && stage.key === 'sent')
                return (
                  <div key={stage.key} className="flex gap-4">
                    <div className="flex flex-col items-center">
                      <div
                        className={`flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold ${
                          active
                            ? 'bg-brand-600 text-white'
                            : completed
                              ? 'bg-green-100 text-green-700'
                              : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        {index + 1}
                      </div>
                      {index !== STAGES.length - 1 && <div className="h-full w-px bg-slate-200" />}
                    </div>
                    <div className="pb-3">
                      <p className={`font-medium ${active ? 'text-slate-900' : 'text-slate-700'}`}>{stage.label}</p>
                      <p className="text-sm text-slate-500 mt-0.5">{stage.description}</p>
                    </div>
                  </div>
                )
              })}
              {isCancelled && (
                <div className="flex gap-4">
                  <div className="flex flex-col items-center">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-red-100 text-red-700 text-xs font-bold">
                      !
                    </div>
                  </div>
                  <div>
                    <p className="font-medium text-red-700">Cancelled</p>
                    <p className="text-sm text-slate-500 mt-0.5">The invoice was cancelled before payment.</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Customer</h2>
            <div className="grid gap-y-2 text-sm sm:grid-cols-2">
              {[
                ['Name', invoice.customer_name],
                ['Email', invoice.customer_email],
                ['Phone', invoice.customer_phone],
                ['GSTIN', invoice.customer_gstin],
                ['Address', invoice.customer_address],
              ]
                .filter(([, value]) => value)
                .map(([label, value]) => (
                  <div key={label} className={label === 'Address' ? 'sm:col-span-2' : ''}>
                    <span className="text-slate-400">{label}: </span>
                    <span className="text-slate-700">{value}</span>
                  </div>
                ))}
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-900">Line Items</h2>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-400">
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

          {payments.length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-5">
              <div className="flex items-center justify-between gap-3 mb-3">
                <h2 className="font-semibold text-slate-900">Payment Attempts</h2>
                <span className="text-xs text-slate-400">{payments.length} attempt{payments.length === 1 ? '' : 's'}</span>
              </div>

              {pendingPayment && (
                <div className="mb-4 rounded-xl border border-amber-200 bg-amber-50 p-4">
                  <div className="flex items-start gap-3">
                    <CreditCard size={18} className="text-amber-600 mt-0.5" />
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-amber-900">Submitted proof waiting for review</p>
                      <p className="text-sm text-amber-700 mt-1">UTR: <span className="font-mono">{pendingPayment.utr ?? '—'}</span></p>
                      {pendingPayment.customer_note && (
                        <p className="text-sm text-amber-700 mt-1">Note: {pendingPayment.customer_note}</p>
                      )}
                      <p className="text-xs text-amber-600 mt-2">Submitted {safeDate(pendingPayment.created_at)}</p>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={handleConfirm}
                        disabled={actionLoading === 'confirm'}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-green-600 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-green-700 disabled:opacity-50"
                      >
                        <CheckCircle2 size={12} />
                        Confirm
                      </button>
                      <button
                        onClick={handleReject}
                        disabled={actionLoading === 'reject'}
                        className="inline-flex items-center gap-1.5 rounded-lg bg-red-100 px-3 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-200 disabled:opacity-50"
                      >
                        <XCircle size={12} />
                        Reject
                      </button>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                {payments.map(payment => (
                  <div
                    key={payment.id}
                    className="flex items-start justify-between gap-4 rounded-lg bg-slate-50 px-4 py-3 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="font-medium text-slate-800">UTR: {payment.utr ?? '—'}</p>
                      {payment.customer_note && <p className="mt-0.5 text-xs text-slate-500">{payment.customer_note}</p>}
                      {payment.rejection_reason && <p className="mt-0.5 text-xs text-red-500">Rejected: {payment.rejection_reason}</p>}
                    </div>
                    <div className="text-right">
                      <StatusBadge status={payment.status} />
                      <p className="mt-1 text-xs text-slate-400">{formatDateTime(payment.created_at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="space-y-5">
          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Summary</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between text-slate-600">
                <span>Subtotal</span>
                <span>{formatCurrency(invoice.subtotal)}</span>
              </div>
              {invoice.discount > 0 && (
                <div className="flex justify-between text-green-600">
                  <span>Discount</span>
                  <span>- {formatCurrency(invoice.discount)}</span>
                </div>
              )}
              <div className="flex justify-between text-slate-600">
                <span>GST ({invoice.gst_rate}%)</span>
                <span>{formatCurrency(invoice.gst_amount)}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 pt-2 text-base font-bold text-slate-900">
                <span>Total</span>
                <span>{formatCurrency(invoice.total)}</span>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-slate-200 bg-white p-5">
            <h2 className="font-semibold text-slate-900 mb-3">Delivery</h2>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Invoice PDF</span>
                <span className="font-medium text-slate-700">Available</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Payment URL</span>
                <span className="font-medium text-slate-700">{['sent', 'pending', 'overdue'].includes(invoice.status) ? 'Live' : 'Not sent yet'}</span>
              </div>
              <div className="flex justify-between gap-4">
                <span className="text-slate-400">Due date</span>
                <span className="font-medium text-slate-700">{invoice.due_date ? formatDate(invoice.due_date) : 'Not set'}</span>
              </div>
            </div>
          </div>

          {invoice.notes && (
            <div className="rounded-xl border border-slate-200 bg-white p-5 text-sm">
              <p className="text-slate-400 mb-1">Notes</p>
              <p className="text-slate-700">{invoice.notes}</p>
            </div>
          )}

          <div className="rounded-xl border border-slate-200 bg-slate-50 p-5 text-sm text-slate-500">
            <p className="font-medium text-slate-700 mb-1">Quick actions</p>
            <ul className="space-y-1">
              <li>Send or resend the invoice from the top bar.</li>
              <li>Review submitted payment proof in the payment attempts panel.</li>
              <li>Download the PDF for offline records or email attachments.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  )
}
