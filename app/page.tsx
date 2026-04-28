import Link from 'next/link'
import { FileText, Zap, CreditCard, Bell, Code2, CheckCircle2, ArrowRight } from 'lucide-react'

const FEATURES = [
  { icon: FileText,    title: 'GST Invoice Generation', desc: 'Compliant invoices with CGST/SGST breakdown, line items, and auto-calculated totals.' },
  { icon: CreditCard,  title: 'UPI & Bank Payments',    desc: 'Generate UPI QR codes and bank transfer details. No payment gateway fees.' },
  { icon: Bell,        title: 'Webhooks',                desc: 'Get notified instantly when a customer submits payment proof or an invoice is confirmed.' },
  { icon: Code2,       title: 'Developer First',         desc: 'Clean REST API with auto-docs at /docs. Works with any language or framework.' },
  { icon: Zap,         title: 'Instant Setup',           desc: 'Signup → get API key → create invoice in under 2 minutes. No KYC, no waiting.' },
  { icon: CheckCircle2,title: 'Payment Tracking',        desc: 'Track every invoice — draft, sent, submitted, paid. Full audit trail per invoice.' },
]

const PLANS = [
  {
    name: 'Free', price: '₹0', period: '/month',
    features: ['5 invoices / month', 'UPI QR codes', 'Bank transfer details', 'API access', 'Invoice API branding'],
    cta: 'Get started free', href: '/signup', highlight: false,
  },
  {
    name: 'Starter', price: '₹499', period: '/month',
    features: ['50 invoices / month', 'Custom logo on PDF', 'Email delivery (SendGrid)', 'Webhook notifications', 'Priority support'],
    cta: 'Start Starter', href: '/signup', highlight: true,
  },
  {
    name: 'Pro', price: '₹1,499', period: '/month',
    features: ['Unlimited invoices', 'Custom domain', 'UPI QR codes on PDF', 'Recurring invoices', 'Multi-currency (coming soon)'],
    cta: 'Go Pro', href: '/signup', highlight: false,
  },
]

const CODE_SAMPLE = `POST /invoices
Authorization: Bearer inv_your_api_key

{
  "customer_name": "Acme Corp",
  "customer_email": "billing@acme.com",
  "gst_rate": 18,
  "line_items": [
    { "name": "Web Design", "quantity": 1, "rate": 25000 },
    { "name": "Hosting",    "quantity": 1, "rate": 5000  }
  ]
}

→ 201 Created
{
  "invoice_number": "INV-2024-0001",
  "total": 35400,
  "status": "draft"
}`

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-slate-950 text-white">
      {/* Navbar */}
      <header className="border-b border-slate-800">
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
              <Zap size={15} className="text-white" />
            </div>
            <span className="font-semibold">Invoice API</span>
          </div>
          <nav className="hidden md:flex items-center gap-6 text-sm text-slate-400">
            <a href="#features" className="hover:text-white transition-colors">Features</a>
            <a href="#pricing"  className="hover:text-white transition-colors">Pricing</a>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          </nav>
          <Link href="/signup" className="bg-brand-600 hover:bg-brand-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition-colors">
            Get started free
          </Link>
        </div>
      </header>

      {/* Hero */}
      <section className="max-w-6xl mx-auto px-6 pt-24 pb-20">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <div className="inline-flex items-center gap-2 bg-brand-600/10 border border-brand-600/20 text-brand-400 text-xs font-medium px-3 py-1.5 rounded-full mb-6">
              <Zap size={12} /> Built for Indian businesses
            </div>
            <h1 className="text-5xl font-extrabold leading-tight tracking-tight">
              Invoice &amp; Payment API<br />
              <span className="text-brand-400">for Indian Developers</span>
            </h1>
            <p className="mt-5 text-slate-400 text-lg leading-relaxed">
              Generate GST-compliant invoices, collect payments via UPI or bank transfer, and get notified — all through one clean REST API. No Razorpay fees.
            </p>
            <div className="mt-8 flex items-center gap-4">
              <Link href="/signup" className="inline-flex items-center gap-2 bg-brand-600 hover:bg-brand-700 text-white font-semibold px-6 py-3 rounded-xl transition-colors">
                Start for free <ArrowRight size={16} />
              </Link>
              <a href="http://localhost:8000/docs" target="_blank" rel="noreferrer"
                className="text-slate-400 hover:text-white text-sm font-medium transition-colors">
                View API docs →
              </a>
            </div>
            <div className="mt-8 flex items-center gap-6 text-sm text-slate-500">
              {['No credit card required', 'Free 5 invoices/month', 'UPI QR included'].map(t => (
                <span key={t} className="flex items-center gap-1.5">
                  <CheckCircle2 size={14} className="text-green-500" /> {t}
                </span>
              ))}
            </div>
          </div>

          {/* Code block */}
          <div className="bg-slate-900 border border-slate-800 rounded-2xl p-6 font-mono text-sm leading-relaxed">
            <div className="flex items-center gap-2 mb-4">
              <div className="w-3 h-3 rounded-full bg-red-500/70" />
              <div className="w-3 h-3 rounded-full bg-yellow-500/70" />
              <div className="w-3 h-3 rounded-full bg-green-500/70" />
              <span className="ml-2 text-slate-500 text-xs">invoice_api.sh</span>
            </div>
            <pre className="text-slate-300 whitespace-pre-wrap text-xs leading-6 overflow-x-auto">{CODE_SAMPLE}</pre>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="border-t border-slate-800 py-20">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <h2 className="text-3xl font-bold">How it works</h2>
          <p className="text-slate-400 mt-3">Three steps from signup to first paid invoice</p>
          <div className="mt-12 grid md:grid-cols-3 gap-8">
            {[
              { step: '01', title: 'Create an account', desc: 'Sign up, generate your API key in seconds. No verification needed.' },
              { step: '02', title: 'Create & send invoices', desc: 'POST to /invoices with customer details and line items. Get a payment URL back.' },
              { step: '03', title: 'Get paid', desc: 'Customer pays via UPI or bank transfer. You confirm receipt. Invoice marked paid.' },
            ].map(({ step, title, desc }) => (
              <div key={step} className="text-left">
                <div className="text-4xl font-black text-brand-600/30">{step}</div>
                <h3 className="text-lg font-semibold mt-2">{title}</h3>
                <p className="text-slate-400 text-sm mt-1 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="border-t border-slate-800 py-20">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold">Everything you need</h2>
            <p className="text-slate-400 mt-3">Built for Indian freelancers, agencies, and SaaS businesses</p>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {FEATURES.map(({ icon: Icon, title, desc }) => (
              <div key={title} className="bg-slate-900 border border-slate-800 rounded-xl p-6 hover:border-brand-600/40 transition-colors">
                <Icon size={22} className="text-brand-400 mb-3" />
                <h3 className="font-semibold">{title}</h3>
                <p className="text-slate-400 text-sm mt-1.5 leading-relaxed">{desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="border-t border-slate-800 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-3xl font-bold">Simple, transparent pricing</h2>
            <p className="text-slate-400 mt-3">Start free. Upgrade when you need more.</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {PLANS.map(({ name, price, period, features, cta, href, highlight }) => (
              <div key={name} className={`rounded-2xl border p-8 flex flex-col ${highlight ? 'bg-brand-600 border-brand-500' : 'bg-slate-900 border-slate-800'}`}>
                <div className="mb-6">
                  <p className={`text-sm font-medium ${highlight ? 'text-blue-200' : 'text-slate-400'}`}>{name}</p>
                  <p className="text-4xl font-black mt-1">{price}<span className={`text-base font-normal ${highlight ? 'text-blue-200' : 'text-slate-500'}`}>{period}</span></p>
                </div>
                <ul className="space-y-3 flex-1 mb-8">
                  {features.map(f => (
                    <li key={f} className={`flex items-center gap-2.5 text-sm ${highlight ? 'text-blue-100' : 'text-slate-400'}`}>
                      <CheckCircle2 size={15} className={highlight ? 'text-white' : 'text-brand-500'} />
                      {f}
                    </li>
                  ))}
                </ul>
                <Link href={href} className={`text-center py-3 rounded-xl font-semibold text-sm transition-colors ${highlight ? 'bg-white text-brand-600 hover:bg-blue-50' : 'bg-slate-800 text-white hover:bg-slate-700'}`}>
                  {cta}
                </Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-slate-800 py-10">
        <div className="max-w-6xl mx-auto px-6 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-500 text-sm">
            <Zap size={14} className="text-brand-400" />
            Invoice API — Built for India
          </div>
          <p className="text-slate-600 text-sm">No third-party payment fees. UPI is free.</p>
        </div>
      </footer>
    </div>
  )
}
