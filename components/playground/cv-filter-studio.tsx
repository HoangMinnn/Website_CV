'use client'

import { useState, useEffect, useRef } from 'react'
import {
  Sun,
  Moon,
  Zap,
  Sliders,
  RotateCcw,
  BookOpen,
  Eye,
  Download,
  Check,
  Sparkles,
  BarChart2,
  Layers,
  ArrowRightLeft,
  Info,
  Maximize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  CVProcessParams,
  DEFAULT_CV_PARAMS,
  applyCVProcessing,
  CV_THEORY_DATABASE,
  CVTheoryInfo,
} from '@/lib/cv-algorithms'

interface CVFilterStudioProps {
  originalImageSrc: string
  onApplyProcessedImage: (dataUrl: string, appliedTags: string[]) => void
  onCancel?: () => void
}

export function CVFilterStudio({
  originalImageSrc,
  onApplyProcessedImage,
}: CVFilterStudioProps) {
  const [params, setParams] = useState<CVProcessParams>({ ...DEFAULT_CV_PARAMS })
  const [activeTheoryKey, setActiveTheoryKey] = useState<string>('brightness_up')
  const [isComparing, setIsComparing] = useState(false)
  const [activeTab, setActiveTab] = useState<'presets' | 'tuning' | 'theory'>('presets')
  const [isProcessing, setIsProcessing] = useState(false)
  const [appliedTags, setAppliedTags] = useState<string[]>([])

  const previewCanvasRef = useRef<HTMLCanvasElement>(null)
  const histogramCanvasRef = useRef<HTMLCanvasElement>(null)
  const originalImgRef = useRef<HTMLImageElement | null>(null)
  const processedDataUrlRef = useRef<string>(originalImageSrc)

  // Load original image once
  useEffect(() => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      originalImgRef.current = img
      renderFilteredImage(params)
    }
    img.src = originalImageSrc
  }, [originalImageSrc])

  // Re-render canvas when params change
  const renderFilteredImage = (currentParams: CVProcessParams) => {
    const img = originalImgRef.current
    const canvas = previewCanvasRef.current
    if (!img || !canvas) return

    setIsProcessing(true)

    // Match original aspect ratio capped for smooth 60fps real-time preview
    const maxDim = 800
    let w = img.naturalWidth || 640
    let h = img.naturalHeight || 480
    if (w > maxDim || h > maxDim) {
      if (w > h) {
        h = Math.round((h * maxDim) / w)
        w = maxDim
      } else {
        w = Math.round((w * maxDim) / h)
        h = maxDim
      }
    }

    canvas.width = w
    canvas.height = h

    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) {
      setIsProcessing(false)
      return
    }

    // Draw base image onto canvas
    ctx.clearRect(0, 0, w, h)
    ctx.drawImage(img, 0, 0, w, h)

    // Apply Computer Vision Algorithms
    const result = applyCVProcessing(ctx, w, h, currentParams)
    ctx.putImageData(result.imageData, 0, 0)

    // Store processed data url
    try {
      const dataUrl = canvas.toDataURL('image/png')
      processedDataUrlRef.current = dataUrl
      // Immediately notify parent if needed or keep synchronized
      updateAppliedTags(currentParams)
    } catch (err) {
      console.warn('Canvas export tainted or failed:', err)
    }

    // Render Histogram
    renderHistogram(result.histogram)

    setIsProcessing(false)
  }

  const renderHistogram = (hist: { r: number[]; g: number[]; b: number[]; lum: number[] }) => {
    const canvas = histogramCanvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const w = canvas.width
    const h = canvas.height
    ctx.clearRect(0, 0, w, h)

    // Find max value in luminance
    const maxVal = Math.max(...hist.lum, 1)

    // Draw Luminance distribution
    ctx.fillStyle = '#3b82f640'
    ctx.strokeStyle = '#3b82f6'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(0, h)

    for (let i = 0; i < 256; i++) {
      const x = (i / 255) * w
      const barH = (hist.lum[i] / maxVal) * (h - 4)
      const y = h - barH
      ctx.lineTo(x, y)
    }
    ctx.lineTo(w, h)
    ctx.closePath()
    ctx.fill()
    ctx.stroke()
  }

  const updateAppliedTags = (p: CVProcessParams) => {
    const tags: string[] = []
    if (p.brightness > 0) tags.push(`+${p.brightness}% Sáng`)
    if (p.brightness < 0) tags.push(`${p.brightness}% Tối`)
    if (p.contrast !== 0) tags.push(`${p.contrast > 0 ? '+' : ''}${p.contrast}% Tương phản`)
    if (p.noiseType === 'salt-and-pepper') tags.push(`Nhiễu Muối Tiêu (${p.noiseAmount}%)`)
    if (p.noiseType === 'gaussian') tags.push(`Nhiễu Gauss (${p.noiseAmount}%)`)
    if (p.noiseType === 'speckle') tags.push(`Nhiễu Đốm (${p.noiseAmount}%)`)
    if (p.blurType === 'gaussian') tags.push('Mờ Gauss')
    if (p.blurType === 'box') tags.push('Lọc Box Blur')
    if (p.blurType === 'median') tags.push('Lọc Trung Vị (Khử nhiễu)')
    if (p.sharpen) tags.push('Làm nét (Laplacian)')
    if (p.edgeDetect === 'sobel') tags.push('Biên Sobel')
    if (p.edgeDetect === 'laplacian') tags.push('Biên Laplacian')
    if (p.colorFilter === 'grayscale') tags.push('Ảnh xám')
    if (p.colorFilter === 'binary') tags.push(`Nhị phân (T=${p.thresholdValue})`)
    if (p.colorFilter === 'invert') tags.push('Âm bản')
    if (p.colorFilter === 'sepia') tags.push('Sepia')
    if (p.flipH) tags.push('Lật ngang')
    if (p.flipV) tags.push('Lật dọc')
    setAppliedTags(tags)
  }

  // Handle preset clicks
  const applyPreset = (presetKey: string) => {
    let next = { ...params }

    switch (presetKey) {
      case 'bright_up':
        next.brightness = Math.min(100, next.brightness + 35)
        setActiveTheoryKey('brightness_up')
        break
      case 'bright_down':
        next.brightness = Math.max(-100, next.brightness - 35)
        setActiveTheoryKey('brightness_down')
        break
      case 'contrast_boost':
        next.contrast = next.contrast === 40 ? 0 : 40
        setActiveTheoryKey('contrast')
        break
      case 'salt_pepper':
        next.noiseType = next.noiseType === 'salt-and-pepper' ? 'none' : 'salt-and-pepper'
        next.noiseAmount = next.noiseType === 'salt-and-pepper' ? 30 : 0
        setActiveTheoryKey('noise_salt_pepper')
        break
      case 'gaussian_noise':
        next.noiseType = next.noiseType === 'gaussian' ? 'none' : 'gaussian'
        next.noiseAmount = next.noiseType === 'gaussian' ? 35 : 0
        setActiveTheoryKey('noise_gaussian')
        break
      case 'gaussian_blur':
        next.blurType = next.blurType === 'gaussian' ? 'none' : 'gaussian'
        setActiveTheoryKey('filter_gaussian_blur')
        break
      case 'median_filter':
        next.blurType = next.blurType === 'median' ? 'none' : 'median'
        setActiveTheoryKey('filter_median')
        break
      case 'sharpen':
        next.sharpen = !next.sharpen
        setActiveTheoryKey('sharpen_laplacian')
        break
      case 'sobel_edge':
        next.edgeDetect = next.edgeDetect === 'sobel' ? 'none' : 'sobel'
        setActiveTheoryKey('edge_sobel')
        break
      case 'grayscale':
        next.colorFilter = next.colorFilter === 'grayscale' ? 'none' : 'grayscale'
        setActiveTheoryKey('color_grayscale')
        break
      case 'binary':
        next.colorFilter = next.colorFilter === 'binary' ? 'none' : 'binary'
        setActiveTheoryKey('color_binary')
        break
      case 'invert':
        next.colorFilter = next.colorFilter === 'invert' ? 'none' : 'invert'
        setActiveTheoryKey('color_invert')
        break
      case 'reset':
        next = { ...DEFAULT_CV_PARAMS }
        break
      default:
        break
    }

    setParams(next)
    renderFilteredImage(next)
  }

  const handleParamChange = <K extends keyof CVProcessParams>(key: K, value: CVProcessParams[K]) => {
    const next = { ...params, [key]: value }
    setParams(next)
    renderFilteredImage(next)
  }

  const handleApplyToModel = () => {
    if (processedDataUrlRef.current) {
      onApplyProcessedImage(processedDataUrlRef.current, appliedTags)
    }
  }

  const handleDownload = () => {
    const canvas = previewCanvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `cv-processed-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const currentTheory: CVTheoryInfo =
    CV_THEORY_DATABASE[activeTheoryKey] || CV_THEORY_DATABASE.brightness_up

  return (
    <div className="rounded-xl border border-border bg-card/70 overflow-hidden space-y-4 p-4 shadow-sm">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border pb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary/10 text-primary flex items-center justify-center font-bold">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-foreground flex items-center gap-2">
              Bộ công cụ Tiền xử lý Ảnh (Computer Vision Studio)
              <span className="text-[10px] bg-accent/15 text-accent px-2 py-0.5 rounded-full font-mono font-medium">
                CV & Augmentation
              </span>
            </h3>
            <p className="text-[11px] text-muted-foreground">
              Thử nghiệm độ bền vững (Robustness) của mô hình AI trước biến dạng ánh sáng, nhiễu và quang sai.
            </p>
          </div>
        </div>

        {/* Action Tabs */}
        <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/40 text-xs">
          <button
            type="button"
            onClick={() => setActiveTab('presets')}
            className={`px-3 py-1 rounded font-medium transition-colors ${
              activeTab === 'presets'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            Phím tắt nhanh
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('tuning')}
            className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'tuning'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sliders className="w-3 h-3" />
            Tinh chỉnh chi tiết
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('theory')}
            className={`px-3 py-1 rounded font-medium transition-colors flex items-center gap-1 ${
              activeTab === 'theory'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <BookOpen className="w-3 h-3" />
            Lý thuyết Xử lý ảnh
          </button>
        </div>
      </div>

      {/* Main Studio Viewport: Canvas on Top, Histogram & Info Below */}
      <div className="grid grid-cols-1 gap-3.5">
        {/* Canvas Preview Area */}
        <div className="w-full flex flex-col items-center justify-center rounded-xl border border-border bg-slate-950/90 p-2.5 relative min-h-[260px] max-h-[400px] overflow-hidden group">
          {/* Quick overlay buttons */}
          <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
            <button
              type="button"
              onMouseDown={() => setIsComparing(true)}
              onMouseUp={() => setIsComparing(false)}
              onTouchStart={() => setIsComparing(true)}
              onTouchEnd={() => setIsComparing(false)}
              className="px-2 py-1 rounded-md bg-background/80 hover:bg-background backdrop-blur-md text-[10px] sm:text-[11px] font-semibold text-foreground border border-border shadow-sm flex items-center gap-1.5 transition-all select-none"
              title="Nhấn và giữ để xem ảnh gốc ban đầu"
            >
              <Eye className="w-3.5 h-3.5 text-primary shrink-0" />
              <span>{isComparing ? 'Đang xem ảnh gốc' : 'Giữ để so sánh gốc'}</span>
            </button>

            {appliedTags.length > 0 && (
              <span className="px-2 py-0.5 rounded-full bg-primary/20 text-primary text-[10px] font-mono font-medium backdrop-blur-md">
                {appliedTags.length} hiệu ứng
              </span>
            )}
          </div>

          <div className="absolute top-3 right-3 z-10 flex items-center gap-1.5">
            <button
              type="button"
              onClick={handleDownload}
              className="p-1.5 rounded-md bg-background/80 hover:bg-background backdrop-blur-md text-foreground border border-border transition-colors"
              title="Tải ảnh đã xử lý về máy"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              onClick={() => applyPreset('reset')}
              className="p-1.5 rounded-md bg-background/80 hover:bg-background backdrop-blur-md text-foreground border border-border hover:text-error transition-colors"
              title="Đặt lại ảnh gốc"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Actual Canvas */}
          <canvas
            ref={previewCanvasRef}
            className={`max-h-[380px] w-auto max-w-full rounded-lg object-contain shadow-md transition-opacity duration-150 ${
              isComparing ? 'opacity-0 absolute' : 'opacity-100'
            }`}
          />

          {/* Fallback image when comparing */}
          {isComparing && (
            <img
              src={originalImageSrc}
              alt="Ảnh gốc"
              className="max-h-[380px] w-auto max-w-full rounded-lg object-contain"
            />
          )}
        </div>

        {/* Action Panel: Histogram & Quick Stats */}
        <div className="w-full flex flex-col justify-between space-y-3 bg-muted/20 border border-border rounded-xl p-3">
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <BarChart2 className="w-3.5 h-3.5 text-primary shrink-0" />
                Lược đồ mức xám (Histogram)
              </span>
              <span className="text-[10px] font-mono text-muted-foreground">0 &rarr; 255</span>
            </div>

            <div className="rounded-lg border border-border/80 bg-slate-950 p-2">
              <canvas
                ref={histogramCanvasRef}
                width={256}
                height={80}
                className="w-full h-16 rounded object-contain"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-400 mt-1">
                <span>Vùng tối (Tối)</span>
                <span>Trung gian</span>
                <span>Vùng sáng (Cháy)</span>
              </div>
            </div>
          </div>

          {/* Applied Operations List */}
          <div className="space-y-1.5">
            <span className="text-[11px] font-semibold text-muted-foreground">
              Bộ lọc đang kích hoạt:
            </span>
            <div className="flex flex-wrap gap-1 min-h-[32px]">
              {appliedTags.length === 0 ? (
                <span className="text-[11px] text-muted-foreground italic">
                  Chưa áp dụng bộ lọc nào (Ảnh gốc)
                </span>
              ) : (
                appliedTags.map((tag, idx) => (
                  <span
                    key={idx}
                    className="text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary border border-primary/20 font-medium"
                  >
                    {tag}
                  </span>
                ))
              )}
            </div>
          </div>

          {/* Primary Action Button */}
          <div className="pt-2 border-t border-border/60">
            <Button
              onClick={handleApplyToModel}
              className="w-full text-xs font-semibold min-h-9 h-auto py-2 px-3 bg-primary hover:bg-primary/90 text-primary-foreground shadow-sm whitespace-normal text-center leading-snug flex items-center justify-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5 shrink-0" />
              <span>Áp dụng vào mô hình</span>
            </Button>
          </div>
        </div>
      </div>

      {/* Control Panel by Tab */}
      {activeTab === 'presets' && (
        <div className="space-y-3 pt-1">
          <div className="flex flex-wrap items-center justify-between gap-1.5">
            <span className="text-xs font-semibold text-foreground">
              Phép biến đổi nhanh (1-chạm):
            </span>
            <span className="text-[11px] text-muted-foreground">
              Bấm liên tiếp để tăng mức độ
            </span>
          </div>

          {/* Presets Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {/* 1. Tăng sáng */}
            <button
              type="button"
              onClick={() => applyPreset('bright_up')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.brightness > 0
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-500'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Sun className="w-4 h-4 text-amber-500" />
                <span className="text-[10px] font-mono font-bold">
                  {params.brightness > 0 ? `+${params.brightness}` : '+35'}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold">Tăng sáng</p>
                <p className="text-[10px] text-muted-foreground">Bù sáng ảnh tối</p>
              </div>
            </button>

            {/* 2. Tăng tối */}
            <button
              type="button"
              onClick={() => applyPreset('bright_down')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.brightness < 0
                  ? 'border-indigo-500/50 bg-indigo-500/10 text-indigo-400'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Moon className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-mono font-bold">
                  {params.brightness < 0 ? `${params.brightness}` : '-35'}
                </span>
              </div>
              <div>
                <p className="text-xs font-semibold">Tăng tối</p>
                <p className="text-[10px] text-muted-foreground">Hạ sáng / ban đêm</p>
              </div>
            </button>

            {/* 3. Nhiễu muối tiêu */}
            <button
              type="button"
              onClick={() => applyPreset('salt_pepper')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.noiseType === 'salt-and-pepper'
                  ? 'border-rose-500/50 bg-rose-500/10 text-rose-500'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Zap className="w-4 h-4 text-rose-500" />
                <span className="text-[10px] font-mono font-bold">Impulse</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Nhiễu Muối Tiêu</p>
                <p className="text-[10px] text-muted-foreground">Salt &amp; Pepper noise</p>
              </div>
            </button>

            {/* 4. Nhiễu Gauss */}
            <button
              type="button"
              onClick={() => applyPreset('gaussian_noise')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.noiseType === 'gaussian'
                  ? 'border-purple-500/50 bg-purple-500/10 text-purple-400'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Sparkles className="w-4 h-4 text-purple-400" />
                <span className="text-[10px] font-mono font-bold">N(0,σ)</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Nhiễu Gauss</p>
                <p className="text-[10px] text-muted-foreground">Cảm biến ISO cao</p>
              </div>
            </button>

            {/* 5. Khử nhiễu Median */}
            <button
              type="button"
              onClick={() => applyPreset('median_filter')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.blurType === 'median'
                  ? 'border-green-500/50 bg-green-500/10 text-green-500'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Check className="w-4 h-4 text-green-500" />
                <span className="text-[10px] font-mono font-bold">Median</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Lọc Trung Vị</p>
                <p className="text-[10px] text-muted-foreground">Xóa nhiễu giữ cạnh</p>
              </div>
            </button>

            {/* 6. Làm mờ Gauss */}
            <button
              type="button"
              onClick={() => applyPreset('gaussian_blur')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.blurType === 'gaussian'
                  ? 'border-cyan-500/50 bg-cyan-500/10 text-cyan-400'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Layers className="w-4 h-4 text-cyan-400" />
                <span className="text-[10px] font-mono font-bold">Blur</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Làm mờ Gauss</p>
                <p className="text-[10px] text-muted-foreground">Mất nét / Defocus</p>
              </div>
            </button>

            {/* 7. Làm nét Sharpen */}
            <button
              type="button"
              onClick={() => applyPreset('sharpen')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.sharpen
                  ? 'border-amber-500/50 bg-amber-500/10 text-amber-400'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Sparkles className="w-4 h-4 text-amber-400" />
                <span className="text-[10px] font-mono font-bold">Laplacian</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Làm nét ảnh</p>
                <p className="text-[10px] text-muted-foreground">Tôn viền chi tiết</p>
              </div>
            </button>

            {/* 8. Tách biên Sobel */}
            <button
              type="button"
              onClick={() => applyPreset('sobel_edge')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.edgeDetect === 'sobel'
                  ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Maximize2 className="w-4 h-4 text-emerald-400" />
                <span className="text-[10px] font-mono font-bold">Sobel</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Tách biên Sobel</p>
                <p className="text-[10px] text-muted-foreground">Phát hiện cạnh bao</p>
              </div>
            </button>

            {/* 9. Ảnh xám Grayscale */}
            <button
              type="button"
              onClick={() => applyPreset('grayscale')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.colorFilter === 'grayscale'
                  ? 'border-slate-400/50 bg-slate-400/10 text-slate-300'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <div className="w-4 h-4 rounded-full bg-slate-400" />
                <span className="text-[10px] font-mono font-bold">BT.601</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Ảnh mức xám</p>
                <p className="text-[10px] text-muted-foreground">1 kênh Luminance</p>
              </div>
            </button>

            {/* 10. Phân ngưỡng nhị phân */}
            <button
              type="button"
              onClick={() => applyPreset('binary')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.colorFilter === 'binary'
                  ? 'border-yellow-500/50 bg-yellow-500/10 text-yellow-400'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <ArrowRightLeft className="w-4 h-4 text-yellow-400" />
                <span className="text-[10px] font-mono font-bold">T=128</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Phân ngưỡng</p>
                <p className="text-[10px] text-muted-foreground">Nhị phân đen/trắng</p>
              </div>
            </button>

            {/* 11. Âm bản Invert */}
            <button
              type="button"
              onClick={() => applyPreset('invert')}
              className={`p-2.5 rounded-xl border text-left transition-all hover:scale-[1.02] flex flex-col justify-between ${
                params.colorFilter === 'invert'
                  ? 'border-pink-500/50 bg-pink-500/10 text-pink-400'
                  : 'border-border bg-card/80 hover:bg-muted/40 text-foreground'
              }`}
            >
              <div className="flex items-center justify-between mb-1">
                <Sun className="w-4 h-4 text-pink-400 rotate-180" />
                <span className="text-[10px] font-mono font-bold">255 - I</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Âm bản (Invert)</p>
                <p className="text-[10px] text-muted-foreground">Đảo chiều ánh sáng</p>
              </div>
            </button>

            {/* 12. Reset */}
            <button
              type="button"
              onClick={() => applyPreset('reset')}
              className="p-2.5 rounded-xl border border-dashed border-border hover:border-error/50 bg-muted/20 hover:bg-error/10 text-left transition-all hover:scale-[1.02] flex flex-col justify-between text-muted-foreground hover:text-error"
            >
              <div className="flex items-center justify-between mb-1">
                <RotateCcw className="w-4 h-4" />
                <span className="text-[10px] font-mono font-bold">Reset</span>
              </div>
              <div>
                <p className="text-xs font-semibold">Đặt lại gốc</p>
                <p className="text-[10px]">Xoá toàn bộ hiệu ứng</p>
              </div>
            </button>
          </div>
        </div>
      )}

      {/* Tab: Detailed Tuning Sliders */}
      {activeTab === 'tuning' && (
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
            {/* Slider Độ sáng */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center font-medium">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Sun className="w-3.5 h-3.5 text-amber-500" />
                  Độ sáng (Brightness):
                </span>
                <span className="font-mono font-bold text-primary">
                  {params.brightness > 0 ? `+${params.brightness}` : params.brightness}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={params.brightness}
                onChange={(e) => handleParamChange('brightness', parseInt(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg cursor-pointer bg-muted"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>-100 (Tối thui)</span>
                <span>0 (Gốc)</span>
                <span>+100 (Chói lóa)</span>
              </div>
            </div>

            {/* Slider Tương phản */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center font-medium">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Layers className="w-3.5 h-3.5 text-blue-500" />
                  Độ tương phản (Contrast):
                </span>
                <span className="font-mono font-bold text-primary">
                  {params.contrast > 0 ? `+${params.contrast}` : params.contrast}
                </span>
              </div>
              <input
                type="range"
                min="-100"
                max="100"
                value={params.contrast}
                onChange={(e) => handleParamChange('contrast', parseInt(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg cursor-pointer bg-muted"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>-100 (Phẳng)</span>
                <span>0 (Chuẩn)</span>
                <span>+100 (Gắt)</span>
              </div>
            </div>

            {/* Mức độ & Loại nhiễu */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center font-medium">
                <span className="flex items-center gap-1.5 text-foreground">
                  <Zap className="w-3.5 h-3.5 text-rose-500" />
                  Thêm nhiễu (Noise):
                </span>
                <select
                  value={params.noiseType}
                  onChange={(e) =>
                    handleParamChange(
                      'noiseType',
                      e.target.value as CVProcessParams['noiseType']
                    )
                  }
                  className="px-2 py-0.5 rounded bg-background border border-border text-[11px] font-medium"
                >
                  <option value="none">Không nhiễu</option>
                  <option value="salt-and-pepper">Muối tiêu (Salt &amp; Pepper)</option>
                  <option value="gaussian">Gauss (Gaussian)</option>
                  <option value="speckle">Đốm (Speckle)</option>
                </select>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                disabled={params.noiseType === 'none'}
                value={params.noiseAmount}
                onChange={(e) => handleParamChange('noiseAmount', parseInt(e.target.value))}
                className="w-full accent-primary h-1.5 rounded-lg cursor-pointer bg-muted disabled:opacity-40"
              />
              <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
                <span>0%</span>
                <span>Mật độ: {params.noiseAmount}%</span>
                <span>100%</span>
              </div>
            </div>

            {/* Bộ lọc làm mờ / Khử nhiễu */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center font-medium">
                <span className="text-foreground">Lọc không gian (Spatial Filter):</span>
                <select
                  value={params.blurType}
                  onChange={(e) =>
                    handleParamChange(
                      'blurType',
                      e.target.value as CVProcessParams['blurType']
                    )
                  }
                  className="px-2 py-0.5 rounded bg-background border border-border text-[11px] font-medium"
                >
                  <option value="none">Không lọc</option>
                  <option value="gaussian">Làm mờ Gauss (Low-pass)</option>
                  <option value="box">Lọc trung bình (Box blur)</option>
                  <option value="median">Lọc trung vị (Median - Khử nhiễu)</option>
                </select>
              </div>
              <p className="text-[10px] text-muted-foreground">
                Lọc trung vị loại bỏ hoàn hảo nhiễu muối tiêu mà không gây nhòe biên.
              </p>
            </div>

            {/* Phân ngưỡng / Màu sắc */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <div className="flex justify-between items-center font-medium">
                <span className="text-foreground">Màu &amp; Phân ngưỡng:</span>
                <select
                  value={params.colorFilter}
                  onChange={(e) =>
                    handleParamChange(
                      'colorFilter',
                      e.target.value as CVProcessParams['colorFilter']
                    )
                  }
                  className="px-2 py-0.5 rounded bg-background border border-border text-[11px] font-medium"
                >
                  <option value="none">Màu gốc (RGB)</option>
                  <option value="grayscale">Ảnh xám (Grayscale)</option>
                  <option value="binary">Phân ngưỡng nhị phân</option>
                  <option value="invert">Âm bản (Invert)</option>
                  <option value="sepia">Tông màu Sepia</option>
                </select>
              </div>

              {params.colorFilter === 'binary' && (
                <div className="space-y-1 pt-1">
                  <div className="flex justify-between text-[10px] font-mono">
                    <span>Ngưỡng T:</span>
                    <span className="font-bold text-primary">{params.thresholdValue}</span>
                  </div>
                  <input
                    type="range"
                    min="0"
                    max="255"
                    value={params.thresholdValue}
                    onChange={(e) =>
                      handleParamChange('thresholdValue', parseInt(e.target.value))
                    }
                    className="w-full accent-primary h-1.5 rounded-lg cursor-pointer bg-muted"
                  />
                </div>
              )}
            </div>

            {/* Tăng cường hình học (Geometric Augmentation) */}
            <div className="p-3 rounded-xl border border-border bg-muted/20 space-y-2">
              <span className="font-medium text-foreground block">
                Biến đổi hình học (Augmentation):
              </span>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => handleParamChange('flipH', !params.flipH)}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                    params.flipH
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Lật ngang (Flip H)
                </button>
                <button
                  type="button"
                  onClick={() => handleParamChange('flipV', !params.flipV)}
                  className={`flex-1 py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors ${
                    params.flipV
                      ? 'border-primary bg-primary/10 text-primary'
                      : 'border-border text-muted-foreground hover:text-foreground'
                  }`}
                >
                  Lật dọc (Flip V)
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: Theory & Computer Vision Science */}
      {activeTab === 'theory' && (
        <div className="space-y-3 pt-1">
          {/* Quick select theory topic */}
          <div className="flex flex-wrap gap-1.5 pb-2 border-b border-border/50">
            {Object.entries(CV_THEORY_DATABASE).map(([key, item]) => (
              <button
                key={key}
                type="button"
                onClick={() => setActiveTheoryKey(key)}
                className={`text-[11px] px-2.5 py-1 rounded-md font-medium transition-colors ${
                  activeTheoryKey === key
                    ? 'bg-primary text-primary-foreground font-semibold'
                    : 'bg-muted/40 text-muted-foreground hover:text-foreground'
                }`}
              >
                {item.title.split('(')[0].trim()}
              </button>
            ))}
          </div>

          {/* Theory Card */}
          <div className="rounded-xl border border-border bg-card p-4 space-y-3">
            <div className="flex items-start justify-between">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-wider text-primary font-bold">
                  Computer Vision &bull; {currentTheory.category}
                </span>
                <h4 className="text-base font-bold text-foreground mt-0.5">
                  {currentTheory.title}
                </h4>
              </div>
              <span className="p-1.5 rounded-lg bg-primary/10 text-primary">
                <Info className="w-4 h-4" />
              </span>
            </div>

            {/* Formula Block */}
            <div className="rounded-lg bg-slate-950 p-3 font-mono text-xs text-emerald-400 border border-slate-800">
              <span className="text-[10px] text-slate-500 block mb-1 font-sans">
                Công thức toán học định lượng:
              </span>
              <code>{currentTheory.formula}</code>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <div className="space-y-1">
                <p className="font-semibold text-foreground">Nguyên lý thuật toán:</p>
                <p className="text-muted-foreground leading-relaxed">
                  {currentTheory.description}
                </p>
              </div>

              <div className="space-y-1">
                <p className="font-semibold text-foreground">Ứng dụng thực tế:</p>
                <p className="text-muted-foreground leading-relaxed">
                  {currentTheory.applications}
                </p>
              </div>
            </div>

            <div className="p-2.5 rounded-lg border border-amber-500/30 bg-amber-500/10 text-xs text-amber-600 dark:text-amber-400">
              <span className="font-bold">Đánh giá tính bền vững AI (Model Robustness): </span>
              {currentTheory.robustnessNote}
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
