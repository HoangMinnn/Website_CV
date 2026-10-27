'use client'

import { useState, useEffect } from 'react'
import { useAuth, getStoredAccounts, updateUserRoleInDb, UserRole, User } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { RoleBadge } from '@/components/auth/role-badge'
import { Navbar } from '@/components/navbar'
import {
  Users, Activity, Database, FlaskConical,
  Shield, TrendingUp, BarChart3, Settings,
  Eye, Trash2, UserPlus, FileText,
  Clock, CheckCircle2, AlertTriangle, ShieldCheck, UserCheck, RefreshCw
} from 'lucide-react'

// Simulated data
const stats = [
  { label: 'Tổng người dùng', value: '1,247', icon: Users, change: '+12%', color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Bài Lab hoàn thành', value: '8,521', icon: FlaskConical, change: '+23%', color: 'text-green-500', bg: 'bg-green-500/10' },
  { label: 'Model đã train', value: '3,892', icon: Activity, change: '+18%', color: 'text-purple-500', bg: 'bg-purple-500/10' },
  { label: 'Dataset tải lên', value: '654', icon: Database, change: '+7%', color: 'text-amber-500', bg: 'bg-amber-500/10' },
]

interface DisplayUser {
  name: string
  email: string
  role: UserRole
  status: 'active' | 'inactive'
  joinDate: string
  isFromDb?: boolean
}

const recentActivities = [
  { action: 'Cập nhật phân quyền CSDL', detail: 'Quản trị viên đã cập nhật quyền người dùng', time: 'Vừa xong', icon: ShieldCheck, color: 'text-amber-500' },
  { action: 'Người dùng mới đăng ký', detail: 'Được tạo với vai trò mặc định (User)', time: '2 phút trước', icon: UserPlus, color: 'text-green-500' },
  { action: 'Lab mới được tạo', detail: 'CNN Image Classification', time: '15 phút trước', icon: FileText, color: 'text-blue-500' },
  { action: 'Cảnh báo hệ thống', detail: 'CPU usage > 80%', time: '1 giờ trước', icon: AlertTriangle, color: 'text-amber-500' },
  { action: 'Model đã được deploy', detail: 'ResNet50-v2', time: '3 giờ trước', icon: CheckCircle2, color: 'text-purple-500' },
]

function AdminDashboardContent() {
  const { user } = useAuth()
  const [usersList, setUsersList] = useState<DisplayUser[]>([])
  const [dbNotification, setDbNotification] = useState<string | null>(null)

  const loadUsers = () => {
    const accounts = getStoredAccounts()
    const dbUsers: DisplayUser[] = Object.values(accounts).map((acc) => ({
      name: acc.user.name,
      email: acc.user.email,
      role: acc.user.role,
      status: 'active',
      joinDate: 'Lưu trong CSDL',
      isFromDb: true,
    }))

    // Additional mock accounts if not already present
    const mockUsers: DisplayUser[] = [
      { name: 'Nguyễn Văn A', email: 'nguyenvana@email.com', role: 'user', status: 'active', joinDate: '2 giờ trước' },
      { name: 'Trần Thị B', email: 'tranthib@email.com', role: 'user', status: 'active', joinDate: '5 giờ trước' },
      { name: 'Phạm Thị D', email: 'phamthid@email.com', role: 'user', status: 'inactive', joinDate: '2 ngày trước' },
      { name: 'Hoàng Văn E', email: 'hoangvane@email.com', role: 'user', status: 'active', joinDate: '3 ngày trước' },
    ]

    const existingEmails = new Set(dbUsers.map(u => u.email.toLowerCase()))
    const merged = [...dbUsers, ...mockUsers.filter(m => !existingEmails.has(m.email.toLowerCase()))]
    setUsersList(merged)
  }

  useEffect(() => {
    loadUsers()

    const handleUpdate = () => {
      loadUsers()
    }
    window.addEventListener('ai-lab-database-updated', handleUpdate)
    return () => {
      window.removeEventListener('ai-lab-database-updated', handleUpdate)
    }
  }, [])

  const handleToggleRole = (targetEmail: string, currentRole: UserRole) => {
    const newRole: UserRole = currentRole === 'admin' ? 'user' : 'admin'
    const success = updateUserRoleInDb(targetEmail, newRole)

    if (success) {
      setDbNotification(`Đã cập nhật Cơ sở dữ liệu: Phân quyền "${newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Người dùng (User)'}" cho ${targetEmail}`)
      loadUsers()
    } else {
      // If user was only a mock user, persist it to DB with new role
      const accounts = getStoredAccounts()
      const normalized = targetEmail.toLowerCase().trim()
      accounts[normalized] = {
        password: 'password123',
        user: {
          id: `user-${Date.now()}`,
          name: targetEmail.split('@')[0],
          email: normalized,
          role: newRole,
          provider: 'email'
        }
      }
      localStorage.setItem('ai-lab-accounts', JSON.stringify(accounts))
      window.dispatchEvent(new CustomEvent('ai-lab-database-updated', { detail: { email: normalized, role: newRole } }))
      setDbNotification(`Đã lưu vào Cơ sở dữ liệu: Phân quyền "${newRole === 'admin' ? 'Quản trị viên (Admin)' : 'Người dùng (User)'}" cho ${targetEmail}`)
      loadUsers()
    }

    setTimeout(() => {
      setDbNotification(null)
    }, 5000)
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">Bảng điều khiển Admin</h1>
              <RoleBadge role="admin" size="md" />
            </div>
            <p className="text-muted-foreground">
              Xin chào, <span className="text-foreground font-medium">{user?.name}</span>. Quản lý toàn bộ hệ thống AI Lab tại đây.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={loadUsers}
              className="flex items-center gap-2 px-3.5 py-2 rounded-lg border border-border text-sm font-medium hover:bg-muted/50 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
              Làm mới CSDL
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <UserPlus className="w-4 h-4" />
              Thêm người dùng
            </button>
          </div>
        </div>

        {/* Database security policy notice */}
        <div className="mb-6 p-4 rounded-xl border border-amber-500/30 bg-amber-500/10 flex items-start gap-3">
          <Shield className="w-5 h-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div className="text-xs space-y-1">
            <p className="font-semibold text-foreground">
              Chính sách bảo mật phân quyền AI Lab:
            </p>
            <p className="text-muted-foreground leading-relaxed">
              Tất cả tài khoản khi đăng ký ngoài giao diện đều mặc định mang vai trò <strong>Người dùng (User)</strong> và không hiển thị tùy chọn cấp quyền Admin. Phân quyền Admin chỉ có hiệu lực khi quản trị viên can thiệp trực tiếp vào <strong>Cơ sở dữ liệu (Database)</strong> hoặc phân quyền tại danh sách người dùng dưới đây.
            </p>
          </div>
        </div>

        {/* Success / Notification banner */}
        {dbNotification && (
          <div className="mb-6 p-3.5 rounded-xl border border-success/30 bg-success/15 flex items-center justify-between text-xs text-foreground animate-fadeInUp">
            <div className="flex items-center gap-2 font-medium">
              <CheckCircle2 className="w-4 h-4 text-success flex-shrink-0" />
              <span>{dbNotification}</span>
            </div>
            <button
              onClick={() => setDbNotification(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {stats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all group">
              <div className="flex items-center justify-between mb-3">
                <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center`}>
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                </div>
                <span className="text-xs font-medium text-green-500 bg-green-500/10 px-2 py-0.5 rounded-full flex items-center gap-1">
                  <TrendingUp className="w-3 h-3" />
                  {stat.change}
                </span>
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Users Table */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <Users className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Người dùng &amp; Phân quyền CSDL</h2>
              </div>
              <span className="text-xs text-muted-foreground">
                Tổng cộng: <strong>{usersList.length}</strong> tài khoản
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-border text-xs text-muted-foreground">
                    <th className="text-left px-5 py-3 font-medium">Người dùng</th>
                    <th className="text-left px-5 py-3 font-medium">Vai trò hiện tại</th>
                    <th className="text-left px-5 py-3 font-medium">Nguồn dữ liệu</th>
                    <th className="text-right px-5 py-3 font-medium">Phân quyền CSDL</th>
                  </tr>
                </thead>
                <tbody>
                  {usersList.map((u, i) => (
                    <tr key={i} className="border-b border-border/50 last:border-0 hover:bg-muted/30 transition-colors">
                      <td className="px-5 py-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold ${
                            u.role === 'admin' ? 'bg-gradient-to-br from-amber-500 to-orange-600' : 'bg-gradient-to-br from-blue-500 to-cyan-600'
                          }`}>
                            {u.name.charAt(0).toUpperCase()}
                          </div>
                          <div>
                            <p className="text-sm font-medium text-foreground">{u.name}</p>
                            <p className="text-xs text-muted-foreground">{u.email}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-5 py-3">
                        <RoleBadge role={u.role} size="sm" />
                      </td>
                      <td className="px-5 py-3">
                        <span className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded border border-border/80 bg-muted/40 text-muted-foreground">
                          <Database className="w-3 h-3 text-primary" />
                          {u.joinDate}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => handleToggleRole(u.email, u.role)}
                            className={`px-2.5 py-1 rounded-md text-xs font-medium border transition-all flex items-center gap-1.5 ${
                              u.role === 'admin'
                                ? 'border-amber-500/40 text-amber-500 hover:bg-amber-500/10'
                                : 'border-primary/40 text-primary hover:bg-primary/10'
                            }`}
                            title={`Chuyển vai trò sang ${u.role === 'admin' ? 'User' : 'Admin'} trong CSDL`}
                          >
                            {u.role === 'admin' ? (
                              <>
                                <UserCheck className="w-3.5 h-3.5" />
                                <span>Gỡ Admin</span>
                              </>
                            ) : (
                              <>
                                <ShieldCheck className="w-3.5 h-3.5" />
                                <span>Cấp Admin</span>
                              </>
                            )}
                          </button>

                          <button className="p-1.5 rounded-lg hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Recent Activity */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <BarChart3 className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Nhật ký hệ thống</h2>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {recentActivities.map((activity, i) => (
                <div key={i} className="px-5 py-3.5 hover:bg-muted/30 transition-colors">
                  <div className="flex items-start gap-3">
                    <div className={`w-8 h-8 rounded-lg bg-muted/50 flex items-center justify-center flex-shrink-0 ${activity.color}`}>
                      <activity.icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{activity.action}</p>
                      <p className="text-xs text-muted-foreground truncate">{activity.detail}</p>
                      <p className="text-[10px] text-muted-foreground mt-1">{activity.time}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Admin Feature Cards */}
        <div className="mt-8">
          <h2 className="text-lg font-semibold text-foreground mb-4 flex items-center gap-2">
            <Shield className="w-5 h-5 text-amber-500" />
            Công cụ quản trị hệ thống
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {[
              { title: 'Quản lý người dùng', desc: 'Thêm, sửa, xoá, phân quyền CSDL', icon: Users, color: 'text-blue-500', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
              { title: 'Quản lý Labs', desc: 'Tạo, chỉnh sửa bài lab', icon: FlaskConical, color: 'text-green-500', bg: 'bg-green-500/10', border: 'border-green-500/20' },
              { title: 'Quản lý Dataset', desc: 'Upload, xoá, phân loại', icon: Database, color: 'text-purple-500', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
              { title: 'Cài đặt hệ thống', desc: 'Cấu hình, bảo mật, sao lưu CSDL', icon: Settings, color: 'text-amber-500', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
            ].map((tool) => (
              <button
                key={tool.title}
                className={`rounded-xl border ${tool.border} ${tool.bg} p-5 text-left hover:scale-[1.02] transition-all group`}
              >
                <tool.icon className={`w-8 h-8 ${tool.color} mb-3`} />
                <p className="font-semibold text-foreground text-sm">{tool.title}</p>
                <p className="text-xs text-muted-foreground mt-1">{tool.desc}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

export default function AdminPage() {
  return (
    <ProtectedRoute requiredRole="admin">
      <AdminDashboardContent />
    </ProtectedRoute>
  )
}
