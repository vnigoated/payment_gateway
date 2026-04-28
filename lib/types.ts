export interface User {
  id: string
  email: string
  name: string
  business_name: string | null
  plan: 'free' | 'starter' | 'pro'
  invoice_count_this_month: number
  is_active: boolean
  created_at: string
}

export interface APIKey {
  id: string
  name: string
  key_prefix: string
  is_active: boolean
  usage_count: number
  last_used_at: string | null
  created_at: string
}

export interface APIKeyCreated extends APIKey {
  raw_key: string
}

export interface LineItem {
  name: string
  quantity: number
  rate: number
  amount: number
}

export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'cancelled' | 'overdue' | 'pending'

export interface Invoice {
  id: string
  invoice_number: string
  customer_name: string
  customer_email: string | null
  customer_phone: string | null
  customer_address: string | null
  customer_gstin: string | null
  line_items: LineItem[]
  subtotal: number
  gst_rate: number
  gst_amount: number
  discount: number
  total: number
  currency: string
  status: InvoiceStatus
  due_date: string | null
  notes: string | null
  pdf_url: string | null
  payment_link: string | null
  created_at: string
  updated_at: string
}

export interface Payment {
  id: string
  invoice_id: string
  amount: number
  currency: string
  method_type: string | null
  utr: string | null
  customer_note: string | null
  status: 'pending' | 'submitted' | 'confirmed' | 'rejected'
  confirmed_at: string | null
  rejection_reason: string | null
  created_at: string
}

export interface PaymentMethod {
  id: string
  method_type: 'upi' | 'bank'
  label: string
  upi_id: string | null
  upi_name: string | null
  bank_name: string | null
  account_holder: string | null
  account_number: string | null
  ifsc_code: string | null
  account_type: string | null
  is_default: boolean
  is_active: boolean
  created_at: string
}
