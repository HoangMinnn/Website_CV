'use client'

import { useState } from 'react'
import { useAuth } from '@/lib/auth-context'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthInput } from '@/components/auth/auth-input'
import { SocialButton } from '@/components/auth/social-button'
import { Button } from '@/components/ui/button'
import {
  Mail,
  Lock,
  CheckCircle,
  AlertTriangle,
  Zap,
  ArrowRight,
  KeyRound,
  ShieldAlert,
  Sparkles
} from 'lucide-react'

export default function LoginPage() {
  const { login, loginWithSocial, loginWithMagicLink } = useAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [isLoading, setIsLoading] = useState(false)
  const [showMagicLink, setShowMagicLink] = useState(false)
  const [magicLinkEmail, setMagicLinkEmail] = useState('')
  const [magicLinkSent, setMagicLinkSent] = useState(false)
  const [showForgotPassword, setShowForgotPassword] = useState(false)
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('')
  const [forgotPasswordSent, setForgotPasswordSent] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [loginError, setLoginError] = useState('')

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!email.trim()) {
      newErrors.email = 'Email không được để trống'
    } else if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      newErrors.email = 'Email không hợp lệ (ví dụ: ban@gmail.com)'
    }

    if (!password) {
      newErrors.password = 'Mật khẩu không được để trống'
    } else if (password.length < 6) {
      newErrors.password = 'Mật khẩu phải có ít nhất 6 ký tự'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validateForm()) return

    setIsLoading(true)
    setLoginError('')
    try {
      const result = await login(email, password)
      if (result.success) {
        setLoginSuccess(true)
        setTimeout(() => {
          if (result.role === 'admin') {
            window.location.href = '/admin'
          } else {
            window.location.href = '/'
          }
        }, 800)
      } else {
        setLoginError(result.error || 'Đăng nhập thất bại')
      }
    } finally {
      setIsLoading(false)
    }
  }

  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSocialLogin = async (provider: 'google' | 'github' | 'microsoft') => {
    setSocialLoading(provider)
    setLoginError('')
    try {
      const demoProfiles = {
        google: { name: 'Nguyễn Hoàng Nam (Google)', email: 'hoangnam.google@gmail.com', avatar: 'G' },
        github: { name: 'Hoàng Nam (GitHub)', email: 'hoangnam.github@gmail.com', avatar: '🐙' },
        microsoft: { name: 'Hoàng Nam (Microsoft)', email: 'hoangnam@outlook.com', avatar: 'M' },
      }
      const profile = demoProfiles[provider]
      const result = await loginWithSocial(provider, profile)
      if (result.success) {
        setLoginSuccess(true)
        setTimeout(() => {
          window.location.href = '/'
        }, 600)
      } else {
        setLoginError('Đăng nhập mô phỏng thất bại.')
      }
    } catch {
      setLoginError('Lỗi đăng nhập mô phỏng.')
    } finally {
      setSocialLoading(null)
    }
  }

  const handleSendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!magicLinkEmail.trim()) {
      setErrors({ magicLink: 'Email không được để trống' })
      return
    }

    if (!magicLinkEmail.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setErrors({ magicLink: 'Email không hợp lệ' })
      return
    }

    setIsLoading(true)
    try {
      await new Promise((resolve) => setTimeout(resolve, 800))
      setMagicLinkSent(true)
    } finally {
      setIsLoading(false)
    }
  }

  const handleExecuteMagicLogin = async () => {
    setIsLoading(true)
    try {
      const result = await loginWithMagicLink(magicLinkEmail)
      if (result.success) {
        setLoginSuccess(true)
        setTimeout(() => {
          if (result.role === 'admin') {
            window.location.href = '/admin'
          } else {
            window.location.href = '/'
          }
        }, 800)
      }
    } finally {
      setIsLoading(false)
    }
  }

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!forgotPasswordEmail.trim() || !forgotPasswordEmail.includes('@')) {
      setErrors({ forgot: 'Vui lòng nhập email hợp lệ' })
      return
    }
    setIsLoading(true)
    await new Promise((resolve) => setTimeout(resolve, 800))
    setIsLoading(false)
    setForgotPasswordSent(true)
  }

  const handleAutoFillDemo = (demoType: 'user' | 'admin') => {
    if (demoType === 'user') {
      setEmail('user@ailab.com')
      setPassword('user123')
    } else {
      setEmail('admin@ailab.com')
      setPassword('admin123')
    }
    setLoginError('')
    setErrors({})
  }

  if (loginSuccess) {
    return (
      <AuthLayout title="Đăng nhập" description="Bắt đầu hành trình AI/ML của bạn" variant="login">
        <div className="space-y-4 text-center py-6 animate-fadeInScale">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto text-success">
            <CheckCircle className="w-9 h-9" />
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">Đăng nhập thành công!</h3>
            <p className="text-xs text-muted-foreground mt-1">
              Đang chuyển hướng vào hệ thống...
            </p>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Đăng nhập" description="Bắt đầu hành trình AI/ML của bạn" variant="login">
      {/* 1. Forgot Password Modal/View */}
      {showForgotPassword ? (
        <div className="space-y-4">
          <div className="text-left pb-1">
            <h4 className="text-sm font-semibold text-foreground flex items-center gap-1.5">
              <KeyRound className="w-4 h-4 text-primary" />
              Khôi phục mật khẩu
            </h4>
            <p className="text-xs text-muted-foreground mt-0.5">
              Nhập email đăng ký của bạn để nhận liên kết đặt lại mật khẩu.
            </p>
          </div>

          {forgotPasswordSent ? (
            <div className="p-4 rounded-xl border border-success/30 bg-success/10 text-center space-y-3">
              <span className="text-2xl">✉️</span>
              <p className="text-xs text-foreground font-medium">
                Đã gửi hướng dẫn khôi phục mật khẩu đến <strong>{forgotPasswordEmail}</strong>. Vui lòng kiểm tra hộp thư của bạn.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="w-full text-xs"
                onClick={() => {
                  setShowForgotPassword(false)
                  setForgotPasswordSent(false)
                  setForgotPasswordEmail('')
                }}
              >
                Quay lại đăng nhập
              </Button>
            </div>
          ) : (
            <form onSubmit={handleForgotPassword} className="space-y-4">
              <AuthInput
                label="Email của bạn"
                type="email"
                placeholder="bạn@example.com"
                value={forgotPasswordEmail}
                onChange={setForgotPasswordEmail}
                error={errors.forgot}
                icon={<Mail className="w-5 h-5" />}
                required
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Đang gửi...' : 'Gửi liên kết khôi phục'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  setShowForgotPassword(false)
                  setErrors({})
                }}
              >
                Hủy &amp; Quay lại
              </Button>
            </form>
          )}
        </div>
      ) : showMagicLink ? (
        /* 2. Magic Link View */
        <>
          {magicLinkSent ? (
            <div className="space-y-4 text-center py-2 animate-fadeInScale">
              <div className="w-14 h-14 rounded-full bg-success/20 flex items-center justify-center mx-auto text-success">
                <CheckCircle className="w-7 h-7" />
              </div>
              <div className="space-y-1">
                <h3 className="font-semibold text-foreground text-sm">Liên kết đăng nhập đã sẵn sàng</h3>
                <p className="text-xs text-muted-foreground">
                  Hệ thống đã gửi liên kết đăng nhập an toàn đến hòm thư:
                </p>
                <p className="text-xs font-mono font-bold text-primary">{magicLinkEmail}</p>
              </div>

              {/* Instant Simulated Action Button */}
              <div className="p-3 rounded-xl border border-primary/30 bg-primary/10 text-left space-y-2">
                <p className="text-[11px] text-muted-foreground flex items-center gap-1 font-medium text-foreground">
                  <Sparkles className="w-3.5 h-3.5 text-primary" />
                  Mô phỏng trải nghiệm người dùng:
                </p>
                <Button
                  onClick={handleExecuteMagicLogin}
                  disabled={isLoading}
                  className="w-full text-xs h-9 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold flex items-center justify-center gap-2"
                >
                  <Zap className="w-3.5 h-3.5" />
                  <span>Xác thực liên kết Email &amp; Đăng nhập ngay</span>
                </Button>
              </div>

              <Button
                variant="ghost"
                size="sm"
                className="w-full text-xs text-muted-foreground hover:text-foreground"
                onClick={() => {
                  setShowMagicLink(false)
                  setMagicLinkSent(false)
                  setMagicLinkEmail('')
                }}
              >
                Quay lại phương thức khác
              </Button>
            </div>
          ) : (
            <form onSubmit={handleSendMagicLink} className="space-y-4">
              <div className="text-left pb-1">
                <h4 className="text-sm font-semibold text-foreground">Đăng nhập không cần mật khẩu</h4>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Nhập email của bạn, hệ thống sẽ gửi đường dẫn đăng nhập an toàn trực tiếp vào hộp thư.
                </p>
              </div>

              <AuthInput
                label="Email của bạn"
                type="email"
                placeholder="bạn@example.com"
                value={magicLinkEmail}
                onChange={setMagicLinkEmail}
                error={errors.magicLink}
                icon={<Mail className="w-5 h-5" />}
                required
              />

              <Button type="submit" className="w-full" disabled={isLoading}>
                {isLoading ? 'Đang gửi...' : 'Gửi liên kết đăng nhập'}
              </Button>

              <Button
                type="button"
                variant="outline"
                className="w-full text-xs"
                onClick={() => {
                  setShowMagicLink(false)
                  setErrors({})
                }}
              >
                Quay lại đăng nhập bằng mật khẩu
              </Button>
            </form>
          )}
        </>
      ) : (
        /* 3. Standard Login View */
        <>
          {/* Error Message */}
          {loginError && (
            <div className="flex items-center gap-2 text-xs text-error bg-error/10 border border-error/30 rounded-lg p-3">
              <AlertTriangle className="w-4 h-4 flex-shrink-0" />
              <span>{loginError}</span>
            </div>
          )}

          {/* Email & Password Login */}
          <form onSubmit={handleLogin} className="space-y-4">
            <AuthInput
              label="Email"
              type="email"
              placeholder="bạn@example.com"
              value={email}
              onChange={setEmail}
              error={errors.email}
              icon={<Mail className="w-5 h-5" />}
              required
            />

            <AuthInput
              label="Mật khẩu"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={setPassword}
              error={errors.password}
              icon={<Lock className="w-5 h-5" />}
              required
            />

            <div className="flex items-center justify-between text-xs">
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded border-border accent-primary" />
                <span className="text-muted-foreground">Nhớ phiên đăng nhập</span>
              </label>
              <button
                type="button"
                onClick={() => setShowForgotPassword(true)}
                className="font-medium text-primary hover:text-primary/80 transition-colors"
              >
                Quên mật khẩu?
              </button>
            </div>

            <Button
              type="submit"
              className="w-full h-11 font-semibold"
              disabled={isLoading}
            >
              {isLoading ? (
                <div className="flex items-center gap-2 text-xs">
                  <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                  Đang xác thực tài khoản...
                </div>
              ) : (
                'Đăng nhập'
              )}
            </Button>
          </form>

          {/* Divider */}
          <div className="relative my-2">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-border" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="px-2 bg-background text-muted-foreground">Hoặc tiếp tục bằng</span>
            </div>
          </div>

          {/* Social Login */}
          <div className="grid grid-cols-3 gap-3">
            <SocialButton
              provider="google"
              onClick={() => handleSocialLogin('google')}
              isLoading={socialLoading === 'google'}
              disabled={isLoading || !!socialLoading}
            />
            <SocialButton
              provider="github"
              onClick={() => handleSocialLogin('github')}
              isLoading={socialLoading === 'github'}
              disabled={isLoading || !!socialLoading}
            />
            <SocialButton
              provider="microsoft"
              onClick={() => handleSocialLogin('microsoft')}
              isLoading={socialLoading === 'microsoft'}
              disabled={isLoading || !!socialLoading}
            />
          </div>

          {/* Magic Link Option */}
          <Button
            type="button"
            variant="outline"
            className="w-full flex items-center justify-center gap-2 text-xs h-10"
            onClick={() => setShowMagicLink(true)}
            disabled={isLoading}
          >
            <Mail className="w-4 h-4 text-primary" />
            Đăng nhập qua liên kết Email
          </Button>

          {/* Interactive Demo Account Auto-fill Cards */}
          <div className="pt-2">
            <div className="rounded-xl border border-border/60 bg-muted/20 p-3 text-xs space-y-2">
              <div className="flex items-center justify-between">
                <p className="font-semibold text-foreground flex items-center gap-1.5 text-xs">
                  <span>📌</span>
                  <span>Tài khoản kiểm thử nhanh (Bấm để điền):</span>
                </p>
                <span className="text-[10px] text-primary font-medium">1-Click AutoFill</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                {/* 1. User Demo Account */}
                <button
                  type="button"
                  onClick={() => handleAutoFillDemo('user')}
                  className="p-2 rounded-lg border border-border/80 hover:border-primary/60 bg-card/60 hover:bg-muted/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-foreground group-hover:text-primary">
                      1. Người dùng (User)
                    </span>
                    <span className="text-[10px] text-muted-foreground group-hover:text-primary">
                      Chọn &rarr;
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    user@ailab.com
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">Pass: user123</p>
                </button>

                {/* 2. Admin Demo Account */}
                <button
                  type="button"
                  onClick={() => handleAutoFillDemo('admin')}
                  className="p-2 rounded-lg border border-border/80 hover:border-amber-500/60 bg-card/60 hover:bg-muted/40 text-left transition-all group"
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-bold text-foreground group-hover:text-amber-500">
                      2. Quản trị (Admin)
                    </span>
                    <span className="text-[10px] text-muted-foreground group-hover:text-amber-500">
                      Chọn &rarr;
                    </span>
                  </div>
                  <p className="text-[11px] font-mono text-muted-foreground truncate">
                    admin@ailab.com
                  </p>
                  <p className="text-[10px] font-mono text-muted-foreground">Pass: admin123</p>
                </button>
              </div>
            </div>
          </div>
        </>
      )}
    </AuthLayout>
  )
}
