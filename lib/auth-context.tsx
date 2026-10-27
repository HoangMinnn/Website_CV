'use client'

import { createContext, useContext, useState, useEffect, ReactNode } from 'react'

export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  name: string
  email: string
  role: UserRole
  avatar?: string
  provider?: 'email' | 'google' | 'github' | 'microsoft' | 'magic-link'
}

interface AuthContextType {
  user: User | null
  isLoading: boolean
  role: UserRole | null
  isAdmin: boolean
  isAuthenticated: boolean
  login: (email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User; role?: UserRole }>
  signup: (name: string, email: string, password: string) => Promise<{ success: boolean; error?: string; user?: User }>
  loginWithSocial: (provider: 'google' | 'github' | 'microsoft', customProfile?: { name?: string; email?: string; avatar?: string }) => Promise<{ success: boolean; user?: User; role?: UserRole }>
  loginWithMagicLink: (email: string) => Promise<{ success: boolean; error?: string; user?: User; role?: UserRole }>
  logout: () => void
  canAccess: (requiredRole?: UserRole) => boolean
  updateUserRole: (email: string, role: UserRole) => boolean
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

// Built-in accounts with predetermined roles for authentication and testing
const DEFAULT_ACCOUNTS: Record<string, { password: string; user: User }> = {
  'admin@ailab.com': {
    password: 'admin123',
    user: {
      id: 'admin-1',
      name: 'Admin AI Lab',
      email: 'admin@ailab.com',
      role: 'admin',
      provider: 'email',
    },
  },
  'user@ailab.com': {
    password: 'user123',
    user: {
      id: 'user-1',
      name: 'Người dùng AI Lab',
      email: 'user@ailab.com',
      role: 'user',
      provider: 'email',
    },
  },
}

export function getStoredAccounts(): Record<string, { password: string; user: User }> {
  if (typeof window === 'undefined') return DEFAULT_ACCOUNTS
  try {
    const raw = localStorage.getItem('ai-lab-accounts')
    if (raw) {
      const parsed = JSON.parse(raw)
      return { ...DEFAULT_ACCOUNTS, ...parsed }
    }
  } catch (e) {
    console.warn('Failed to parse stored accounts:', e)
  }
  return DEFAULT_ACCOUNTS
}

export function saveStoredAccounts(accounts: Record<string, { password: string; user: User }>) {
  if (typeof window === 'undefined') return
  try {
    localStorage.setItem('ai-lab-accounts', JSON.stringify(accounts))
  } catch (e) {
    console.warn('Failed to save accounts to storage:', e)
  }
}

/**
 * Update user role directly in the database (stored accounts).
 * Admin permissions can only be granted via database modification.
 */
export function updateUserRoleInDb(email: string, role: UserRole): boolean {
  if (typeof window === 'undefined') return false
  const normalizedEmail = email.toLowerCase().trim()
  const accounts = getStoredAccounts()
  if (!accounts[normalizedEmail]) {
    return false
  }

  accounts[normalizedEmail].user.role = role
  saveStoredAccounts(accounts)

  // If this modified user is the active user in session, update session
  try {
    const rawUser = localStorage.getItem('ai-lab-user')
    if (rawUser) {
      const activeUser: User = JSON.parse(rawUser)
      if (activeUser.email.toLowerCase().trim() === normalizedEmail) {
        activeUser.role = role
        localStorage.setItem('ai-lab-user', JSON.stringify(activeUser))
        document.cookie = `auth-role=${role}; path=/; max-age=604800`
      }
    }
  } catch (e) {
    console.error(e)
  }

  // Dispatch an event so listening components can re-render immediately
  window.dispatchEvent(new CustomEvent('ai-lab-database-updated', { detail: { email: normalizedEmail, role } }))
  return true
}

export function getDbUsers(): User[] {
  const accounts = getStoredAccounts()
  return Object.values(accounts).map((acc) => acc.user)
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    // Check for saved session in localStorage
    const savedUser = localStorage.getItem('ai-lab-user')
    if (savedUser) {
      try {
        const parsed: User = JSON.parse(savedUser)
        setUser(parsed)
        document.cookie = `auth-role=${parsed.role}; path=/; max-age=604800`
      } catch {
        localStorage.removeItem('ai-lab-user')
      }
    }
    // Ensure default accounts exist in storage
    const accounts = getStoredAccounts()
    saveStoredAccounts(accounts)

    // Listen to database updates from other parts of the application
    const handleDbUpdate = (e: Event) => {
      const customEvent = e as CustomEvent<{ email: string; role: UserRole }>
      const currentRaw = localStorage.getItem('ai-lab-user')
      if (currentRaw) {
        try {
          const current: User = JSON.parse(currentRaw)
          if (customEvent.detail && current.email.toLowerCase() === customEvent.detail.email.toLowerCase()) {
            setUser({ ...current, role: customEvent.detail.role })
          }
        } catch {}
      }
    }

    window.addEventListener('ai-lab-database-updated', handleDbUpdate)
    setIsLoading(false)

    return () => {
      window.removeEventListener('ai-lab-database-updated', handleDbUpdate)
    }
  }, [])

  const login = async (
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User; role?: UserRole }> => {
    // Realistic verification delay
    await new Promise((resolve) => setTimeout(resolve, 600))

    const normalizedEmail = email.toLowerCase().trim()
    const accounts = getStoredAccounts()
    const account = accounts[normalizedEmail]

    if (!account) {
      return {
        success: false,
        error: 'Email không tồn tại trong hệ thống. Vui lòng đăng ký tài khoản mới.',
      }
    }

    if (account.password !== password) {
      return {
        success: false,
        error: 'Mật khẩu không chính xác. Vui lòng kiểm tra lại.',
      }
    }

    const authenticatedUser = account.user
    setUser(authenticatedUser)
    localStorage.setItem('ai-lab-user', JSON.stringify(authenticatedUser))
    document.cookie = `auth-role=${authenticatedUser.role}; path=/; max-age=604800`

    return {
      success: true,
      user: authenticatedUser,
      role: authenticatedUser.role,
    }
  }

  const signup = async (
    name: string,
    email: string,
    password: string
  ): Promise<{ success: boolean; error?: string; user?: User }> => {
    await new Promise((resolve) => setTimeout(resolve, 800))

    const normalizedEmail = email.toLowerCase().trim()
    const accounts = getStoredAccounts()

    if (accounts[normalizedEmail]) {
      return {
        success: false,
        error: 'Email này đã được đăng ký. Vui lòng đăng nhập hoặc sử dụng email khác.',
      }
    }

    // Role is STRICTLY 'user' upon registration.
    // Admin privileges can only be granted when modified in the database.
    const newUser: User = {
      id: `user-${Date.now()}`,
      name: name.trim(),
      email: normalizedEmail,
      role: 'user',
      provider: 'email',
    }

    // Save to persistent database (storage)
    accounts[normalizedEmail] = {
      password,
      user: newUser,
    }
    saveStoredAccounts(accounts)

    // Set current session
    setUser(newUser)
    localStorage.setItem('ai-lab-user', JSON.stringify(newUser))
    document.cookie = `auth-role=${newUser.role}; path=/; max-age=604800`

    return { success: true, user: newUser }
  }

  const loginWithSocial = async (
    provider: 'google' | 'github' | 'microsoft',
    customProfile?: { name?: string; email?: string; avatar?: string }
  ): Promise<{ success: boolean; user?: User; role?: UserRole }> => {
    await new Promise((resolve) => setTimeout(resolve, 500))

    const providerDisplayNames: Record<string, string> = {
      google: 'Google User',
      github: 'GitHub Developer',
      microsoft: 'Microsoft Pro',
    }

    const socialEmail = customProfile?.email?.toLowerCase().trim() || `user@${provider}.demo`
    const displayName = customProfile?.name?.trim() || providerDisplayNames[provider] || `${provider} User`
    const avatar = customProfile?.avatar
    const accounts = getStoredAccounts()

    let socialUser: User
    if (accounts[socialEmail]) {
      socialUser = accounts[socialEmail].user
      if (customProfile?.name) socialUser.name = displayName
      if (avatar) socialUser.avatar = avatar
      accounts[socialEmail].user = socialUser
      saveStoredAccounts(accounts)
    } else {
      // New user via social login always defaults to 'user'
      socialUser = {
        id: `${provider}-${Date.now()}`,
        name: displayName,
        email: socialEmail,
        role: 'user',
        avatar,
        provider,
      }
      accounts[socialEmail] = {
        password: `oauth-${provider}-token`,
        user: socialUser,
      }
      saveStoredAccounts(accounts)
    }

    setUser(socialUser)
    localStorage.setItem('ai-lab-user', JSON.stringify(socialUser))
    document.cookie = `auth-role=${socialUser.role}; path=/; max-age=604800`

    window.dispatchEvent(new CustomEvent('ai-lab-database-updated', { detail: { email: socialEmail, role: socialUser.role } }))

    return { success: true, user: socialUser, role: socialUser.role }
  }

  const loginWithMagicLink = async (
    email: string
  ): Promise<{ success: boolean; error?: string; user?: User; role?: UserRole }> => {
    await new Promise((resolve) => setTimeout(resolve, 600))

    const normalizedEmail = email.toLowerCase().trim()
    const accounts = getStoredAccounts()

    let magicUser: User
    if (accounts[normalizedEmail]) {
      magicUser = accounts[normalizedEmail].user
    } else {
      // New user via magic link always defaults to 'user'.
      // Admin privileges are only granted when modified in the database.
      magicUser = {
        id: `magic-${Date.now()}`,
        name: normalizedEmail.split('@')[0],
        email: normalizedEmail,
        role: 'user',
        provider: 'magic-link',
      }
      accounts[normalizedEmail] = {
        password: 'magic-link-token',
        user: magicUser,
      }
      saveStoredAccounts(accounts)
    }

    setUser(magicUser)
    localStorage.setItem('ai-lab-user', JSON.stringify(magicUser))
    document.cookie = `auth-role=${magicUser.role}; path=/; max-age=604800`

    return { success: true, user: magicUser, role: magicUser.role }
  }

  const logout = () => {
    setUser(null)
    localStorage.removeItem('ai-lab-user')
    document.cookie = 'auth-role=; path=/; max-age=0'
    if (typeof window !== 'undefined') {
      window.location.href = '/auth/login'
    }
  }

  const canAccess = (requiredRole?: UserRole): boolean => {
    if (!user) return false
    if (!requiredRole) return true
    if (requiredRole === 'admin') return user.role === 'admin'
    return true
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        role: user?.role ?? null,
        isLoading,
        isAdmin: user?.role === 'admin',
        isAuthenticated: !!user,
        login,
        signup,
        loginWithSocial,
        loginWithMagicLink,
        logout,
        canAccess,
        updateUserRole: updateUserRoleInDb,
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}
