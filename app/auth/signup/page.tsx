'use client'

import { useState } from 'react'
import { AuthLayout } from '@/components/auth/auth-layout'
import { AuthInput } from '@/components/auth/auth-input'
import { SocialButton } from '@/components/auth/social-button'
import { PasswordStrength } from '@/components/auth/password-strength'
import { Button } from '@/components/ui/button'
import { Mail, Lock, User, AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react'
import { useAuth } from '@/lib/auth-context'

export default function SignupPage() {
  const { signup, loginWithSocial } = useAuth()
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [agreeTerms, setAgreeTerms] = useState(false)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [signupError, setSignupError] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [signupSuccess, setSignupSuccess] = useState(false)

  const validateForm = () => {
    const newErrors: Record<string, string> = {}

    if (!name.trim()) {
      newErrors.name = 'Tên không được để trống'
    } else if (name.trim().length < 2) {
      newErrors.name = 'Tên phải có ít nhất 2 ký tự'
    }

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

    if (!confirmPassword) {
      newErrors.confirmPassword = 'Xác nhận mật khẩu không được để trống'
    } else if (password !== confirmPassword) {
      newErrors.confirmPassword = 'Mật khẩu xác nhận không khớp'
    }

    if (!agreeTerms) {
      newErrors.terms = 'Bạn phải đồng ý với điều khoản dịch vụ'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault()
    setSignupError('')

    if (!validateForm()) return

    setIsLoading(true)
    try {
      const result = await signup(name, email, password)
      if (result.success && result.user) {
        setSignupSuccess(true)
      } else {
        setSignupError(result.error || 'Đăng ký thất bại. Vui lòng thử lại.')
      }
    } catch (err: any) {
      setSignupError(err.message || 'Lỗi kết nối khi đăng ký.')
    } finally {
      setIsLoading(false)
    }
  }

  const [socialLoading, setSocialLoading] = useState<string | null>(null)

  const handleSocialSignup = async (provider: 'google' | 'github' | 'microsoft') => {
    setSocialLoading(provider)
    setSignupError('')
    try {
      const demoProfiles = {
        google: { name: 'Nguyễn Hoàng Nam (Google)', email: 'hoangnam.google@gmail.com', avatar: 'G' },
        github: { name: 'Hoàng Nam (GitHub)', email: 'hoangnam.github@gmail.com', avatar: '🐙' },
        microsoft: { name: 'Hoàng Nam (Microsoft)', email: 'hoangnam@outlook.com', avatar: 'M' },
      }
      const profile = demoProfiles[provider]
      const result = await loginWithSocial(provider, profile)
      if (result.success) {
        setSignupSuccess(true)
        setTimeout(() => {
          window.location.href = '/'
        }, 600)
      } else {
        setSignupError('Đăng ký mô phỏng thất bại.')
      }
    } catch {
      setSignupError('Lỗi đăng ký mô phỏng.')
    } finally {
      setSocialLoading(null)
    }
  }

  if (signupSuccess) {
    return (
      <AuthLayout title="Tạo tài khoản" description="Tham gia cộng đồng AI Lab" variant="signup">
        <div className="space-y-6 text-center py-6 animate-fadeInScale">
          <div className="w-16 h-16 rounded-full bg-success/20 flex items-center justify-center mx-auto text-success">
            <CheckCircle2 className="w-9 h-9" />
          </div>

          <div className="space-y-2">
            <h3 className="text-2xl font-bold text-foreground">Đăng ký thành công!</h3>
            <p className="text-sm text-muted-foreground max-w-sm mx-auto">
              Tài khoản <strong>{email}</strong> đã được khởi tạo và tự động kích hoạt phiên đăng nhập.
            </p>
          </div>

          <div className="p-3 rounded-xl border border-success/30 bg-success/10 text-xs text-foreground flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-success" />
            <span>Tài khoản người dùng đã sẵn sàng hoạt động</span>
          </div>

          <div className="space-y-2 pt-2">
            <Button
              onClick={() => {
                window.location.href = '/'
              }}
              className="w-full h-11 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm flex items-center justify-center gap-2"
            >
              <span>Vào hệ thống ngay</span>
              <ArrowRight className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              onClick={() => window.location.href = '/auth/login'}
              className="w-full h-10 text-xs"
            >
              Về trang đăng nhập
            </Button>
          </div>
        </div>
      </AuthLayout>
    )
  }

  return (
    <AuthLayout title="Tạo tài khoản" description="Tham gia cộng đồng AI Lab" variant="signup">
      <>
        {/* Error message banner */}
        {signupError && (
          <div className="mb-4 flex items-center gap-2 text-sm text-error bg-error/10 border border-error/30 rounded-lg p-3">
            <AlertCircle className="w-4 h-4 flex-shrink-0" />
            <span>{signupError}</span>
          </div>
        )}

        {/* Email & Password Signup Form */}
        <form onSubmit={handleSignup} className="space-y-4">
          <AuthInput
            label="Tên đầy đủ"
            type="text"
            placeholder="Nguyễn Văn A"
            value={name}
            onChange={setName}
            error={errors.name}
            icon={<User className="w-5 h-5" />}
            required
          />

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

          <div>
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
            {password && <PasswordStrength password={password} />}
          </div>

          <AuthInput
            label="Xác nhận mật khẩu"
            type="password"
            placeholder="••••••••"
            value={confirmPassword}
            onChange={setConfirmPassword}
            error={errors.confirmPassword}
            icon={<Lock className="w-5 h-5" />}
            required
          />

          {/* Terms checkbox */}
          <label className="flex items-start gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={agreeTerms}
              onChange={(e) => {
                setAgreeTerms(e.target.checked)
                if (e.target.checked && errors.terms) {
                  const newErrors = { ...errors }
                  delete newErrors.terms
                  setErrors(newErrors)
                }
              }}
              className="w-4 h-4 rounded border-2 border-border mt-0.5 accent-primary"
            />
            <span className="text-xs text-muted-foreground leading-relaxed">
              Tôi đồng ý với{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-primary hover:underline">
                Điều khoản dịch vụ
              </a>
              {' '}và{' '}
              <a href="#" onClick={(e) => e.preventDefault()} className="text-primary hover:underline">
                Chính sách bảo mật
              </a>
            </span>
          </label>

          {errors.terms && (
            <div className="flex items-center gap-2 text-xs text-error">
              <AlertCircle className="w-3.5 h-3.5" />
              {errors.terms}
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-11 font-semibold"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center gap-2">
                <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                Đang khởi tạo tài khoản...
              </div>
            ) : (
              'Tạo tài khoản'
            )}
          </Button>
        </form>

        {/* Divider */}
        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="px-2 bg-background text-muted-foreground">Hoặc đăng ký bằng</span>
          </div>
        </div>

        {/* Social Signup */}
        <div className="grid grid-cols-3 gap-3">
          <SocialButton
            provider="google"
            onClick={() => handleSocialSignup('google')}
            isLoading={socialLoading === 'google'}
            disabled={isLoading || !!socialLoading}
          />
          <SocialButton
            provider="github"
            onClick={() => handleSocialSignup('github')}
            isLoading={socialLoading === 'github'}
            disabled={isLoading || !!socialLoading}
          />
          <SocialButton
            provider="microsoft"
            onClick={() => handleSocialSignup('microsoft')}
            isLoading={socialLoading === 'microsoft'}
            disabled={isLoading || !!socialLoading}
          />
        </div>
      </>
    </AuthLayout>
  )
}
