'use client'
import { useAuth } from '@/hooks/useAuth'
import { Sidebar } from '@/components/sidebar'

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth(true)

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-brand-600 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar user={user} onLogout={logout} />
      <main className="flex-1 ml-60 p-8 bg-slate-50 min-h-screen">
        {children}
      </main>
    </div>
  )
}
