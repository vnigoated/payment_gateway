export interface User {
  id: string
  email: string
  name: string
  business_name: string | null
  plan: 'free' | 'starter' | 'pro'
  invoice_count_this_month: number
  razorpay_customer_id: string | null
  razorpay_subscription_id: string | null
  subscription_status: string | null
  current_period_end: string | null
  is_active: boolean
  created_at: string
}

export interface BillingPlan {
  name: string
  price_inr: number
  invoices_per_month: number
  api_calls_per_day: number
  api_calls_per_min: number
  features: string[]
}

export interface CurrentBillingPlan extends BillingPlan {
  plan: 'free' | 'starter' | 'pro'
  razorpay_subscription_id: string | null
  subscription_status: string | null
  current_period_end: string | null
}

export interface BillingCheckout {
  key_id: string
  subscription_id: string
  short_url: string | null
  plan: 'starter' | 'pro'
  amount: number
  currency: string
  merchant_name: string
  prefill: {
    name: string
    email: string
  }
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
  external_reference_id: string | null
  gateway_metadata: Record<string, unknown> | null
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

export interface CheckoutSession {
  invoice_id: string
  invoice_number: string
  payment_url: string
  qr_b64: string | null
  amount: number
  currency: string
  status: string
  external_reference_id: string | null
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

export interface InvoiceScanResult {
  customer_name: string | null
  customer_email: string | null
  customer_phone: string | null
  customer_address: string | null
  customer_gstin: string | null
  line_items: Array<{
    name: string
    quantity: number
    rate: number
  }>
  gst_rate: number
  discount: number
  currency: string | null
  invoice_date: string | null
  due_date: string | null
  notes: string | null
}
