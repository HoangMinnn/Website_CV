'use client'

import { useState, useRef } from 'react'
import {
  Upload,
  ImageIcon,
  Video,
  Sparkles,
  X,
  CheckCircle2,
  Sun,
  Moon,
  Zap,
  Sliders,
  RotateCcw,
  Maximize2,
  Camera,
  Layers,
  BookOpen,
  Eye
} from 'lucide-react'
import { InputImageMedia } from './types'
import { SAMPLE_IMAGES } from './sample-data'
import { Button } from '@/components/ui/button'
import { CVFilterStudio } from './cv-filter-studio'
import { applyCVProcessing, DEFAULT_CV_PARAMS } from '@/lib/cv-algorithms'

const SUPPORTED_IMAGE_FORMATS = ['.jpg', '.jpeg', '.png', '.webp', '.bmp']
const SUPPORTED_VIDEO_FORMATS = ['.mp4', '.webm', '.mov', '.ogg']
const MAX_IMAGE_SIZE_MB = 25
const MAX_VIDEO_SIZE_MB = 50

interface InputMediaTabsProps {
  inputMedia: InputImageMedia | null
  setInputMedia: (media: InputImageMedia | null) => void
}

export function InputMediaTabs({ inputMedia, setInputMedia }: InputMediaTabsProps) {
  const [activeTab, setActiveTab] = useState<'upload' | 'video' | 'samples'>('upload')
  const [isDragging, setIsDragging] = useState(false)
  const [showStudioModal, setShowStudioModal] = useState(false)

  // Video State
  const [videoFile, setVideoFile] = useState<File | null>(null)
  const [videoUrl, setVideoUrl] = useState<string | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)

  const imageInputRef = useRef<HTMLInputElement>(null)
  const videoInputRef = useRef<HTMLInputElement>(null)

  // Process uploaded image file
  const handleProcessImage = (file: File) => {
    const sizeMB = +(file.size / (1024 * 1024)).toFixed(2)
    if (sizeMB > MAX_IMAGE_SIZE_MB) {
      alert(`Ảnh quá lớn (${sizeMB}MB). Giới hạn tối đa là ${MAX_IMAGE_SIZE_MB}MB`)
      return
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!SUPPORTED_IMAGE_FORMATS.includes(ext)) {
      alert(`Định dạng "${ext}" không được hỗ trợ. Vui lòng tải file: ${SUPPORTED_IMAGE_FORMATS.join(', ')}`)
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      const previewUrl = e.target?.result as string
      const img = new Image()
      img.onload = () => {
        setInputMedia({
          file,
          fileName: file.name,
          previewUrl,
          originalUrl: previewUrl,
          width: img.naturalWidth,
          height: img.naturalHeight,
          sizeMB,
          isSample: false,
          mediaType: 'image',
          appliedFilters: [],
        })
      }
      img.src = previewUrl
    }
    reader.readAsDataURL(file)
  }

  // Handle uploaded video file
  const handleProcessVideo = (file: File) => {
    const sizeMB = +(file.size / (1024 * 1024)).toFixed(2)
    if (sizeMB > MAX_VIDEO_SIZE_MB) {
      alert(`Video quá lớn (${sizeMB}MB). Giới hạn tối đa là ${MAX_VIDEO_SIZE_MB}MB`)
      return
    }

    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!SUPPORTED_VIDEO_FORMATS.includes(ext)) {
      alert(`Định dạng video "${ext}" không hỗ trợ. Hỗ trợ: ${SUPPORTED_VIDEO_FORMATS.join(', ')}`)
      return
    }

    const url = URL.createObjectURL(file)
    setVideoFile(file)
    setVideoUrl(url)
  }

  // Capture current frame from video to test model
  const handleCaptureFrame = () => {
    const video = videoRef.current
    if (!video) return

    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth || 640
    canvas.height = video.videoHeight || 480
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
    const previewUrl = canvas.toDataURL('image/png')
    const fileName = `frame-${videoFile?.name || 'video'}-${Date.now().toString().slice(-4)}.png`

    setInputMedia({
      file: null,
      fileName,
      previewUrl,
      originalUrl: previewUrl,
      width: canvas.width,
      height: canvas.height,
      sizeMB: +(previewUrl.length / (1024 * 1024)).toFixed(2),
      isSample: false,
      mediaType: 'video',
      appliedFilters: ['Khung hình trích xuất từ Video'],
    })
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      if (activeTab === 'video') {
        handleProcessVideo(e.dataTransfer.files[0])
      } else {
        handleProcessImage(e.dataTransfer.files[0])
      }
    }
  }

  const handleSelectSample = (sampleId: string) => {
    const sample = SAMPLE_IMAGES.find((s) => s.id === sampleId)
    if (!sample) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = 800
      canvas.height = 500
      const ctx = canvas.getContext('2d')
      if (ctx) {
        ctx.drawImage(img, 0, 0, 800, 500)
        const pngUrl = canvas.toDataURL('image/png')
        setInputMedia({
          file: null,
          fileName: `${sample.name}.png`,
          previewUrl: pngUrl,
          originalUrl: pngUrl,
          width: 800,
          height: 500,
          sizeMB: 0.2,
          isSample: true,
          mediaType: 'image',
          appliedFilters: [],
        })
      }
    }
    img.src = sample.previewUrl
  }

  // 1-Click Quick CV Filter Action directly on the card
  const handleQuickFilter = (
    type: 'bright_up' | 'bright_down' | 'salt_pepper' | 'gaussian_noise' | 'sharpen' | 'sobel' | 'grayscale' | 'median' | 'reset'
  ) => {
    if (!inputMedia) return

    if (type === 'reset') {
      setInputMedia({
        ...inputMedia,
        previewUrl: inputMedia.originalUrl || inputMedia.previewUrl,
        appliedFilters: [],
      })
      return
    }

    const baseSrc = inputMedia.originalUrl || inputMedia.previewUrl
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      const canvas = document.createElement('canvas')
      canvas.width = img.naturalWidth || 800
      canvas.height = img.naturalHeight || 500
      const ctx = canvas.getContext('2d')
      if (!ctx) return
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      const p = { ...DEFAULT_CV_PARAMS }
      let tag = ''

      if (type === 'bright_up') {
        p.brightness = 40
        tag = 'Tăng sáng (+40)'
      } else if (type === 'bright_down') {
        p.brightness = -40
        tag = 'Tăng tối (-40)'
      } else if (type === 'salt_pepper') {
        p.noiseType = 'salt-and-pepper'
        p.noiseAmount = 30
        tag = 'Nhiễu muối tiêu (30%)'
      } else if (type === 'gaussian_noise') {
        p.noiseType = 'gaussian'
        p.noiseAmount = 35
        tag = 'Nhiễu Gauss (35%)'
      } else if (type === 'sharpen') {
        p.sharpen = true
        tag = 'Làm nét Laplacian'
      } else if (type === 'sobel') {
        p.edgeDetect = 'sobel'
        tag = 'Tách biên Sobel'
      } else if (type === 'grayscale') {
        p.colorFilter = 'grayscale'
        tag = 'Ảnh mức xám'
      } else if (type === 'median') {
        p.blurType = 'median'
        tag = 'Lọc trung vị Median'
      }

      const res = applyCVProcessing(ctx, canvas.width, canvas.height, p)
      ctx.putImageData(res.imageData, 0, 0)
      const newUrl = canvas.toDataURL('image/png')

      setInputMedia({
        ...inputMedia,
        previewUrl: newUrl,
        appliedFilters: [tag],
      })
    }
    img.src = baseSrc
  }

  return (
    <div className="space-y-4">
      {/* Tabs Selection Bar */}
      <div className="flex items-center justify-between border-b border-border pb-2 flex-wrap gap-2">
        <div className="flex gap-1.5 bg-muted/40 p-0.5 rounded-lg border border-border">
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'upload'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <ImageIcon className="w-3.5 h-3.5" />
            Tải ảnh từ máy
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('video')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'video'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Video className="w-3.5 h-3.5" />
            Tải video &amp; Frame
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('samples')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-colors flex items-center gap-1.5 ${
              activeTab === 'samples'
                ? 'bg-primary text-primary-foreground shadow-xs'
                : 'text-muted-foreground hover:text-foreground'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            Ảnh mẫu có sẵn
          </button>
        </div>

        {inputMedia && (
          <span className="text-[11px] text-green-500 bg-green-500/10 px-2.5 py-1 rounded-full font-medium flex items-center gap-1 border border-green-500/20">
            <CheckCircle2 className="w-3 h-3" />
            Đã sẵn sàng kiểm thử
          </span>
        )}
      </div>

      {/* 1. Tab Image Upload Zone */}
      {activeTab === 'upload' && !inputMedia && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => imageInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[0.99]'
              : 'border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/30'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-3 shadow-xs">
            <ImageIcon className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-foreground text-sm mb-1">
            Kéo thả hoặc click để chọn ảnh test mô hình
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Hỗ trợ: <span className="font-mono font-medium text-foreground">{SUPPORTED_IMAGE_FORMATS.join(' ')}</span> (Tối đa {MAX_IMAGE_SIZE_MB}MB)
          </p>
          <Button size="sm" variant="outline" className="pointer-events-none text-xs">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Chọn ảnh từ máy tính
          </Button>
          <input
            ref={imageInputRef}
            id="image-upload-input"
            type="file"
            accept={SUPPORTED_IMAGE_FORMATS.join(',')}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleProcessImage(e.target.files[0])
                e.target.value = ''
              }
            }}
            className="hidden"
            aria-label="Upload test image"
          />
        </div>
      )}

      {/* 2. Tab Video Upload Zone & Frame Extractor */}
      {activeTab === 'video' && (
        <div className="space-y-3">
          {!videoUrl ? (
            <div
              onDragOver={(e) => {
                e.preventDefault()
                setIsDragging(true)
              }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => videoInputRef.current?.click()}
              className="border-2 border-dashed border-border/80 hover:border-primary/60 rounded-xl p-6 text-center cursor-pointer bg-muted/20 hover:bg-muted/30 transition-all"
            >
              <div className="w-12 h-12 rounded-xl bg-accent/15 text-accent flex items-center justify-center mx-auto mb-3">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="font-semibold text-foreground text-sm mb-1">
                Tải lên video để trích xuất khung hình kiểm thử
              </h4>
              <p className="text-xs text-muted-foreground mb-3">
                Định dạng: <span className="font-mono font-medium text-foreground">{SUPPORTED_VIDEO_FORMATS.join(' ')}</span> (Tối đa {MAX_VIDEO_SIZE_MB}MB)
              </p>
              <Button size="sm" variant="outline" className="pointer-events-none text-xs">
                <Upload className="w-3.5 h-3.5 mr-1.5" />
                Chọn video từ máy
              </Button>
              <input
                ref={videoInputRef}
                type="file"
                accept={SUPPORTED_VIDEO_FORMATS.join(',')}
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleProcessVideo(e.target.files[0])
                    e.target.value = ''
                  }
                }}
                className="hidden"
                aria-label="Upload test video"
              />
            </div>
          ) : (
            <div className="rounded-xl border border-border bg-card p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-primary" />
                  Video: {videoFile?.name}
                </span>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => {
                    setVideoUrl(null)
                    setVideoFile(null)
                  }}
                  className="text-xs h-7 text-muted-foreground hover:text-error"
                >
                  Đổi video
                </Button>
              </div>

              <div className="relative rounded-lg overflow-hidden bg-black max-h-[280px] flex items-center justify-center">
                <video
                  ref={videoRef}
                  src={videoUrl}
                  controls
                  className="max-h-[280px] w-full object-contain"
                />
              </div>

              <div className="flex items-center justify-between pt-1">
                <p className="text-[11px] text-muted-foreground">
                  Phát video đến khoảnh khắc bạn muốn, sau đó chụp khung hình:
                </p>
                <Button
                  size="sm"
                  onClick={handleCaptureFrame}
                  className="text-xs h-8 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-xs"
                >
                  <Camera className="w-3.5 h-3.5 mr-1.5" />
                  Chụp khung hình này làm ảnh test
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* 3. Tab Samples Grid */}
      {activeTab === 'samples' && (
        <div className="grid grid-cols-2 gap-2.5">
          {SAMPLE_IMAGES.map((sample) => (
            <button
              key={sample.id}
              type="button"
              onClick={() => handleSelectSample(sample.id)}
              className="group border border-border hover:border-primary/60 rounded-xl overflow-hidden bg-card/60 p-2.5 text-left transition-all hover:bg-muted/30 flex flex-col gap-2"
            >
              <div className="relative aspect-[16/10] w-full rounded-lg overflow-hidden bg-muted/50 border border-border/40">
                <img
                  src={sample.previewUrl}
                  alt={sample.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                />
                <span className="absolute bottom-1 right-1 text-[9px] font-medium bg-background/80 backdrop-blur-sm px-1.5 py-0.5 rounded text-foreground">
                  {sample.category}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-foreground truncate">{sample.name}</span>
                <span className="text-[10px] text-primary group-hover:underline">Chọn ảnh →</span>
              </div>
            </button>
          ))}
        </div>
      )}

      {/* 4. Selected Image Preview Card + Quick CV Filters Toolbar */}
      {inputMedia && (
        <div className="rounded-xl border border-border bg-card p-4 space-y-4 shadow-sm">
          {/* Header & Meta */}
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-16 h-14 rounded-lg overflow-hidden border border-border bg-slate-950 flex items-center justify-center flex-shrink-0 relative group">
                <img
                  src={inputMedia.previewUrl}
                  alt={inputMedia.fileName}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="min-w-0">
                <p className="font-semibold text-foreground text-xs truncate max-w-[200px]">
                  {inputMedia.fileName}
                </p>
                <p className="text-[11px] text-muted-foreground font-mono">
                  {inputMedia.width} x {inputMedia.height} px &bull; {inputMedia.sizeMB} MB
                </p>
                {inputMedia.appliedFilters && inputMedia.appliedFilters.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {inputMedia.appliedFilters.map((f, i) => (
                      <span
                        key={i}
                        className="text-[9px] bg-primary/10 text-primary px-1.5 py-0.5 rounded font-medium border border-primary/20"
                      >
                        {f}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setInputMedia(null)}
                className="p-1.5 rounded-lg text-muted-foreground hover:text-error hover:bg-error/10 transition-colors"
                title="Gỡ ảnh"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>

          {/* Quick CV Action Buttons (Tăng sáng, Tăng tối, Thêm nhiễu, Làm mờ, Sobel...) */}
          <div className="pt-2 border-t border-border space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <span className="text-[11px] font-bold text-foreground flex items-center gap-1.5">
                <Zap className="w-3.5 h-3.5 text-primary" />
                Xử lý ảnh nhanh (CV Pre-processing):
              </span>
              <button
                type="button"
                onClick={() => setShowStudioModal(!showStudioModal)}
                className="text-[11px] font-semibold text-primary hover:underline flex items-center gap-1"
              >
                <Sliders className="w-3 h-3" />
                {showStudioModal ? 'Thu gọn Studio' : 'Mở Studio nâng cao & Lý thuyết CV'}
              </button>
            </div>

            {/* Quick action buttons row */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1.5 text-xs">
              {/* Tăng sáng */}
              <button
                type="button"
                onClick={() => handleQuickFilter('bright_up')}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:border-amber-500/50 hover:bg-amber-500/10 text-foreground transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Tăng độ sáng (+40) - Bù sáng cho ảnh chụp thiếu sáng"
              >
                <Sun className="w-3.5 h-3.5 text-amber-500" />
                Tăng sáng
              </button>

              {/* Tăng tối */}
              <button
                type="button"
                onClick={() => handleQuickFilter('bright_down')}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:border-indigo-500/50 hover:bg-indigo-500/10 text-foreground transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Tăng tối (-40) - Mô phỏng cảnh đêm / ngược sáng"
              >
                <Moon className="w-3.5 h-3.5 text-indigo-400" />
                Tăng tối
              </button>

              {/* Nhiễu muối tiêu */}
              <button
                type="button"
                onClick={() => handleQuickFilter('salt_pepper')}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:border-rose-500/50 hover:bg-rose-500/10 text-foreground transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Thêm nhiễu muối tiêu (Salt & Pepper) - Kiểm thử độ bền của mô hình"
              >
                <Zap className="w-3.5 h-3.5 text-rose-500" />
                Nhiễu Muối Tiêu
              </button>

              {/* Nhiễu Gauss */}
              <button
                type="button"
                onClick={() => handleQuickFilter('gaussian_noise')}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:border-purple-500/50 hover:bg-purple-500/10 text-foreground transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Thêm nhiễu Gauss - Mô phỏng ISO cao & dao động nhiệt cảm biến"
              >
                <Sparkles className="w-3.5 h-3.5 text-purple-400" />
                Nhiễu Gauss
              </button>

              {/* Tách biên Sobel */}
              <button
                type="button"
                onClick={() => handleQuickFilter('sobel')}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:border-emerald-500/50 hover:bg-emerald-500/10 text-foreground transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Toán tử Sobel - Trích xuất đường bao và viền đối tượng"
              >
                <Maximize2 className="w-3.5 h-3.5 text-emerald-500" />
                Biên Sobel
              </button>

              {/* Làm nét */}
              <button
                type="button"
                onClick={() => handleQuickFilter('sharpen')}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:border-amber-500/50 hover:bg-amber-500/10 text-foreground transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Làm nét ảnh bằng Laplacian Kernel"
              >
                <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                Làm nét
              </button>

              {/* Lọc trung vị */}
              <button
                type="button"
                onClick={() => handleQuickFilter('median')}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:border-green-500/50 hover:bg-green-500/10 text-foreground transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Lọc trung vị (Median Filter) - Khử nhiễu muối tiêu giữ nguyên cạnh"
              >
                <Layers className="w-3.5 h-3.5 text-green-500" />
                Khử nhiễu
              </button>

              {/* Ảnh xám */}
              <button
                type="button"
                onClick={() => handleQuickFilter('grayscale')}
                className="px-2.5 py-1.5 rounded-lg border border-border hover:border-slate-500/50 hover:bg-slate-500/10 text-foreground transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Chuyển sang ảnh mức xám ITU-R BT.601"
              >
                <div className="w-3 h-3 rounded-full bg-slate-400" />
                Ảnh xám
              </button>

              {/* Đặt lại gốc */}
              <button
                type="button"
                onClick={() => handleQuickFilter('reset')}
                className="col-span-2 px-2.5 py-1.5 rounded-lg border border-dashed border-border hover:border-error/50 hover:bg-error/10 text-muted-foreground hover:text-error transition-all flex items-center gap-1.5 justify-center text-[11px] font-medium"
                title="Khôi phục lại ảnh ban đầu"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                Đặt lại ảnh gốc
              </button>
            </div>
          </div>

          {/* Full Computer Vision Studio Expandable Panel */}
          {showStudioModal && (
            <div className="pt-3 border-t border-border animate-fadeInUp">
              <CVFilterStudio
                originalImageSrc={inputMedia.originalUrl || inputMedia.previewUrl}
                onApplyProcessedImage={(processedUrl, tags) => {
                  setInputMedia({
                    ...inputMedia,
                    previewUrl: processedUrl,
                    appliedFilters: tags,
                  })
                }}
              />
            </div>
          )}
        </div>
      )}
    </div>
  )
}
