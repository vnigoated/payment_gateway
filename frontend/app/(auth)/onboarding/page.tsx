'use client'
import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { ArrowRight, Building2, CheckCircle2, Smartphone } from 'lucide-react'
import { api } from '@/lib/api'
import type { PaymentMethod } from '@/lib/types'

type UpiForm = {
  label: string
  upi_id: string
  upi_name: string
  is_default: boolean
}

type BankForm = {
  label: string
  bank_name: string
  account_holder: string
  account_number: string
  ifsc_code: string
  account_type: 'current' | 'savings'
  is_default: boolean
}

export default function OnboardingPage() {
  const router = useRouter()
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [savingUpi, setSavingUpi] = useState(false)
  const [savingBank, setSavingBank] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const [upiForm, setUpiForm] = useState<UpiForm>({
    label: 'Primary UPI',
    upi_id: '',
    upi_name: '',
    is_default: true,
  })

  const [bankForm, setBankForm] = useState<BankForm>({
    label: 'Business Bank',
    bank_name: '',
    account_holder: '',
    account_number: '',
    ifsc_code: '',
    account_type: 'current',
    is_default: false,
  })

  useEffect(() => {
    api.listPaymentMethods()
      .then(setMethods)
      .catch(() => setMethods([]))
      .finally(() => setLoading(false))
  }, [])

  const hasUpi = methods.some(method => method.method_type === 'upi')
  const hasBank = methods.some(method => method.method_type === 'bank')

  const refreshMethods = async () => {
    const next = await api.listPaymentMethods()
    setMethods(next)
  }

  const saveUpi = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSavingUpi(true)
    try {
      await api.addUPI(upiForm)
      await refreshMethods()
      setSuccess('UPI ID saved. Your checkout QR can now be generated.')
      setUpiForm(prev => ({ ...prev, upi_id: '', upi_name: '', is_default: true }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save UPI ID')
    } finally {
      setSavingUpi(false)
    }
  }

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setSavingBank(true)
    try {
      await api.addBank(bankForm)
      await refreshMethods()
      setSuccess('Bank account saved.')
      setBankForm(prev => ({
        ...prev,
        bank_name: '',
        account_holder: '',
        account_number: '',
        ifsc_code: '',
        is_default: false,
      }))
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to save bank account')
    } finally {
      setSavingBank(false)
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-white px-4 py-10">
      <div className="mx-auto grid w-full max-w-6xl gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <section className="rounded-3xl border border-white/10 bg-white/5 p-8 shadow-2xl shadow-black/20">
          <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300">
            <CheckCircle2 size={14} />
            Merchant onboarding
          </div>
          <h1 className="mt-5 text-3xl font-bold tracking-tight sm:text-4xl">
            Add your payment details before you start selling
          </h1>
          <p className="mt-4 max-w-xl text-sm leading-6 text-slate-300">
            We need at least one active UPI ID so your QR-based checkout can work.
            You can also add a bank account now or later from the dashboard.
          </p>

          <div className="mt-8 grid gap-4 sm:grid-cols-3">
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <Smartphone className="text-brand-400" size={18} />
              <p className="mt-3 text-sm font-semibold">UPI QR</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Used for fast customer payments and payment emails.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <Building2 className="text-brand-400" size={18} />
              <p className="mt-3 text-sm font-semibold">Bank details</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Helpful for customers who prefer NEFT, IMPS, or RTGS.</p>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-900/60 p-4">
              <CheckCircle2 className="text-brand-400" size={18} />
              <p className="mt-3 text-sm font-semibold">Ready to go</p>
              <p className="mt-1 text-xs leading-5 text-slate-400">Once setup is complete, your API key can trigger checkout.</p>
            </div>
          </div>

          <div className="mt-8 rounded-2xl border border-white/10 bg-slate-900/70 p-5">
            <div className="flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold">Setup status</p>
                <p className="mt-1 text-sm text-slate-400">
                  UPI: <span className={hasUpi ? 'text-emerald-300' : 'text-amber-300'}>{hasUpi ? 'added' : 'missing'}</span>
                  {' '}• Bank: <span className={hasBank ? 'text-emerald-300' : 'text-slate-400'}>{hasBank ? 'added' : 'optional'}</span>
                </p>
              </div>
              <button
                type="button"
                onClick={() => router.push('/dashboard')}
                disabled={!hasUpi}
                className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Continue to dashboard
                <ArrowRight size={16} />
              </button>
            </div>
          </div>

          <p className="mt-4 text-xs leading-5 text-slate-400">
            If you skip bank setup now, you can still complete it later from Payment Methods.
          </p>
        </section>

        <section className="space-y-6">
          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">
            <div className="flex items-center gap-2">
              <Smartphone size={18} className="text-brand-600" />
              <h2 className="text-lg font-semibold">Add your UPI ID</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              This is the payment identity used to generate your unique QR code.
            </p>

            <form onSubmit={saveUpi} className="mt-5 space-y-4">
              <Field label="Label" value={upiForm.label} onChange={v => setUpiForm(prev => ({ ...prev, label: v }))} placeholder="Primary UPI" />
              <Field label="UPI ID" value={upiForm.upi_id} onChange={v => setUpiForm(prev => ({ ...prev, upi_id: v }))} placeholder="yourname@okaxis" required />
              <Field label="Display name" value={upiForm.upi_name} onChange={v => setUpiForm(prev => ({ ...prev, upi_name: v }))} placeholder="Acme Studio" required />
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={upiForm.is_default}
                  onChange={e => setUpiForm(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Make this the default payment method
              </label>
              {error && <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">{error}</p>}
              {success && <p className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{success}</p>}
              <button
                type="submit"
                disabled={savingUpi}
                className="w-full rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-brand-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingUpi ? 'Saving…' : hasUpi ? 'Update UPI ID' : 'Save UPI ID'}
              </button>
            </form>
          </div>

          <div className="rounded-3xl border border-slate-200 bg-white p-6 text-slate-900 shadow-xl">
            <div className="flex items-center gap-2">
              <Building2 size={18} className="text-slate-600" />
              <h2 className="text-lg font-semibold">Add bank details</h2>
            </div>
            <p className="mt-2 text-sm text-slate-500">
              Optional now, useful for customers who prefer direct bank transfer.
            </p>

            <form onSubmit={saveBank} className="mt-5 space-y-4">
              <Field label="Label" value={bankForm.label} onChange={v => setBankForm(prev => ({ ...prev, label: v }))} placeholder="Business bank account" />
              <Field label="Bank name" value={bankForm.bank_name} onChange={v => setBankForm(prev => ({ ...prev, bank_name: v }))} placeholder="HDFC Bank" />
              <Field label="Account holder" value={bankForm.account_holder} onChange={v => setBankForm(prev => ({ ...prev, account_holder: v }))} placeholder="Acme Studio" />
              <Field label="Account number" value={bankForm.account_number} onChange={v => setBankForm(prev => ({ ...prev, account_number: v }))} placeholder="00001234567890" />
              <Field label="IFSC code" value={bankForm.ifsc_code} onChange={v => setBankForm(prev => ({ ...prev, ifsc_code: v.toUpperCase() }))} placeholder="HDFC0001234" />
              <div>
                <label className="mb-1.5 block text-sm text-slate-500">Account type</label>
                <select
                  value={bankForm.account_type}
                  onChange={e => setBankForm(prev => ({ ...prev, account_type: e.target.value as 'current' | 'savings' }))}
                  className="w-full rounded-lg border border-slate-200 bg-white px-3.5 py-2 text-sm"
                >
                  <option value="current">Current</option>
                  <option value="savings">Savings</option>
                </select>
              </div>
              <label className="flex items-center gap-2 text-sm text-slate-600">
                <input
                  type="checkbox"
                  checked={bankForm.is_default}
                  onChange={e => setBankForm(prev => ({ ...prev, is_default: e.target.checked }))}
                  className="rounded border-slate-300"
                />
                Make this the default payment method
              </label>
              <button
                type="submit"
                disabled={savingBank}
                className="w-full rounded-lg border border-slate-200 bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {savingBank ? 'Saving…' : 'Save bank details'}
              </button>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  required = false,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  required?: boolean
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm text-slate-600">{label}{required ? ' *' : ''}</label>
      <input
        value={value}
        onChange={e => onChange(e.target.value)}
        placeholder={placeholder}
        required={required}
        className="w-full rounded-lg border border-slate-200 px-3.5 py-2.5 text-sm outline-none transition-colors placeholder:text-slate-400 focus:border-brand-400"
      />
    </div>
  )
}
