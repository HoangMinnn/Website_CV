import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { BookOpen } from 'lucide-react'

const labs = [
  {
    title: 'Giới thiệu Linear Regression',
    description: 'Học về Linear Regression và xây dựng model đầu tiên của bạn',
    difficulty: 'Beginner',
  },
  {
    title: 'Decision Tree Classification',
    description: 'Hiểu cách Decision Tree hoạt động với visualization từng bước',
    difficulty: 'Intermediate',
  },
  {
    title: 'K-Means Clustering',
    description: 'Phân cụm dữ liệu bằng K-Means và thử với dataset thực tế',
    difficulty: 'Intermediate',
  },
]

export default function LabsPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Guided Labs</h1>
          <p className="text-muted-foreground mb-8">
            Các bài thực hành có cấu trúc: lý thuyết → thực hành → kiểm tra
          </p>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {labs.map((lab, index) => (
              <div
                key={index}
                className="border border-border rounded-lg p-6 bg-card hover:border-accent transition-all duration-300"
              >
                <div className="flex items-start gap-3 mb-4">
                  <div className="w-10 h-10 rounded-lg bg-primary/10 text-primary flex items-center justify-center flex-shrink-0">
                    <BookOpen className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="inline-block px-2 py-1 rounded text-xs font-medium bg-primary/20 text-primary mb-2">
                      {lab.difficulty}
                    </span>
                  </div>
                </div>
                <h3 className="font-semibold text-lg mb-2">{lab.title}</h3>
                <p className="text-muted-foreground text-sm mb-4">{lab.description}</p>
                <Button className="w-full">Bắt đầu</Button>
              </div>
            ))}
          </div>

          <div className="mt-12 p-8 rounded-lg border border-border bg-gradient-to-r from-primary/5 to-accent/5 text-center">
            <p className="text-muted-foreground">
              Thêm nhiều bài lab sẽ được thêm vào trong các phiên bản tới
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
