'use client'

import Link from 'next/link'
import { Moon, Sun, Code2, LogOut, Shield } from 'lucide-react'
import { useEffect, useState } from 'react'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/lib/auth-context'

export function Navbar() {
  const { user, isAuthenticated, logout } = useAuth()
  const [isDark, setIsDark] = useState(true)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    const isDarkMode = document.documentElement.classList.contains('dark') ||
      (!document.documentElement.classList.contains('light') &&
        window.matchMedia('(prefers-color-scheme: dark)').matches)
    setIsDark(isDarkMode)
  }, [])

  const toggleTheme = () => {
    if (!mounted) return
    if (isDark) {
      document.documentElement.classList.remove('dark')
      document.documentElement.classList.add('light')
    } else {
      document.documentElement.classList.remove('light')
      document.documentElement.classList.add('dark')
    }
    setIsDark(!isDark)
  }

  if (!mounted) return null

  return (
    <nav className="sticky top-0 z-50 border-b border-border bg-background/80 backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex items-center justify-between h-16">
        {/* Logo and Name */}
        <Link href="/" className="flex items-center gap-2 hover:opacity-80 transition-opacity">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
            <span className="font-bold text-white text-sm">AI</span>
          </div>
          <span className="font-bold text-lg hidden sm:inline">AI Lab</span>
        </Link>

        {/* Navigation Links */}
        <div className="hidden md:flex items-center gap-1">
          <Link href="/">
            <Button variant="ghost" size="sm">Playground</Button>
          </Link>
          <Link href="/data-lab">
            <Button variant="ghost" size="sm">Data Lab</Button>
          </Link>
          <Link href="/visualizer">
            <Button variant="ghost" size="sm">Visualizer</Button>
          </Link>
          <Link href="/labs">
            <Button variant="ghost" size="sm">Labs</Button>
          </Link>
          {isAuthenticated && user?.role === 'admin' && (
            <Link href="/admin">
              <Button variant="ghost" size="sm" className="text-amber-500 hover:text-amber-400">
                Admin Panel
              </Button>
            </Link>
          )}
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-lg"
            aria-label="Toggle theme"
          >
            {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </Button>
          <a href="https://github.com" target="_blank" rel="noopener noreferrer">
            <Button variant="ghost" size="icon" className="rounded-lg">
              <Code2 className="w-4 h-4" />
            </Button>
          </a>

          {/* Authentication State: Show Account Name & Info when logged in, Login buttons when not */}
          {isAuthenticated && user ? (
            <div className="flex items-center gap-2">
              {/* Account Info Badge */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-border bg-card/80">
                <div className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold text-white ${
                  user.role === 'admin'
                    ? 'bg-gradient-to-br from-amber-500 to-orange-600'
                    : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                }`}>
                  {user.name.charAt(0).toUpperCase()}
                </div>
                <div className="flex flex-col text-left">
                  <span className="text-xs font-semibold text-foreground leading-tight">
                    {user.name}
                  </span>
                  <span className="text-[10px] text-muted-foreground leading-tight">
                    {user.role === 'admin' ? 'Quản trị viên' : 'Người dùng'}
                  </span>
                </div>
              </div>

              {/* Quick Admin Navigation Button for Admin */}
              {user.role === 'admin' && (
                <Link href="/admin" className="hidden sm:block">
                  <Button variant="outline" size="sm" className="rounded-lg border-amber-500/40 text-amber-500 hover:bg-amber-500/10 gap-1 text-xs">
                    <Shield className="w-3.5 h-3.5" />
                    Quản trị
                  </Button>
                </Link>
              )}

              {/* Logout Button */}
              <Button
                variant="ghost"
                size="sm"
                onClick={logout}
                className="rounded-lg text-muted-foreground hover:text-destructive hover:bg-destructive/10 gap-1 text-xs"
                title="Đăng xuất"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Đăng xuất</span>
              </Button>
            </div>
          ) : (
            <>
              <Link href="/auth/login" className="hidden sm:block">
                <Button variant="outline" size="sm" className="rounded-lg">
                  Đăng nhập
                </Button>
              </Link>
              <Link href="/auth/signup">
                <Button size="sm" className="rounded-lg bg-primary hover:bg-primary/90">
                  Bắt đầu
                </Button>
              </Link>
            </>
          )}
        </div>
      </div>
    </nav>
  )
}
