'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Zap } from 'lucide-react'

interface AuthLayoutProps {
  children: React.ReactNode
  title: string
  description?: string
  variant?: 'login' | 'signup'
}

export function AuthLayout({ children, title, description, variant = 'login' }: AuthLayoutProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
  }, [])

  const isLogin = variant === 'login'
  const switchLink = isLogin ? '/auth/signup' : '/auth/login'
  const switchText = isLogin ? "Bạn chưa có tài khoản? Đăng ký" : "Bạn đã có tài khoản? Đăng nhập"

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8 overflow-hidden relative">
      {/* Background animated elements */}
      <div className="absolute inset-0 -z-10 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-primary/10 rounded-full blur-3xl opacity-20" />
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-accent/10 rounded-full blur-3xl opacity-20" />
      </div>

      <div className={`w-full max-w-6xl grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 items-center ${mounted ? 'animate-fadeInScale' : 'opacity-0'}`}>
        {/* Left side - Branding (hidden on mobile) */}
        <div className="hidden lg:flex flex-col justify-center items-start space-y-6 animate-slideInLeft">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-lg bg-gradient-to-r from-primary to-accent flex items-center justify-center">
                <Zap className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-3xl font-bold">AI Lab</h1>
            </div>
            <p className="text-lg text-muted-foreground">Học AI/ML bằng thực hành</p>
          </div>

          <div className="space-y-4">
            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-primary">✓</span>
              </div>
              <div>
                <p className="font-semibold">Không cần cài đặt</p>
                <p className="text-sm text-muted-foreground">Chạy trực tiếp trên trình duyệt</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-accent/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-accent">✓</span>
              </div>
              <div>
                <p className="font-semibold">Hoàn toàn miễn phí</p>
                <p className="text-sm text-muted-foreground">Open-source, không giới hạn</p>
              </div>
            </div>

            <div className="flex gap-3">
              <div className="w-10 h-10 rounded-lg bg-success/20 flex items-center justify-center flex-shrink-0">
                <span className="text-sm font-semibold text-success">✓</span>
              </div>
              <div>
                <p className="font-semibold">Học thực hành</p>
                <p className="text-sm text-muted-foreground">Từng bước với các lab hướng dẫn</p>
              </div>
            </div>
          </div>

          <div className="pt-6 border-t border-border">
            <p className="text-sm text-muted-foreground mb-2">Được phát triển bởi cộng đồng</p>
            <p className="text-xs text-muted-foreground">Tham gia ngay để bắt đầu hành trình AI/ML của bạn</p>
          </div>
        </div>

        {/* Right side - Form */}
        <div className="w-full max-w-md mx-auto lg:mx-0 animate-fadeInUp">
          {/* Card */}
          <div className="glassmorphism-strong rounded-2xl p-8 space-y-6">
            {/* Header */}
            <div className="space-y-2 text-center lg:text-left">
              <h2 className="text-3xl font-bold text-foreground">{title}</h2>
              {description && (
                <p className="text-muted-foreground text-sm">{description}</p>
              )}
            </div>

            {/* Form Content */}
            <div className="space-y-4">
              {children}
            </div>

            {/* Switch auth type */}
            <div className="text-center text-sm">
              <span className="text-muted-foreground">{switchText.split('?')[0]}? </span>
              <Link
                href={switchLink}
                className="font-semibold text-primary hover:text-primary/80 transition-colors"
              >
                {switchText.split('?')[1].trim()}
              </Link>
            </div>
          </div>

          {/* Footer */}
          <p className="text-xs text-muted-foreground text-center mt-6">
            Bằng cách tiếp tục, bạn đồng ý với{' '}
            <Link href="/terms" className="hover:text-primary transition-colors">
              Điều khoản dịch vụ
            </Link>
            {' '}và{' '}
            <Link href="/privacy" className="hover:text-primary transition-colors">
              Chính sách bảo mật
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
