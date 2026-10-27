'use client'

import { useAuth } from '@/lib/auth-context'
import { ProtectedRoute } from '@/components/auth/protected-route'
import { RoleBadge } from '@/components/auth/role-badge'
import { Navbar } from '@/components/navbar'
import {
  FlaskConical, Activity, BookOpen, Trophy,
  Clock, Star, ArrowRight, TrendingUp,
  Zap, Target
} from 'lucide-react'
import Link from 'next/link'

const userStats = [
  { label: 'Lab hoàn thành', value: '12', icon: FlaskConical, color: 'text-green-500', bg: 'bg-green-500/10' },
  { label: 'Model đã train', value: '8', icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
  { label: 'Điểm kinh nghiệm', value: '2,450', icon: Trophy, color: 'text-amber-500', bg: 'bg-amber-500/10' },
  { label: 'Giờ thực hành', value: '36h', icon: Clock, color: 'text-purple-500', bg: 'bg-purple-500/10' },
]

const recentLabs = [
  { name: 'Image Classification với CNN', progress: 85, status: 'Đang làm', difficulty: 'Trung bình' },
  { name: 'Natural Language Processing cơ bản', progress: 100, status: 'Hoàn thành', difficulty: 'Dễ' },
  { name: 'Object Detection với YOLO', progress: 40, status: 'Đang làm', difficulty: 'Khó' },
  { name: 'Transfer Learning', progress: 100, status: 'Hoàn thành', difficulty: 'Trung bình' },
]

const suggestedLabs = [
  { name: 'GAN - Generative Adversarial Networks', difficulty: 'Khó', duration: '4 giờ', icon: Zap },
  { name: 'Reinforcement Learning cơ bản', difficulty: 'Trung bình', duration: '3 giờ', icon: Target },
  { name: 'Data Augmentation nâng cao', difficulty: 'Dễ', duration: '2 giờ', icon: Star },
]

function UserDashboardContent() {
  const { user } = useAuth()

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
          <div>
            <div className="flex items-center gap-3 mb-2">
              <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
              <RoleBadge role="user" size="md" />
            </div>
            <p className="text-muted-foreground">
              Xin chào, <span className="text-foreground font-medium">{user?.name}</span>! Tiếp tục hành trình AI/ML của bạn.
            </p>
          </div>
          <Link href="/labs">
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors">
              <BookOpen className="w-4 h-4" />
              Khám phá Labs
            </button>
          </Link>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {userStats.map((stat) => (
            <div key={stat.label} className="rounded-xl border border-border bg-card p-5 hover:border-primary/30 transition-all">
              <div className={`w-10 h-10 rounded-lg ${stat.bg} flex items-center justify-center mb-3`}>
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
              </div>
              <p className="text-2xl font-bold text-foreground">{stat.value}</p>
              <p className="text-sm text-muted-foreground mt-1">{stat.label}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Recent Labs */}
          <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Bài Lab gần đây</h2>
              </div>
              <Link href="/labs" className="text-xs text-primary hover:text-primary/80 font-medium transition-colors">
                Xem tất cả →
              </Link>
            </div>
            <div className="divide-y divide-border/50">
              {recentLabs.map((lab, i) => (
                <div key={i} className="px-5 py-4 hover:bg-muted/30 transition-colors">
                  <div className="flex items-center justify-between mb-2">
                    <p className="font-medium text-foreground text-sm">{lab.name}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                      lab.status === 'Hoàn thành'
                        ? 'bg-green-500/15 text-green-500'
                        : 'bg-blue-500/15 text-blue-500'
                    }`}>
                      {lab.status}
                    </span>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="flex-1 h-2 rounded-full bg-muted/50 overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          lab.progress === 100 ? 'bg-green-500' : 'bg-primary'
                        }`}
                        style={{ width: `${lab.progress}%` }}
                      />
                    </div>
                    <span className="text-xs text-muted-foreground w-10 text-right">{lab.progress}%</span>
                  </div>
                  <div className="flex items-center gap-3 mt-2">
                    <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{lab.difficulty}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Suggested Labs */}
          <div className="rounded-xl border border-border bg-card overflow-hidden">
            <div className="flex items-center justify-between px-5 py-4 border-b border-border">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-primary" />
                <h2 className="font-semibold text-foreground">Gợi ý cho bạn</h2>
              </div>
            </div>
            <div className="divide-y divide-border/50">
              {suggestedLabs.map((lab, i) => (
                <button key={i} className="w-full px-5 py-4 hover:bg-muted/30 transition-colors text-left group">
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                      <lab.icon className="w-4 h-4 text-primary" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground group-hover:text-primary transition-colors">{lab.name}</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">{lab.difficulty}</span>
                        <span className="text-[10px] text-muted-foreground flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          {lab.duration}
                        </span>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-muted-foreground group-hover:text-primary transition-colors mt-1" />
                  </div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Access Info */}
        <div className="mt-8 rounded-xl border border-blue-500/20 bg-blue-500/5 p-5">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
              <BookOpen className="w-5 h-5 text-blue-500" />
            </div>
            <div>
              <h3 className="font-semibold text-foreground">Quyền truy cập của bạn</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Với vai trò <span className="text-blue-500 font-medium">Người dùng</span>, bạn có thể truy cập: Playground, Data Lab, Visualizer, Labs.
                Để có quyền quản trị (quản lý người dùng, tạo lab mới...), vui lòng liên hệ quản trị viên.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default function DashboardPage() {
  return (
    <ProtectedRoute>
      <UserDashboardContent />
    </ProtectedRoute>
  )
}
