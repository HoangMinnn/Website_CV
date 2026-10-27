import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { HeroGreeting } from '@/components/hero-greeting'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Zap, Database, BarChart3, Lightbulb, GitBranch, Share2 } from 'lucide-react'

const features = [
  {
    icon: Zap,
    title: 'Model Playground',
    description: 'Upload model AI, chạy inference trên ảnh/video ngay lập tức',
    status: 'Có sẵn',
    statusColor: 'bg-success/20 text-success',
  },
  {
    icon: Database,
    title: 'Data Lab',
    description: 'Phân tích CSV/Excel, chọn thuật toán ML và xem kết quả',
    status: 'Có sẵn',
    statusColor: 'bg-success/20 text-success',
  },
  {
    icon: BarChart3,
    title: 'Algorithm Visualizer',
    description: 'Animation thuật toán từng bước với giải thích chi tiết',
    status: 'V2',
    statusColor: 'bg-info/20 text-info',
  },
  {
    icon: Lightbulb,
    title: 'Bài Lab hướng dẫn',
    description: 'Lý thuyết + code + dataset mẫu trong một flow',
    status: 'V2',
    statusColor: 'bg-info/20 text-info',
  },
  {
    icon: GitBranch,
    title: 'Model Benchmark',
    description: 'So sánh 2 model song song và xem performance metrics',
    status: 'V3',
    statusColor: 'bg-warning/20 text-warning',
  },
  {
    icon: Share2,
    title: 'Share & Embed',
    description: 'Chia sẻ kết quả qua link và nhúng vào trang web',
    status: 'V3',
    statusColor: 'bg-warning/20 text-warning',
  },
]

export default function Home() {
  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1">
        {/* Hero Section */}
        <section className="relative py-20 sm:py-32 overflow-hidden">
          {/* Background gradient effect */}
          <div className="absolute inset-0 bg-gradient-to-r from-primary/10 via-transparent to-accent/10 opacity-30 blur-3xl" />

          <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <HeroGreeting />
            <h1 className="text-balance text-4xl sm:text-5xl lg:text-6xl font-bold mb-6">
              Học AI/ML bằng cách{' '}
              <span className="bg-gradient-to-r from-primary via-accent to-primary bg-clip-text text-transparent">
                thực hành
              </span>
            </h1>
            <p className="text-balance text-lg sm:text-xl text-muted-foreground mb-8 max-w-2xl mx-auto">
              Không cần cài đặt, không cần GPU. Chạy thẳng trên trình duyệt của bạn. Tất cả đều miễn phí.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
              <Link href="/playground">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Thử Model Playground →
                </Button>
              </Link>
              <Link href="/data-lab">
                <Button size="lg" variant="outline">
                  Xem Data Lab →
                </Button>
              </Link>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section className="py-20 sm:py-32 border-t border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-16">
              <h2 className="text-3xl sm:text-4xl font-bold mb-4">Các tính năng chính</h2>
              <p className="text-lg text-muted-foreground">
                Mọi thứ bạn cần để bắt đầu hành trình AI/ML của mình
              </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
              {features.map((feature, index) => {
                const Icon = feature.icon
                return (
                  <div
                    key={index}
                    className="group relative p-6 rounded-xl border border-border bg-card hover:border-accent transition-all duration-300 hover:shadow-lg hover:shadow-primary/10"
                  >
                    {/* Icon */}
                    <div className="w-12 h-12 rounded-lg bg-primary/10 text-primary flex items-center justify-center mb-4 group-hover:bg-primary/20 transition-colors">
                      <Icon className="w-6 h-6" />
                    </div>

                    {/* Title and Badge */}
                    <div className="flex items-start justify-between mb-3">
                      <h3 className="font-semibold text-lg">{feature.title}</h3>
                      <span className={`px-2 py-1 rounded text-xs font-medium whitespace-nowrap ml-2 ${feature.statusColor}`}>
                        {feature.status}
                      </span>
                    </div>

                    {/* Description */}
                    <p className="text-muted-foreground text-sm">
                      {feature.description}
                    </p>
                  </div>
                )
              })}
            </div>
          </div>
        </section>

        {/* CTA Section */}
        <section className="py-16 sm:py-24 border-t border-border bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
            <h2 className="text-3xl sm:text-4xl font-bold mb-4">Sẵn sàng bắt đầu?</h2>
            <p className="text-lg text-muted-foreground mb-8">
              Không cần đăng ký, không cần tài khoản. Bắt đầu ngay bây giờ.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/playground">
                <Button size="lg" className="bg-primary hover:bg-primary/90">
                  Vào Playground
                </Button>
              </Link>
              <a href="https://github.com" target="_blank" rel="noopener noreferrer">
                <Button size="lg" variant="outline">
                  Xem trên GitHub
                </Button>
              </a>
            </div>
          </div>
        </section>
      </main>

      <Footer />
    </div>
  )
}
