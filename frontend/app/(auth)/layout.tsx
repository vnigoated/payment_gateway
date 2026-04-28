import Link from 'next/link'
import { Zap } from 'lucide-react'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center px-4">
      <Link href="/" className="flex items-center gap-2 mb-8">
        <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
          <Zap size={16} className="text-white" />
        </div>
        <span className="text-white font-semibold text-lg">Invoice API</span>
      </Link>
      {children}
    </div>
  )
}
