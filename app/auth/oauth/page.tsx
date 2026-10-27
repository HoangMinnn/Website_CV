'use client'

import { useState, useEffect, Suspense } from 'react'
import { useSearchParams, useRouter } from 'next/navigation'
import { useAuth } from '@/lib/auth-context'
import { ArrowLeft, CheckCircle2, Shield, Loader2, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'

type ProviderType = 'google' | 'github' | 'microsoft'

const PROVIDER_INFO: Record<ProviderType, {
  name: string
  color: string
  bgBadge: string
  demoName: string
  demoEmail: string
  avatar: string
  icon: (className?: string) => React.ReactNode
}> = {
  google: {
    name: 'Google',
    color: 'text-red-500',
    bgBadge: 'bg-red-500/10 border-red-500/30 text-red-600 dark:text-red-400',
    demoName: 'Nguyễn Hoàng Nam (Google)',
    demoEmail: 'hoangnam.google@gmail.com',
    avatar: 'G',
    icon: (cls = 'w-8 h-8') => (
      <svg className={cls} viewBox="0 0 24 24">
        <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4" />
        <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" />
        <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05" />
        <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" />
      </svg>
    ),
  },
  github: {
    name: 'GitHub',
    color: 'text-zinc-100',
    bgBadge: 'bg-zinc-800/80 border-zinc-700 text-zinc-100',
    demoName: 'Hoàng Nam (GitHub)',
    demoEmail: 'hoangnam.github@gmail.com',
    avatar: '🐙',
    icon: (cls = 'w-8 h-8') => (
      <svg className={`${cls} fill-current`} viewBox="0 0 24 24">
        <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v 3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z" />
      </svg>
    ),
  },
  microsoft: {
    name: 'Microsoft',
    color: 'text-blue-500',
    bgBadge: 'bg-blue-500/10 border-blue-500/30 text-blue-600 dark:text-blue-400',
    demoName: 'Hoàng Nam (Microsoft)',
    demoEmail: 'hoangnam@outlook.com',
    avatar: 'M',
    icon: (cls = 'w-8 h-8') => (
      <svg className={cls} viewBox="0 0 24 24">
        <path d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z" fill="#00a4ef" />
      </svg>
    ),
  },
}

function OAuthSimulatorContent() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { loginWithSocial } = useAuth()

  const rawProvider = (searchParams.get('provider') as ProviderType) || 'google'
  const returnUrl = searchParams.get('returnUrl') || '/'
  const provider = ['google', 'github', 'microsoft'].includes(rawProvider) ? rawProvider : 'google'
  const info = PROVIDER_INFO[provider]

  const [isLoading, setIsLoading] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)

  const handleSimulateLogin = async () => {
    setIsLoading(true)
    try {
      const result = await loginWithSocial(provider, {
        name: info.demoName,
        email: info.demoEmail,
        avatar: info.avatar,
      })
      if (result.success) {
        setIsSuccess(true)
        setTimeout(() => {
          window.location.href = returnUrl
        }, 600)
      }
    } finally {
      setIsLoading(false)
    }
  }

  // Auto-complete simulation after 700ms for convenience
  useEffect(() => {
    const timer = setTimeout(() => {
      handleSimulateLogin()
    }, 700)
    return () => clearTimeout(timer)
  }, [provider])

  return (
    <div className="min-h-screen bg-background flex flex-col justify-between p-4 sm:p-6">
      <header className="max-w-md mx-auto w-full">
        <button
          onClick={() => router.push('/auth/login')}
          className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors py-2"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Quay lại trang Đăng nhập</span>
        </button>
      </header>

      <main className="max-w-md mx-auto w-full my-auto animate-fadeInScale">
        <div className="rounded-2xl border border-border/80 bg-card p-6 sm:p-8 shadow-xl text-center space-y-6">
          {/* Provider Icon */}
          <div className="w-16 h-16 rounded-2xl bg-muted/40 border border-border/60 flex items-center justify-center mx-auto shadow-inner">
            {info.icon('w-9 h-9')}
          </div>

          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-medium border mb-1 bg-primary/10 border-primary/20 text-primary">
              <Sparkles className="w-3 h-3" />
              <span>Đăng nhập mô phỏng (Demo)</span>
            </div>
            <h2 className="text-xl font-bold text-foreground">
              Xác thực qua {info.name}
            </h2>
            <p className="text-xs text-muted-foreground">
              Mô phỏng phiên kết nối OAuth 2.0 nhanh cho nền tảng AI Lab
            </p>
          </div>

          {/* Account Profile Preview */}
          <div className="p-3.5 rounded-xl border border-border/60 bg-muted/20 text-left flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/20 border border-primary/30 flex items-center justify-center font-bold text-sm text-primary">
              {info.avatar}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold text-foreground truncate">{info.demoName}</p>
              <p className="text-[11px] font-mono text-muted-foreground truncate">{info.demoEmail}</p>
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded bg-muted text-muted-foreground uppercase font-medium">
              Demo
            </span>
          </div>

          {/* Action State */}
          {isSuccess ? (
            <div className="py-2 flex items-center justify-center gap-2 text-xs font-medium text-green-600 dark:text-green-400 animate-fadeInUp">
              <CheckCircle2 className="w-4 h-4" />
              <span>Đăng nhập thành công! Đang chuyển hướng...</span>
            </div>
          ) : (
            <div className="space-y-2">
              <Button
                onClick={handleSimulateLogin}
                disabled={isLoading}
                className="w-full h-10 text-xs font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center justify-center gap-2"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Đang kết nối vào hệ thống...</span>
                  </>
                ) : (
                  <>
                    <Shield className="w-4 h-4" />
                    <span>Đăng nhập ngay với {info.name}</span>
                  </>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => router.push('/auth/login')}
                className="w-full text-xs text-muted-foreground hover:text-foreground h-8"
              >
                Hủy bỏ
              </Button>
            </div>
          )}
        </div>
      </main>

      <footer className="text-center text-xs text-muted-foreground py-2">
        <p className="text-[11px]">© AI Lab - Hệ thống kiểm thử thị giác máy tính &amp; mô hình AI</p>
      </footer>
    </div>
  )
}

export default function OAuthPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-background flex items-center justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </div>
      }
    >
      <OAuthSimulatorContent />
    </Suspense>
  )
}
