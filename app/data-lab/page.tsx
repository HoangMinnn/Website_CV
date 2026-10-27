'use client'

import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { useState } from 'react'
import { Upload, RefreshCw } from 'lucide-react'
import { Button } from '@/components/ui/button'

export default function DataLabPage() {
  const [step, setStep] = useState(1)
  const [csvFile, setCsvFile] = useState<File | null>(null)
  const [algorithmType, setAlgorithmType] = useState<'classification' | 'regression' | 'clustering'>('classification')

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (e.dataTransfer.files.length > 0) {
      setCsvFile(e.dataTransfer.files[0])
      setStep(2)
    }
  }

  const steps = ['Upload dữ liệu', 'Thống kê', 'Chọn thuật toán', 'Kết quả']

  return (
    <div className="flex flex-col min-h-screen">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold mb-2">Data Lab</h1>
          <p className="text-muted-foreground mb-8">
            Phân tích dữ liệu, chạy thuật toán ML, và xem kết quả
          </p>

          {/* Stepper */}
          <div className="mb-12">
            <div className="flex gap-2 mb-8 overflow-x-auto pb-2">
              {[1, 2, 3, 4].map((s) => (
                <div key={s} className="flex items-center gap-2 flex-shrink-0">
                  <div
                    className={`w-10 h-10 rounded-full flex items-center justify-center font-semibold text-sm transition-colors ${
                      s <= step
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted text-muted-foreground'
                    }`}
                  >
                    {s}
                  </div>
                  {s < 4 && (
                    <div
                      className={`w-12 h-1 rounded-full flex-shrink-0 transition-colors ${
                        s < step ? 'bg-primary' : 'bg-muted'
                      }`}
                    />
                  )}
                </div>
              ))}
            </div>
            <p className="text-sm text-muted-foreground">
              Bước {step}: {steps[step - 1]}
            </p>
          </div>

          {/* Step 1: Upload */}
          {step === 1 && (
            <div className="border border-border rounded-lg p-8 bg-card max-w-2xl">
              <h2 className="text-2xl font-bold mb-4">Bước 1: Tải dữ liệu</h2>
              <div
                onDragOver={handleDragOver}
                onDrop={handleDrop}
                className="border-2 border-dashed border-border rounded-lg p-12 cursor-pointer hover:border-accent transition-colors text-center bg-background/50"
              >
                <Upload className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="font-semibold mb-2">Kéo thả file CSV hoặc Excel</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  .csv, .xlsx, .xls • Giới hạn: 50MB, 100,000 dòng
                </p>
                <Button variant="outline">Chọn tệp</Button>
              </div>
              <Button onClick={() => setStep(2)} className="mt-6 w-full">
                Tiếp theo
              </Button>
            </div>
          )}

          {/* Step 2: Statistics */}
          {step === 2 && (
            <div className="border border-border rounded-lg p-8 bg-card max-w-4xl">
              <h2 className="text-2xl font-bold mb-6">Bước 2: Thống kê</h2>
              
              <div className="grid md:grid-cols-3 gap-4 mb-8">
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">Số dòng</p>
                  <p className="text-2xl font-bold">1,000</p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">Số cột</p>
                  <p className="text-2xl font-bold">12</p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">Dữ liệu thiếu</p>
                  <p className="text-2xl font-bold">2.3%</p>
                </div>
              </div>

              <div className="bg-background/50 rounded-lg p-4 border border-border mb-8 space-y-3">
                <h3 className="font-semibold">Xử lý giá trị thiếu</h3>
                <select className="w-full px-3 py-2 rounded-lg bg-background border border-input">
                  <option>Bỏ dòng</option>
                  <option>Điền mean</option>
                  <option>Điền median</option>
                  <option>Điền 0</option>
                </select>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Chuẩn hoá dữ liệu số (StandardScaler)</span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(1)}>
                  Quay lại
                </Button>
                <Button onClick={() => setStep(3)} className="flex-1">
                  Tiếp theo
                </Button>
              </div>
            </div>
          )}

          {/* Step 3: Algorithm Selection */}
          {step === 3 && (
            <div className="border border-border rounded-lg p-8 bg-card max-w-4xl">
              <h2 className="text-2xl font-bold mb-6">Bước 3: Chọn thuật toán</h2>
              
              <div className="mb-8">
                <label className="font-semibold block mb-4">Loại bài toán</label>
                <div className="space-y-3">
                  {[
                    { value: 'classification', label: 'Phân loại (Classification)' },
                    { value: 'regression', label: 'Hồi quy (Regression)' },
                    { value: 'clustering', label: 'Phân cụm (Clustering)' },
                  ].map((opt: any) => (
                    <label key={opt.value} className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="radio"
                        name="algorithm"
                        value={opt.value}
                        checked={algorithmType === opt.value}
                        onChange={(e) => setAlgorithmType(e.target.value as any)}
                        className="w-4 h-4"
                      />
                      <span>{opt.label}</span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="bg-background/50 rounded-lg p-4 border border-border mb-8">
                <label className="font-semibold block mb-3">Chọn thuật toán</label>
                <select className="w-full px-3 py-2 rounded-lg bg-background border border-input mb-4">
                  {algorithmType === 'classification' && (
                    <>
                      <option>Logistic Regression</option>
                      <option>Decision Tree</option>
                      <option>Random Forest</option>
                      <option>KNN</option>
                      <option>SVM</option>
                    </>
                  )}
                  {algorithmType === 'regression' && (
                    <>
                      <option>Linear Regression</option>
                      <option>Ridge</option>
                      <option>Lasso</option>
                      <option>Decision Tree Regressor</option>
                    </>
                  )}
                  {algorithmType === 'clustering' && (
                    <>
                      <option>K-Means</option>
                      <option>DBSCAN</option>
                      <option>Agglomerative Clustering</option>
                    </>
                  )}
                </select>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" defaultChecked className="w-4 h-4" />
                  <span className="text-sm">Chia tập train/test: 80/20</span>
                </label>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep(2)}>
                  Quay lại
                </Button>
                <Button onClick={() => setStep(4)} className="flex-1">
                  Chạy thuật toán
                </Button>
              </div>
            </div>
          )}

          {/* Step 4: Results */}
          {step === 4 && (
            <div className="border border-border rounded-lg p-8 bg-card max-w-4xl">
              <h2 className="text-2xl font-bold mb-6">Bước 4: Kết quả</h2>
              
              <div className="grid md:grid-cols-4 gap-4 mb-8">
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">Accuracy</p>
                  <p className="text-2xl font-bold">92.5%</p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">Precision</p>
                  <p className="text-2xl font-bold">0.91</p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">Recall</p>
                  <p className="text-2xl font-bold">0.89</p>
                </div>
                <div className="bg-background/50 rounded-lg p-4 border border-border">
                  <p className="text-sm text-muted-foreground">F1-Score</p>
                  <p className="text-2xl font-bold">0.90</p>
                </div>
              </div>

              <div className="bg-background/50 rounded-lg p-6 border border-border mb-8 h-64 flex items-center justify-center">
                <p className="text-muted-foreground">Visualization will appear here</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" className="gap-2" onClick={() => alert('Downloading...')}>
                  <RefreshCw className="w-4 h-4" />
                  Tải kết quả
                </Button>
                <Button variant="outline" onClick={() => setStep(3)}>
                  Chạy lại
                </Button>
              </div>
            </div>
          )}
        </div>
      </main>

      <Footer />
    </div>
  )
}
