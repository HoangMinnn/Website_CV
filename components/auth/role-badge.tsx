'use client'

import { Shield, User } from 'lucide-react'
import { UserRole } from '@/lib/auth-context'

interface RoleBadgeProps {
  role: UserRole
  size?: 'sm' | 'md' | 'lg'
  showIcon?: boolean
}

export function RoleBadge({ role, size = 'sm', showIcon = true }: RoleBadgeProps) {
  const isAdmin = role === 'admin'

  const sizeClasses = {
    sm: 'text-[10px] px-2 py-0.5 gap-1',
    md: 'text-xs px-2.5 py-1 gap-1.5',
    lg: 'text-sm px-3 py-1.5 gap-2',
  }

  const iconSizes = {
    sm: 'w-3 h-3',
    md: 'w-3.5 h-3.5',
    lg: 'w-4 h-4',
  }

  return (
    <span
      className={`inline-flex items-center font-semibold rounded-full ${sizeClasses[size]} ${
        isAdmin
          ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
          : 'bg-blue-500/15 text-blue-500 border border-blue-500/30'
      }`}
    >
      {showIcon && (
        isAdmin
          ? <Shield className={iconSizes[size]} />
          : <User className={iconSizes[size]} />
      )}
      {isAdmin ? 'Admin' : 'User'}
    </span>
  )
}
