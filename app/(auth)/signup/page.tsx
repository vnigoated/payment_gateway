'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function SignupPage() {
  const router = useRouter()
  const [form, setForm] = useState({ name: '', business_name: '', email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const f = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setForm(prev => ({ ...prev, [k]: e.target.value }))

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    if (form.password.length < 8) { setError('Password must be at least 8 characters'); return }
    setLoading(true)
    try {
      const data = await api.signup(form)
      localStorage.setItem('jwt_token', data.access_token)

      // Auto-create first API key
      const key = await api.createKey('Default')
      localStorage.setItem('active_api_key', key.raw_key)

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Signup failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h1 className="text-white text-xl font-bold">Create your account</h1>
        <p className="text-slate-400 text-sm mt-1">Free forever — 5 invoices/month</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          {[
            { key: 'name',          label: 'Your name',            type: 'text',     ph: 'Rahul Sharma',        required: true  },
            { key: 'business_name', label: 'Business name',        type: 'text',     ph: 'Acme Design Studio',  required: false },
            { key: 'email',         label: 'Email',                type: 'email',    ph: 'you@example.com',     required: true  },
            { key: 'password',      label: 'Password (min 8 chars)', type: 'password', ph: '••••••••',           required: true  },
          ].map(({ key, label, type, ph, required }) => (
            <div key={key}>
              <label className="block text-sm text-slate-400 mb-1.5">{label}</label>
              <input
                type={type} required={required} autoFocus={key === 'name'}
                value={form[key as keyof typeof form]}
                onChange={f(key as keyof typeof form)}
                className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder-slate-500 focus:border-brand-500 transition-colors"
                placeholder={ph}
              />
            </div>
          ))}

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Creating account…' : 'Create account'}
          </button>
        </form>
      </div>

      <p className="text-center text-slate-500 text-sm mt-5">
        Already have an account?{' '}
        <Link href="/login" className="text-brand-400 hover:text-brand-300 font-medium">Sign in</Link>
      </p>
    </div>
  )
}
