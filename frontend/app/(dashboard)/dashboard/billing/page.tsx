'use client'

import { useEffect, useState } from 'react'
import { CheckCircle2, CreditCard, Loader2 } from 'lucide-react'
import { api } from '@/lib/api'
import { cn, formatCurrency, formatDate } from '@/lib/utils'
import type { BillingCheckout, BillingPlan, CurrentBillingPlan } from '@/lib/types'

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void }
  }
}

const PLAN_ORDER: Array<'free' | 'starter' | 'pro'> = ['free', 'starter', 'pro']

function loadRazorpayScript() {
  return new Promise<boolean>((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if (window.Razorpay) return resolve(true)
    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

function PlanCard({
  id,
  plan,
  currentPlan,
  busy,
  onCheckout,
}: {
  id: 'free' | 'starter' | 'pro'
  plan: BillingPlan
  currentPlan: CurrentBillingPlan | null
  busy: string | null
  onCheckout: (plan: 'starter' | 'pro') => void
}) {
  const active = currentPlan?.plan === id
  const canUpgrade = id !== 'free' && !active

  return (
    <div className={cn('bg-white border rounded-lg p-5 flex flex-col', active ? 'border-brand-500' : 'border-slate-200')}>
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="font-semibold text-slate-900">{plan.name}</h2>
          <p className="mt-1 text-2xl font-bold text-slate-950">
            {formatCurrency(plan.price_inr)}
            <span className="text-sm font-medium text-slate-500">/month</span>
          </p>
        </div>
        {active && (
          <span className="inline-flex items-center gap-1 rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
            <CheckCircle2 size={13} /> Active
          </span>
        )}
      </div>

      <ul className="mt-5 space-y-2 text-sm text-slate-600 flex-1">
        {plan.features.map((feature) => (
          <li key={feature} className="flex gap-2">
            <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-brand-600" />
            <span>{feature}</span>
          </li>
        ))}
      </ul>

      {id === 'free' ? (
        <button disabled className="mt-6 rounded-lg border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-400">
          Included
        </button>
      ) : (
        <button
          disabled={!canUpgrade || busy === id}
          onClick={() => onCheckout(id)}
          className={cn(
            'mt-6 inline-flex items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors',
            canUpgrade
              ? 'bg-brand-600 text-white hover:bg-brand-700'
              : 'bg-slate-100 text-slate-400',
          )}
        >
          {busy === id ? <Loader2 size={16} className="animate-spin" /> : <CreditCard size={16} />}
          {active ? 'Current Plan' : `Upgrade to ${plan.name}`}
        </button>
      )}
    </div>
  )
}

export default function BillingPage() {
  const [plans, setPlans] = useState<Record<string, BillingPlan>>({})
  const [currentPlan, setCurrentPlan] = useState<CurrentBillingPlan | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    Promise.all([api.listPlans(), api.getCurrentPlan()])
      .then(([planList, current]) => {
        setPlans(planList)
        setCurrentPlan(current)
      })
      .catch((err) => setError(err.message))
  }, [])

  async function openCheckout(plan: 'starter' | 'pro') {
    setBusy(plan)
    setError('')
    try {
      const checkout: BillingCheckout = await api.createBillingCheckout(plan)
      if (checkout.short_url) {
        window.location.href = checkout.short_url
        return
      }

      const loaded = await loadRazorpayScript()
      if (!loaded || !window.Razorpay) throw new Error('Could not load Razorpay Checkout')

      const razorpay = new window.Razorpay({
        key: checkout.key_id,
        subscription_id: checkout.subscription_id,
        name: checkout.merchant_name,
        description: `${checkout.plan} plan subscription`,
        prefill: checkout.prefill,
        handler: () => api.getCurrentPlan().then(setCurrentPlan),
        theme: { color: '#2563eb' },
      })
      razorpay.open()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Checkout failed')
    } finally {
      setBusy(null)
    }
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-slate-900">Billing</h1>
        <p className="mt-1 text-sm text-slate-500">
          Manage your SaaS plan and unlock higher invoice and API limits.
        </p>
      </div>

      {currentPlan && (
        <div className="mb-6 rounded-lg border border-slate-200 bg-white px-5 py-4 text-sm text-slate-600">
          <span className="font-semibold text-slate-900">Current plan:</span> {currentPlan.name}
          {currentPlan.subscription_status && (
            <span className="ml-3">Subscription: {currentPlan.subscription_status}</span>
          )}
          {currentPlan.current_period_end && (
            <span className="ml-3">Renews: {formatDate(currentPlan.current_period_end)}</span>
          )}
        </div>
      )}

      {error && (
        <div className="mb-6 rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-3">
        {PLAN_ORDER.map((id) => plans[id] && (
          <PlanCard
            key={id}
            id={id}
            plan={plans[id]}
            currentPlan={currentPlan}
            busy={busy}
            onCheckout={openCheckout}
          />
        ))}
      </div>
    </div>
  )
}
