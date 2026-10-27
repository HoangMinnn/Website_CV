import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'

export default function VisualizerPage() {
  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Algorithm Visualizer</h1>
          <p className="text-muted-foreground mb-8">
            Xem animation từng bước của các thuật toán ML
          </p>

          <div className="border border-border rounded-lg p-8 bg-card text-center">
            <div className="max-w-md mx-auto">
              <h2 className="text-2xl font-bold mb-4">V2 Feature</h2>
              <p className="text-muted-foreground mb-6">
                Tính năng Algorithm Visualizer đang trong giai đoạn phát triển. Chúng tôi sẽ sớm cung cấp công cụ trực quan hóa các thuật toán như Decision Tree, KNN, K-Means, Linear Regression, và Neural Network.
              </p>
              <Button className="w-full">
                Tìm hiểu thêm
              </Button>
            </div>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
