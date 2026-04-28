'use client'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { LayoutDashboard, FileText, Key, CreditCard, LogOut, Zap } from 'lucide-react'
import { cn, PLAN_COLORS } from '@/lib/utils'
import type { User } from '@/lib/types'

const NAV = [
  { href: '/dashboard',            label: 'Dashboard',        icon: LayoutDashboard },
  { href: '/dashboard/invoices',   label: 'Invoices',         icon: FileText },
  { href: '/dashboard/api-keys',   label: 'API Keys',         icon: Key },
  { href: '/dashboard/payment-methods', label: 'Payment Methods', icon: CreditCard },
]

export function Sidebar({ user, onLogout }: { user: User | null; onLogout: () => void }) {
  const path = usePathname()

  return (
    <aside className="fixed inset-y-0 left-0 w-60 bg-slate-900 flex flex-col z-30">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-16 border-b border-slate-800">
        <div className="w-7 h-7 bg-brand-600 rounded-lg flex items-center justify-center">
          <Zap size={15} className="text-white" />
        </div>
        <span className="text-white font-semibold text-sm">Invoice API</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {NAV.map(({ href, label, icon: Icon }) => {
          const active = path === href || (href !== '/dashboard' && path.startsWith(href))
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                active
                  ? 'bg-brand-600 text-white'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800',
              )}
            >
              <Icon size={16} />
              {label}
            </Link>
          )
        })}
      </nav>

      {/* User */}
      {user && (
        <div className="px-3 py-4 border-t border-slate-800">
          <div className="px-3 py-2.5">
            <p className="text-white text-sm font-medium truncate">{user.name}</p>
            <p className="text-slate-500 text-xs truncate">{user.email}</p>
            <span className={cn('inline-block mt-1.5 px-2 py-0.5 rounded-full text-xs font-semibold capitalize', PLAN_COLORS[user.plan])}>
              {user.plan}
            </span>
          </div>
          <button
            onClick={onLogout}
            className="w-full mt-1 flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <LogOut size={16} />
            Logout
          </button>
        </div>
      )}
    </aside>
  )
}
