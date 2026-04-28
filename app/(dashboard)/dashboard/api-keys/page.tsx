'use client'
import { useEffect, useState } from 'react'
import { Plus, Trash2, Copy, CheckCircle2, Key, AlertTriangle } from 'lucide-react'
import { api } from '@/lib/api'
import { formatDateTime } from '@/lib/utils'
import type { APIKey } from '@/lib/types'

export default function APIKeysPage() {
  const [keys, setKeys] = useState<APIKey[]>([])
  const [loading, setLoading] = useState(true)
  const [newKeyName, setNewKeyName] = useState('')
  const [creating, setCreating] = useState(false)
  const [rawKey, setRawKey] = useState('')
  const [copied, setCopied] = useState(false)
  const [error, setError] = useState('')

  const activeKey = typeof window !== 'undefined' ? localStorage.getItem('active_api_key') : ''

  useEffect(() => {
    api.listKeys().then(setKeys).finally(() => setLoading(false))
  }, [])

  const create = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newKeyName.trim()) return
    setCreating(true); setError('')
    try {
      const key = await api.createKey(newKeyName.trim())
      setRawKey(key.raw_key)
      setKeys(prev => [key, ...prev])
      setNewKeyName('')
    } catch (err: unknown) { setError(err instanceof Error ? err.message : 'Failed') }
    finally { setCreating(false) }
  }

  const revoke = async (id: string) => {
    if (!confirm('Revoke this API key? Any app using it will stop working.')) return
    await api.revokeKey(id)
    setKeys(prev => prev.filter(k => k.id !== id))
  }

  const copy = (text: string) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const useAsActive = (rawOrPrefix: string) => {
    localStorage.setItem('active_api_key', rawOrPrefix)
    window.location.reload()
  }

  return (
    <div className="max-w-3xl">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-slate-900">API Keys</h1>
        <p className="text-slate-500 text-sm mt-1">Use these keys to authenticate invoice and payment API calls.</p>
      </div>

      {/* Raw key reveal — shown once on creation */}
      {rawKey && (
        <div className="mb-5 bg-amber-50 border border-amber-300 rounded-xl p-5">
          <div className="flex items-start gap-3 mb-3">
            <AlertTriangle size={18} className="text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <p className="font-semibold text-amber-900">Save this key — it won&apos;t be shown again</p>
              <p className="text-amber-700 text-sm mt-0.5">Copy it now and store it securely. We only store a hash.</p>
            </div>
          </div>
          <div className="flex items-center gap-2 bg-white border border-amber-200 rounded-lg px-4 py-3">
            <code className="flex-1 text-sm font-mono text-slate-800 break-all">{rawKey}</code>
            <button onClick={() => copy(rawKey)}
              className="flex items-center gap-1.5 bg-amber-500 hover:bg-amber-600 text-white text-xs font-medium px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors">
              {copied ? <><CheckCircle2 size={13} /> Copied</> : <><Copy size={13} /> Copy</>}
            </button>
          </div>
          <button onClick={() => { useAsActive(rawKey); setRawKey('') }}
            className="mt-3 text-sm text-amber-700 underline">
            Use this as my active key for the dashboard
          </button>
        </div>
      )}

      {/* Create key */}
      <div className="bg-white rounded-xl border border-slate-200 p-5 mb-5">
        <h2 className="font-semibold text-slate-900 mb-3">Create new key</h2>
        <form onSubmit={create} className="flex gap-3">
          <input
            value={newKeyName} onChange={e => setNewKeyName(e.target.value)}
            placeholder="e.g. Production, Mobile App…"
            className="flex-1 border border-slate-200 rounded-lg px-3.5 py-2 text-sm focus:border-brand-400 transition-colors"
          />
          <button type="submit" disabled={creating}
            className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            <Plus size={15} /> {creating ? 'Creating…' : 'Create'}
          </button>
        </form>
        {error && <p className="mt-2 text-red-500 text-sm">{error}</p>}
      </div>

      {/* Keys list */}
      <div className="bg-white rounded-xl border border-slate-200">
        <div className="px-5 py-3.5 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Your keys ({keys.length})</h2>
        </div>
        {loading ? (
          <div className="py-10 flex justify-center">
            <div className="w-5 h-5 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : keys.length === 0 ? (
          <div className="py-12 text-center">
            <Key size={32} className="mx-auto text-slate-300 mb-2" />
            <p className="text-slate-500 text-sm">No keys yet. Create one above.</p>
          </div>
        ) : (
          <div className="divide-y divide-slate-50">
            {keys.map(key => {
              const isActive = activeKey?.startsWith(key.key_prefix) || activeKey === key.key_prefix
              return (
                <div key={key.id} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-9 h-9 rounded-lg bg-slate-100 flex items-center justify-center flex-shrink-0">
                    <Key size={16} className="text-slate-500" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-800">{key.name}</p>
                      {isActive && (
                        <span className="bg-green-100 text-green-700 text-xs font-semibold px-2 py-0.5 rounded-full">Active</span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 font-mono mt-0.5">{key.key_prefix}••••••••</p>
                    <p className="text-xs text-slate-400 mt-0.5">
                      Created {formatDateTime(key.created_at)}
                      {key.last_used_at ? ` · Last used ${formatDateTime(key.last_used_at)}` : ' · Never used'}
                      {' '}· {key.usage_count} calls
                    </p>
                  </div>
                  {!isActive && (
                    <button onClick={() => useAsActive(key.key_prefix)}
                      className="text-xs text-brand-600 hover:text-brand-700 font-medium whitespace-nowrap">
                      Use as active
                    </button>
                  )}
                  <button onClick={() => revoke(key.id)}
                    className="text-slate-300 hover:text-red-500 transition-colors p-1 rounded">
                    <Trash2 size={15} />
                  </button>
                </div>
              )
            })}
          </div>
        )}
      </div>

      <div className="mt-4 bg-slate-100 rounded-xl p-4 text-sm text-slate-500">
        <p className="font-medium text-slate-700 mb-1">Using your API key</p>
        <code className="text-xs">Authorization: Bearer inv_your_api_key</code>
        <p className="mt-2">The dashboard uses your <strong>active key</strong> for all invoice/payment operations. Switch it above if you have multiple.</p>
      </div>
    </div>
  )
}
