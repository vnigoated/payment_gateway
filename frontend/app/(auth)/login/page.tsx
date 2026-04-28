'use client'
import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'

export default function LoginPage() {
  const router = useRouter()
  const [form, setForm] = useState({ email: '', password: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const data = await api.login(form)
      localStorage.setItem('jwt_token', data.access_token)

      // Load first active API key
      const keys = await api.listKeys()
      if (keys.length > 0) localStorage.setItem('active_api_key', keys[0].key_prefix)

      router.push('/dashboard')
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Login failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full max-w-sm">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-8">
        <h1 className="text-white text-xl font-bold">Welcome back</h1>
        <p className="text-slate-400 text-sm mt-1">Sign in to your dashboard</p>

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Email</label>
            <input
              type="email" required autoFocus
              value={form.email}
              onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder-slate-500 focus:border-brand-500 transition-colors"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label className="block text-sm text-slate-400 mb-1.5">Password</label>
            <input
              type="password" required
              value={form.password}
              onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
              className="w-full bg-slate-800 border border-slate-700 text-white rounded-lg px-3.5 py-2.5 text-sm placeholder-slate-500 focus:border-brand-500 transition-colors"
              placeholder="••••••••"
            />
          </div>

          {error && <p className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg px-3.5 py-2.5">{error}</p>}

          <button
            type="submit" disabled={loading}
            className="w-full bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white font-semibold py-2.5 rounded-lg text-sm transition-colors"
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
      </div>

      <p className="text-center text-slate-500 text-sm mt-5">
        No account?{' '}
        <Link href="/signup" className="text-brand-400 hover:text-brand-300 font-medium">
          Sign up free
        </Link>
      </p>
    </div>
  )
}
