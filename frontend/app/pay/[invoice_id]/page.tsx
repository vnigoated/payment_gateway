'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, Copy, AlertCircle } from 'lucide-react'

export default function PaymentPage({ params }: { params: { invoice_id: string } }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [utr, setUtr] = useState('')
  const [note, setNote] = useState('')
  const [submitMessage, setSubmitMessage] = useState('')
  const [submitError, setSubmitError] = useState('')

  useEffect(() => {
    const fetchPaymentDetails = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
        const res = await fetch(`${apiUrl}/pay/${params.invoice_id}/public`)
        if (!res.ok) {
          throw new Error('Failed to fetch invoice details')
        }
        const json = await res.json()
        setData(json)
      } catch (err: any) {
        setError(err.message)
      } finally {
        setLoading(false)
      }
    }
    fetchPaymentDetails()
  }, [params.invoice_id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSubmitError('')
    setSubmitMessage('')
    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'
      const res = await fetch(`${apiUrl}/pay/${params.invoice_id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ utr, customer_note: note }),
      })
      const result = await res.json()
      if (!res.ok) {
        throw new Error(result.detail || 'Failed to submit payment proof')
      }
      setSubmitMessage(result.message || 'Payment proof submitted successfully!')
      setData({ ...data, payment: { status: 'submitted', utr } })
      setUtr('')
      setNote('')
    } catch (err: any) {
      setSubmitError(err.message)
    }
  }

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('Copied to clipboard!')
  }

  if (loading) {
    return <div className="min-h-screen flex items-center justify-center">Loading...</div>
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center flex-col gap-4 text-center">
        <AlertCircle size={48} className="text-red-500" />
        <h2 className="text-2xl font-bold">Invoice Not Found</h2>
        <p className="text-slate-500">The invoice you are looking for does not exist or has been removed.</p>
      </div>
    )
  }

  const { invoice, merchant_name, upi_method, bank_method, payment, qr_b64 } = data

  return (
    <div className="min-h-screen bg-slate-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-3xl font-extrabold text-slate-900">{merchant_name}</h1>
          <p className="mt-2 text-sm text-slate-500">Payment for Invoice {invoice.invoice_number}</p>
        </div>

        {/* Invoice Summary */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200 text-center">
          <p className="text-slate-500 text-sm">Amount Due</p>
          <p className="text-5xl font-black text-slate-900 mt-2">
            ₹{invoice.total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </p>
          {invoice.status === 'paid' && (
            <div className="mt-4 inline-flex items-center gap-2 bg-green-50 text-green-700 px-4 py-2 rounded-full font-medium text-sm border border-green-200">
              <CheckCircle2 size={18} /> Invoice is Paid
            </div>
          )}
        </div>

        {invoice.status !== 'paid' && (
          <>
            {/* Payment Methods */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold mb-4">Pay via UPI</h3>
              {upi_method ? (
                <div className="flex flex-col items-center">
                  {qr_b64 && (
                    <img src={`data:image/png;base64,${qr_b64}`} alt="UPI QR Code" className="w-48 h-48 mb-4 border rounded-xl" />
                  )}
                  <p className="text-sm font-medium">{upi_method.upi_name}</p>
                  <div className="flex items-center gap-2 mt-2 text-slate-600 bg-slate-50 px-3 py-1.5 rounded-lg border">
                    <span className="font-mono text-sm">{upi_method.upi_id}</span>
                    <button onClick={() => copyToClipboard(upi_method.upi_id)} className="hover:text-brand-600 transition-colors">
                      <Copy size={14} />
                    </button>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">UPI payment not configured by merchant.</p>
              )}

              <h3 className="text-lg font-bold mt-8 mb-4">Pay via Bank Transfer</h3>
              {bank_method ? (
                <div className="space-y-3 text-sm">
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-500">Bank Name</span>
                    <span className="font-medium">{bank_method.bank_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-500">Account Name</span>
                    <span className="font-medium">{bank_method.bank_account_name}</span>
                  </div>
                  <div className="flex justify-between items-center py-2 border-b">
                    <span className="text-slate-500">Account Number</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{bank_method.bank_account_number}</span>
                      <button onClick={() => copyToClipboard(bank_method.bank_account_number || '')} className="text-slate-400 hover:text-brand-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between items-center py-2">
                    <span className="text-slate-500">IFSC Code</span>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-medium">{bank_method.bank_ifsc}</span>
                      <button onClick={() => copyToClipboard(bank_method.bank_ifsc || '')} className="text-slate-400 hover:text-brand-600">
                        <Copy size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-slate-500 text-center py-4">Bank details not configured by merchant.</p>
              )}
            </div>

            {/* Submit UTR */}
            <div className="bg-white p-6 rounded-2xl shadow-sm border border-slate-200">
              <h3 className="text-lg font-bold mb-2">Submit Payment Proof</h3>
              <p className="text-sm text-slate-500 mb-6">After making the payment, enter your UTR / reference number below.</p>
              
              {payment && payment.status === 'submitted' ? (
                <div className="bg-amber-50 text-amber-700 p-4 rounded-xl border border-amber-200 text-sm font-medium">
                  Payment verification is pending. UTR: {payment.utr}
                </div>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-4">
                  {submitError && (
                    <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm border border-red-100">
                      {submitError}
                    </div>
                  )}
                  {submitMessage && (
                    <div className="bg-green-50 text-green-700 p-3 rounded-lg text-sm border border-green-200">
                      {submitMessage}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">UTR / Reference Number</label>
                    <input
                      type="text"
                      required
                      value={utr}
                      onChange={(e) => setUtr(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                      placeholder="e.g., 123456789012"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-1">Note (Optional)</label>
                    <input
                      type="text"
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      className="w-full px-4 py-2 border border-slate-300 rounded-xl focus:ring-2 focus:ring-brand-500 focus:border-brand-500 outline-none transition-all"
                      placeholder="Any additional details"
                    />
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-brand-600 hover:bg-brand-700 text-white font-medium py-3 rounded-xl transition-colors"
                  >
                    Submit Proof
                  </button>
                </form>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
