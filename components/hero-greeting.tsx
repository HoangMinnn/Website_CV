'use client'

import { useAuth } from '@/lib/auth-context'

export function HeroGreeting() {
  const { user, isAuthenticated } = useAuth()

  if (!isAuthenticated || !user) return null

  return (
    <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-primary/30 bg-primary/10 text-xs sm:text-sm font-medium mb-6 animate-fadeInUp">
      <span className="flex h-2 w-2 rounded-full bg-green-500 animate-pulse" />
      <span className="text-muted-foreground">Xin chào,</span>
      <span className="text-foreground font-semibold">{user.name}</span>
      <span className={`text-[11px] px-2 py-0.5 rounded-full font-semibold ${
        user.role === 'admin'
          ? 'bg-amber-500/20 text-amber-500'
          : 'bg-blue-500/20 text-blue-500'
      }`}>
        {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
      </span>
    </div>
  )
}
