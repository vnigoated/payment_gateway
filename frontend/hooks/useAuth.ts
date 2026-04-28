'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import type { User } from '@/lib/types'

export function useAuth(redirectIfUnauthenticated = false) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const token = localStorage.getItem('jwt_token')
    if (!token) {
      setLoading(false)
      if (redirectIfUnauthenticated) router.replace('/login')
      return
    }
    api.getMe()
      .then(setUser)
      .catch(() => {
        localStorage.removeItem('jwt_token')
        if (redirectIfUnauthenticated) router.replace('/login')
      })
      .finally(() => setLoading(false))
  }, [router, redirectIfUnauthenticated])

  const logout = () => {
    localStorage.removeItem('jwt_token')
    localStorage.removeItem('active_api_key')
    router.push('/login')
  }

  return { user, loading, logout }
}
