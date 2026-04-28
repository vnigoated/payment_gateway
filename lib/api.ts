import type { User, APIKey, APIKeyCreated, Invoice, Payment, PaymentMethod } from './types'

const BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000'

function jwt() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('jwt_token')
}

function activeKey() {
  if (typeof window === 'undefined') return null
  return localStorage.getItem('active_api_key')
}

async function req<T>(
  path: string,
  opts: RequestInit = {},
  auth: 'jwt' | 'apikey' | 'none' = 'jwt',
): Promise<T> {
  const token = auth === 'apikey' ? activeKey() : auth === 'jwt' ? jwt() : null
  const res = await fetch(`${BASE}${path}`, {
    ...opts,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(opts.headers ?? {}),
    },
  })
  if (res.status === 204) return null as T
  const body = await res.json().catch(() => ({ detail: 'Request failed' }))
  if (!res.ok) throw new Error(body.detail ?? JSON.stringify(body))
  return body as T
}

// ── Auth ──────────────────────────────────────────────────────────────────────

export const api = {
  signup: (data: { email: string; password: string; name: string; business_name?: string }) =>
    req<{ access_token: string; user: User }>('/auth/signup', { method: 'POST', body: JSON.stringify(data) }, 'none'),

  login: (data: { email: string; password: string }) =>
    req<{ access_token: string; user: User }>('/auth/login', { method: 'POST', body: JSON.stringify(data) }, 'none'),

  getMe: () => req<User>('/auth/me'),

  // ── API Keys ────────────────────────────────────────────────────────────────

  createKey: (name: string) =>
    req<APIKeyCreated>('/keys', { method: 'POST', body: JSON.stringify({ name }) }),

  listKeys: () => req<APIKey[]>('/keys'),

  revokeKey: (id: string) => req<null>(`/keys/${id}`, { method: 'DELETE' }),

  // ── Invoices ────────────────────────────────────────────────────────────────

  createInvoice: (data: object) =>
    req<Invoice>('/invoices', { method: 'POST', body: JSON.stringify(data) }, 'apikey'),

  listInvoices: (status?: string) =>
    req<Invoice[]>(`/invoices${status ? `?status=${status}` : ''}`, {}, 'apikey'),

  getInvoice: (id: string) => req<Invoice>(`/invoices/${id}`, {}, 'apikey'),

  cancelInvoice: (id: string) =>
    req<null>(`/invoices/${id}`, { method: 'DELETE' }, 'apikey'),

  sendInvoice: (id: string) =>
    req<{ payment_url: string; invoice_number: string }>(`/invoices/${id}/send`, { method: 'POST' }, 'apikey'),

  // ── Payments ────────────────────────────────────────────────────────────────

  listPayments: (invoiceId: string) =>
    req<Payment[]>(`/invoices/${invoiceId}/payments`, {}, 'apikey'),

  confirmPayment: (invoiceId: string) =>
    req<Payment>(`/invoices/${invoiceId}/confirm-payment`, { method: 'POST' }, 'apikey'),

  rejectPayment: (invoiceId: string, reason: string) =>
    req<Payment>(`/invoices/${invoiceId}/reject-payment?reason=${encodeURIComponent(reason)}`, { method: 'POST' }, 'apikey'),

  // ── Payment Methods ─────────────────────────────────────────────────────────

  listPaymentMethods: () => req<PaymentMethod[]>('/payment-methods'),

  addUPI: (data: object) =>
    req<PaymentMethod>('/payment-methods/upi', { method: 'POST', body: JSON.stringify(data) }),

  addBank: (data: object) =>
    req<PaymentMethod>('/payment-methods/bank', { method: 'POST', body: JSON.stringify(data) }),

  setDefaultMethod: (id: string) =>
    req<PaymentMethod>(`/payment-methods/${id}/set-default`, { method: 'PATCH' }),

  deleteMethod: (id: string) =>
    req<null>(`/payment-methods/${id}`, { method: 'DELETE' }),
}
