'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Star, Smartphone, Building2, X } from 'lucide-react'
import { api } from '@/lib/api'
import type { PaymentMethod } from '@/lib/types'

type Modal = { type: 'upi' | 'bank' } | null

export default function PaymentMethodsPage() {
  const [methods, setMethods] = useState<PaymentMethod[]>([])
  const [loading, setLoading] = useState(true)
  const [modal, setModal] = useState<Modal>(null)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  const [upiForm, setUpiForm]   = useState({ label: '', upi_id: '', upi_name: '', is_default: false })
  const [bankForm, setBankForm] = useState({ label: '', bank_name: '', account_holder: '', account_number: '', ifsc_code: '', account_type: 'current', is_default: false })

  useEffect(() => {
    api.listPaymentMethods().then(setMethods).finally(() => setLoading(false))
  }, [])

  const reload = () => api.listPaymentMethods().then(setMethods)

  const saveUPI = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.addUPI(upiForm); await reload(); setModal(null); setUpiForm({ label: '', upi_id: '', upi_name: '', is_default: false }) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  const saveBank = async (e: React.FormEvent) => {
    e.preventDefault(); setSaving(true); setError('')
    try { await api.addBank(bankForm); await reload(); setModal(null); setBankForm({ label: '', bank_name: '', account_holder: '', account_number: '', ifsc_code: '', account_type: 'current', is_default: false }) }
    catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setSaving(false) }
  }

  const remove = async (id: string) => {
    if (!confirm('Remove this payment method?')) return
    await api.deleteMethod(id); await reload()
  }

  const setDefault = async (id: string) => {
    await api.setDefaultMethod(id); await reload()
  }

  const upiMethods  = methods.filter(m => m.method_type === 'upi')
  const bankMethods = methods.filter(m => m.method_type === 'bank')

  const Field = ({ label, value, onChange, placeholder, type = 'text', required = false }:
    { label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string; required?: boolean }) => (
    <div>
      <label className="block text-sm text-slate-500 mb-1.5">{label}</label>
      <input type={type} required={required} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:border-brand-400 transition-colors" />
    </div>
  )

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">Payment Methods</h1>
        <p className="text-slate-500 text-sm mt-1">Configure how your customers can pay you. Added to every payment page.</p>
      </div>

      {loading ? (
        <div className="py-12 flex justify-center"><div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" /></div>
      ) : (
        <div className="space-y-6">
          {/* UPI */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Smartphone size={18} className="text-brand-600" />
                <h2 className="font-semibold text-slate-900">UPI IDs</h2>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{upiMethods.length}</span>
              </div>
              <button onClick={() => { setModal({ type: 'upi' }); setError('') }}
                className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
                <Plus size={15} /> Add UPI
              </button>
            </div>
            {upiMethods.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl py-8 text-center">
                <Smartphone size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">No UPI IDs yet</p>
                <button onClick={() => setModal({ type: 'upi' })}
                  className="mt-2 text-sm text-brand-600 hover:underline">Add your first UPI ID</button>
              </div>
            ) : (
              <div className="space-y-2">
                {upiMethods.map(m => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-brand-50 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Smartphone size={18} className="text-brand-600" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{m.label}</p>
                        {m.is_default && <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10} />Default</span>}
                      </div>
                      <p className="text-sm text-brand-600 font-mono">{m.upi_id}</p>
                      {m.upi_name && <p className="text-xs text-slate-400">{m.upi_name}</p>}
                    </div>
                    {!m.is_default && (
                      <button onClick={() => setDefault(m.id)} className="text-xs text-slate-400 hover:text-yellow-600 transition-colors">Set default</button>
                    )}
                    <button onClick={() => remove(m.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Bank */}
          <section>
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <Building2 size={18} className="text-slate-600" />
                <h2 className="font-semibold text-slate-900">Bank Accounts</h2>
                <span className="text-xs bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">{bankMethods.length}</span>
              </div>
              <button onClick={() => { setModal({ type: 'bank' }); setError('') }}
                className="inline-flex items-center gap-1.5 text-sm text-brand-600 hover:text-brand-700 font-medium">
                <Plus size={15} /> Add Bank
              </button>
            </div>
            {bankMethods.length === 0 ? (
              <div className="bg-white border border-dashed border-slate-200 rounded-xl py-8 text-center">
                <Building2 size={28} className="mx-auto text-slate-300 mb-2" />
                <p className="text-slate-400 text-sm">No bank accounts yet</p>
                <button onClick={() => setModal({ type: 'bank' })}
                  className="mt-2 text-sm text-brand-600 hover:underline">Add bank account</button>
              </div>
            ) : (
              <div className="space-y-2">
                {bankMethods.map(m => (
                  <div key={m.id} className="bg-white border border-slate-200 rounded-xl px-5 py-4 flex items-center gap-4">
                    <div className="w-10 h-10 bg-slate-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <Building2 size={18} className="text-slate-500" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <p className="font-medium text-slate-800">{m.label}</p>
                        {m.is_default && <span className="bg-yellow-100 text-yellow-700 text-xs font-semibold px-2 py-0.5 rounded-full flex items-center gap-1"><Star size={10} />Default</span>}
                      </div>
                      <p className="text-sm text-slate-600">{m.bank_name} · {m.account_holder}</p>
                      <p className="text-xs text-slate-400 font-mono">A/C: ••••{m.account_number?.slice(-4)} | IFSC: {m.ifsc_code}</p>
                    </div>
                    {!m.is_default && (
                      <button onClick={() => setDefault(m.id)} className="text-xs text-slate-400 hover:text-yellow-600 transition-colors">Set default</button>
                    )}
                    <button onClick={() => remove(m.id)} className="text-slate-300 hover:text-red-500 transition-colors p-1"><Trash2 size={15} /></button>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
              <h3 className="font-semibold text-slate-900">{modal.type === 'upi' ? 'Add UPI ID' : 'Add Bank Account'}</h3>
              <button onClick={() => setModal(null)} className="text-slate-400 hover:text-slate-600"><X size={20} /></button>
            </div>
            <div className="p-6">
              {modal.type === 'upi' ? (
                <form onSubmit={saveUPI} className="space-y-4">
                  <Field label="Label *" required value={upiForm.label} onChange={v => setUpiForm(p => ({ ...p, label: v }))} placeholder="Business UPI" />
                  <Field label="UPI ID *" required value={upiForm.upi_id} onChange={v => setUpiForm(p => ({ ...p, upi_id: v }))} placeholder="yourbiz@okaxis" />
                  <Field label="Display Name (shown in UPI apps) *" required value={upiForm.upi_name} onChange={v => setUpiForm(p => ({ ...p, upi_name: v }))} placeholder="Acme Corp" />
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={upiForm.is_default} onChange={e => setUpiForm(p => ({ ...p, is_default: e.target.checked }))} className="rounded" />
                    Set as default payment method
                  </label>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <button type="submit" disabled={saving} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                    {saving ? 'Saving…' : 'Add UPI ID'}
                  </button>
                </form>
              ) : (
                <form onSubmit={saveBank} className="space-y-4">
                  <Field label="Label *" required value={bankForm.label} onChange={v => setBankForm(p => ({ ...p, label: v }))} placeholder="HDFC Current Account" />
                  <div className="grid grid-cols-2 gap-4">
                    <Field label="Bank Name *" required value={bankForm.bank_name} onChange={v => setBankForm(p => ({ ...p, bank_name: v }))} placeholder="HDFC Bank" />
                    <Field label="Account Holder *" required value={bankForm.account_holder} onChange={v => setBankForm(p => ({ ...p, account_holder: v }))} placeholder="Acme Corp" />
                    <Field label="Account Number *" required value={bankForm.account_number} onChange={v => setBankForm(p => ({ ...p, account_number: v }))} placeholder="00001234567890" />
                    <Field label="IFSC Code *" required value={bankForm.ifsc_code} onChange={v => setBankForm(p => ({ ...p, ifsc_code: v.toUpperCase() }))} placeholder="HDFC0001234" />
                  </div>
                  <div>
                    <label className="block text-sm text-slate-500 mb-1.5">Account Type</label>
                    <select value={bankForm.account_type} onChange={e => setBankForm(p => ({ ...p, account_type: e.target.value }))}
                      className="w-full border border-slate-200 rounded-lg px-3.5 py-2 text-sm bg-white focus:border-brand-400">
                      <option value="current">Current</option>
                      <option value="savings">Savings</option>
                    </select>
                  </div>
                  <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input type="checkbox" checked={bankForm.is_default} onChange={e => setBankForm(p => ({ ...p, is_default: e.target.checked }))} className="rounded" />
                    Set as default payment method
                  </label>
                  {error && <p className="text-red-500 text-sm">{error}</p>}
                  <button type="submit" disabled={saving} className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm">
                    {saving ? 'Saving…' : 'Add Bank Account'}
                  </button>
                </form>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
