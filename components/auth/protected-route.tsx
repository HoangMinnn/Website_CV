'use client'

import { useEffect } from 'react'
import { useAuth, UserRole } from '@/lib/auth-context'
import { Shield, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import Link from 'next/link'

interface ProtectedRouteProps {
  children: React.ReactNode
  requiredRole?: UserRole
  fallbackUrl?: string
}

export function ProtectedRoute({ children, requiredRole, fallbackUrl = '/auth/login' }: ProtectedRouteProps) {
  const { user, isLoading, isAuthenticated } = useAuth()

  // Show loading spinner while checking auth state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-4">
          <Loader2 className="w-10 h-10 animate-spin text-primary mx-auto" />
          <p className="text-muted-foreground text-sm">Đang xác thực...</p>
        </div>
      </div>
    )
  }

  // Not logged in
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto">
            <Lock className="w-10 h-10 text-primary" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Yêu cầu đăng nhập</h2>
            <p className="text-muted-foreground">
              Bạn cần đăng nhập để truy cập trang này.
            </p>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href={fallbackUrl}>
              <Button className="w-full sm:w-auto px-8">
                Đăng nhập
              </Button>
            </Link>
            <Link href="/">
              <Button variant="outline" className="w-full sm:w-auto px-8">
                Về trang chủ
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  // Wrong role
  if (requiredRole && user?.role !== requiredRole) {
    const isAdminRequired = requiredRole === 'admin'
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center space-y-6 max-w-md">
          <div className="w-20 h-20 rounded-2xl bg-error/10 flex items-center justify-center mx-auto">
            <Shield className="w-10 h-10 text-error" />
          </div>
          <div className="space-y-2">
            <h2 className="text-2xl font-bold text-foreground">Không có quyền truy cập</h2>
            <p className="text-muted-foreground">
              {isAdminRequired
                ? 'Trang này chỉ dành cho quản trị viên. Tài khoản của bạn không có quyền quản trị.'
                : 'Bạn không có quyền truy cập trang này.'}
            </p>
          </div>
          <div className="rounded-xl border border-border bg-card p-4 text-left">
            <p className="text-sm text-muted-foreground mb-2">Tài khoản hiện tại:</p>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center">
                <span className="font-bold text-primary text-sm">{user?.name?.charAt(0).toUpperCase()}</span>
              </div>
              <div>
                <p className="font-semibold text-foreground text-sm">{user?.name}</p>
                <p className="text-xs text-muted-foreground">
                  Vai trò: <span className="text-primary font-medium">{user?.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}</span>
                </p>
              </div>
            </div>
          </div>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Link href="/">
              <Button className="w-full sm:w-auto px-8">
                Về trang chủ
              </Button>
            </Link>
            <Link href="/auth/login">
              <Button variant="outline" className="w-full sm:w-auto px-8">
                Đổi tài khoản
              </Button>
            </Link>
          </div>
        </div>
      </div>
    )
  }

  return <>{children}</>
}
