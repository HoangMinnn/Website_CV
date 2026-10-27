'use client'

import { useState } from 'react'
import { Navbar } from '@/components/navbar'
import { Footer } from '@/components/footer'
import { Button } from '@/components/ui/button'
import { Play, Sparkles, Sliders, Cpu, ArrowRight, RotateCcw, AlertCircle } from 'lucide-react'
import { ModelUploadZone } from '@/components/playground/model-upload-zone'
import { InputMediaTabs } from '@/components/playground/input-media-tabs'
import { ResultsPanel } from '@/components/playground/results-panel'
import { ModelInfo, InputImageMedia, InferenceResult } from '@/components/playground/types'
import { SAMPLE_IMAGES } from '@/components/playground/sample-data'
import { runCVModelInference } from '@/lib/cv-inference-engine'

export default function PlaygroundPage() {
  const [model, setModel] = useState<ModelInfo | null>(null)
  const [inferenceError, setInferenceError] = useState<string | null>(null)
  const [inputMedia, setInputMedia] = useState<InputImageMedia | null>(null)
  const [isRunning, setIsRunning] = useState(false)
  const [results, setResults] = useState<InferenceResult | null>(null)

  // Inference Settings
  const [confidenceThreshold, setConfidenceThreshold] = useState(0.4)
  const [showBbox, setShowBbox] = useState(true)
  const [showLabels, setShowLabels] = useState(true)
  const [device, setDevice] = useState('auto')

  const canRunModel = !!model && !!inputMedia

  const handleRunModel = async () => {
    if (!canRunModel || !model || !inputMedia) return

    setIsRunning(true)
    setResults(null)
    setInferenceError(null)

    const runBrowserFallback = async (modeLabel?: string) => {
      try {
        const imageSrc =
          inputMedia.appliedFilters && inputMedia.appliedFilters.length > 0 && inputMedia.previewUrl
            ? inputMedia.previewUrl
            : inputMedia.previewUrl || (inputMedia.file ? URL.createObjectURL(inputMedia.file) : '')

        const clientResult = await runCVModelInference(imageSrc, model, confidenceThreshold)
        if (modeLabel) {
          clientResult.device = modeLabel
        }
        setResults(clientResult)
      } catch (clientErr: any) {
        console.error('Browser CV Engine error:', clientErr)
        setInferenceError(`Lỗi xử lý hình ảnh: ${clientErr.message}`)
      } finally {
        setIsRunning(false)
      }
    }

    if (!model.file) {
      await runBrowserFallback('Client CV Engine (WebGPU / Wasm)')
      return
    }

    // 2. If user uploaded a custom model file, try server-side Python first
    try {
      const formData = new FormData()
      formData.append('modelFile', model.file)
      if (model.labelsFile) {
        formData.append('labelsFile', model.labelsFile)
      }
      if (model.imgsz && model.imgsz > 0) {
        formData.append('imgsz', String(model.imgsz))
      }
      if (model.norm && model.norm !== 'auto') {
        formData.append('norm', model.norm)
      }

      if (inputMedia.appliedFilters && inputMedia.appliedFilters.length > 0 && inputMedia.previewUrl) {
        formData.append('imageBase64', inputMedia.previewUrl)
      } else if (inputMedia.file) {
        formData.append('imageFile', inputMedia.file)
      } else if (inputMedia.previewUrl) {
        formData.append('imageBase64', inputMedia.previewUrl)
      }

      formData.append('confThreshold', String(confidenceThreshold))
      formData.append('taskType', model.type)

      const res = await fetch('/api/inference', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      if (data && data.success) {
        setResults(data)
        setIsRunning(false)
      } else {
        // Python server not configured or error -> Fallback gracefully!
        console.warn('Backend inference failed, falling back to browser CV engine:', data?.error)
        await runBrowserFallback('Client CV Engine (Chế độ dự phòng khi máy chưa có thư viện Python)')
      }
    } catch (err: any) {
      console.warn('Backend unreachable, falling back to browser CV engine:', err)
      await runBrowserFallback('Client CV Engine (Trình duyệt độc lập)')
    }
  }

  const handleReset = () => {
    setResults(null)
    setInferenceError(null)
  }

  return (
    <div className="flex flex-col min-h-screen bg-background">
      <Navbar />

      <main className="flex-1 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center gap-2 mb-1.5">
              <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                Inference Studio
              </span>
              <span className="text-xs text-muted-foreground">Computer Vision & Deep Learning</span>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-foreground">
              Model Playground
            </h1>
            <p className="text-sm text-muted-foreground mt-1 max-w-2xl">
              Tải lên mô hình AI (.pt, .onnx, .tflite, .h5) từ máy tính, hệ thống sẽ tự động đọc danh sách nhãn từ metadata mô hình để kiểm thử suy luận chuẩn xác theo thời gian thực.
            </p>
          </div>

          {/* Setup Grid: 2 Columns (Model Upload on Left, Image Upload on Right) */}
          <div className="grid lg:grid-cols-2 gap-6 mb-6">
            {/* 1. Model Upload Section */}
            <div className="border border-border rounded-xl p-5 bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-primary text-primary-foreground text-xs font-bold flex items-center justify-center">
                    1
                  </span>
                  <h2 className="font-semibold text-foreground text-base">
                    Tải lên Mô hình AI từ máy tính
                  </h2>
                </div>
                {model && (
                  <span className="text-xs text-muted-foreground font-mono">
                    {model.fileName}
                  </span>
                )}
              </div>

              <ModelUploadZone
                currentModel={model}
                onModelSelect={(selected) => {
                  setModel(selected)
                  setResults(null)
                }}
              />
            </div>

            {/* 2. Image Upload Section */}
            <div className="border border-border rounded-xl p-5 bg-card shadow-sm space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center">
                    2
                  </span>
                  <h2 className="font-semibold text-foreground text-base">
                    Tải ảnh để kiểm thử mô hình
                  </h2>
                </div>
                {inputMedia && (
                  <span className="text-xs text-muted-foreground font-mono truncate max-w-[150px]">
                    {inputMedia.fileName}
                  </span>
                )}
              </div>

              <InputMediaTabs
                inputMedia={inputMedia}
                setInputMedia={(media) => {
                  setInputMedia(media)
                  setResults(null)
                }}
              />
            </div>
          </div>

          {/* 3. Settings & Execution Control Bar */}
          <div className="border border-border rounded-xl p-4 bg-card/80 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-4 text-xs">
              <div className="flex items-center gap-2 font-medium text-foreground">
                <Cpu className="w-4 h-4 text-primary" />
                <span>Thiết bị phần cứng:</span>
                <select
                  value={device}
                  onChange={(e) => setDevice(e.target.value)}
                  className="px-2.5 py-1 rounded-md bg-background border border-border text-xs font-mono"
                >
                  <option value="auto">Tự động (WebGPU / WASM)</option>
                  <option value="webgpu">WebGPU Acceleration</option>
                  <option value="wasm">WebAssembly (WASM)</option>
                  <option value="cpu">CPU Fallback</option>
                </select>
              </div>

              <div className="h-4 w-px bg-border hidden sm:block" />

              <div className="flex items-center gap-2 text-muted-foreground">
                <Sliders className="w-3.5 h-3.5" />
                <span>Ngưỡng tin cậy ban đầu:</span>
                <span className="font-mono font-bold text-foreground">
                  {(confidenceThreshold * 100).toFixed(0)}%
                </span>
              </div>
            </div>

            <div className="flex items-center gap-2 w-full md:w-auto">
              {results && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={handleReset}
                  className="text-xs h-10 px-3"
                  title="Xoá kết quả để chạy lại"
                >
                  <RotateCcw className="w-3.5 h-3.5 mr-1" />
                  Đặt lại
                </Button>
              )}

              <Button
                size="lg"
                disabled={!canRunModel || isRunning}
                onClick={handleRunModel}
                className="w-full md:w-auto min-w-[220px] h-10 font-semibold bg-primary hover:bg-primary/90 text-primary-foreground shadow-md transition-all disabled:opacity-50"
              >
                {isRunning ? (
                  <div className="flex items-center gap-2 text-xs">
                    <div className="w-4 h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin" />
                    <span>Đang chạy suy luận...</span>
                  </div>
                ) : (
                  <div className="flex items-center gap-2 text-xs">
                    <Play className="w-4 h-4 fill-current" />
                    <span>Chạy thử nghiệm mô hình</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </div>
                )}
              </Button>
            </div>
          </div>

          {/* Running Progress Bar */}
          {isRunning && (
            <div className="mb-6 space-y-1.5 animate-fadeInUp">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Đang tải trọng số và phân tích tensor ảnh...</span>
                <span className="font-mono">Processing...</span>
              </div>
              <div className="w-full bg-muted rounded-full h-1.5 overflow-hidden">
                <div className="h-full bg-primary animate-pulse w-full" />
              </div>
            </div>
          )}

          {/* Inference Error Display */}
          {inferenceError && !isRunning && (
            <div className="mb-6 flex items-start gap-3 bg-red-500/10 border border-red-500/25 rounded-xl p-4 animate-fadeInUp">
              <AlertCircle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div className="text-sm">
                <p className="font-semibold text-red-600 dark:text-red-400 mb-0.5">Lỗi khi chạy mô hình</p>
                <p className="text-muted-foreground text-xs leading-relaxed">{inferenceError}</p>
              </div>
            </div>
          )}

          <div className="border border-border rounded-xl p-6 bg-card shadow-sm">
            {results && inputMedia && model ? (
              <ResultsPanel
                inputMedia={inputMedia}
                model={model}
                results={results}
                confidenceThreshold={confidenceThreshold}
                onConfidenceChange={setConfidenceThreshold}
                showBbox={showBbox}
                onToggleBbox={setShowBbox}
                showLabels={showLabels}
                onToggleLabels={setShowLabels}
              />
            ) : (
              <div className="text-center py-16 px-4 max-w-md mx-auto space-y-4">
                <div className="w-16 h-16 rounded-2xl bg-primary/10 text-primary flex items-center justify-center mx-auto">
                  <Sparkles className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="font-bold text-lg text-foreground mb-1">
                    Chưa có kết quả suy luận
                  </h3>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Tải lên <strong>file mô hình</strong> (.pt, .onnx, ...) ở Bước 1 và <strong>ảnh test</strong> ở Bước 2, sau đó nhấn <strong>"Chạy thử nghiệm"</strong>. Kết quả sẽ đến từ model thật của bạn chạy trên GPU.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 text-left text-xs font-medium">
                  <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                    model ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-border bg-muted/30 text-muted-foreground'
                  }`}>
                    <span>{model ? '✓' : '○'}</span>
                    <span>1. Mô hình: {model ? model.name : 'Chưa chọn'}</span>
                  </div>
                  <div className={`p-2.5 rounded-lg border flex items-center gap-2 ${
                    inputMedia ? 'border-green-500/30 bg-green-500/10 text-green-600 dark:text-green-400' : 'border-border bg-muted/30 text-muted-foreground'
                  }`}>
                    <span>{inputMedia ? '✓' : '○'}</span>
                    <span>2. Ảnh test: {inputMedia ? inputMedia.fileName : 'Chưa tải'}</span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}
