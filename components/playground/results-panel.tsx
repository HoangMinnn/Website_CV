'use client'

import { useEffect, useRef, useState } from 'react'
import { Download, Copy, Check, Eye, EyeOff, Sliders, Layers, BarChart2, Tag, CheckCircle2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { InputImageMedia, ModelInfo, InferenceResult, DetectionBox } from './types'

interface ResultsPanelProps {
  inputMedia: InputImageMedia
  model: ModelInfo
  results: InferenceResult
  confidenceThreshold: number
  onConfidenceChange: (val: number) => void
  showBbox: boolean
  onToggleBbox: (val: boolean) => void
  showLabels: boolean
  onToggleLabels: (val: boolean) => void
}

export function ResultsPanel({
  inputMedia,
  model,
  results,
  confidenceThreshold,
  onConfidenceChange,
  showBbox,
  onToggleBbox,
  showLabels,
  onToggleLabels,
}: ResultsPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [copied, setCopied] = useState(false)
  const [selectedDetectionId, setSelectedDetectionId] = useState<string | null>(null)
  const [viewMode, setViewMode] = useState<'detected' | 'original' | 'split'>('detected')

  // Filter detections based on confidence threshold
  const activeDetections = results.detections.filter(
    (d) => d.confidence >= confidenceThreshold
  )

  const availableClasses =
    results.modelClasses && results.modelClasses.length > 0
      ? results.modelClasses
      : model.classes || []

  // Draw on canvas whenever image, results, or view options change
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !inputMedia.previewUrl) return

    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      canvas.width = img.naturalWidth || 800
      canvas.height = img.naturalHeight || 500

      // Draw background image
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)

      // Draw segmentation mask overlay if available
      if (results.segMask && viewMode !== 'original') {
        const maskImg = new Image()
        maskImg.onload = () => {
          ctx.save()
          ctx.globalAlpha = 0.55
          ctx.drawImage(maskImg, 0, 0, canvas.width, canvas.height)
          ctx.restore()
        }
        maskImg.src = results.segMask
      }

      // Only draw detections in 'detected' mode or if bbox toggle is on
      if (viewMode === 'original' || !showBbox) return

      // Draw each detection
      activeDetections.forEach((det) => {
        const isSelected = selectedDetectionId === det.id
        const boxX = det.x * canvas.width
        const boxY = det.y * canvas.height
        const boxW = det.width * canvas.width
        const boxH = det.height * canvas.height

        ctx.save()
        ctx.strokeStyle = det.color
        ctx.lineWidth = isSelected ? 4 : 2.5
        ctx.fillStyle = `${det.color}25` // 15% opacity fill

        // Draw polygon if provided (segmentation / OBB)
        if (det.polygon && det.polygon.length >= 3) {
          ctx.beginPath()
          det.polygon.forEach((pt, pIdx) => {
            const px = pt[0] * canvas.width
            const py = pt[1] * canvas.height
            if (pIdx === 0) ctx.moveTo(px, py)
            else ctx.lineTo(px, py)
          })
          ctx.closePath()
          ctx.stroke()
          ctx.fill()
        } else {
          ctx.strokeRect(boxX, boxY, boxW, boxH)
          ctx.fillRect(boxX, boxY, boxW, boxH)
        }

        // Label pill
        if (showLabels) {
          const labelText = `${det.label} ${(det.confidence * 100).toFixed(0)}%`
          ctx.font = 'bold 13px sans-serif'
          const textMetrics = ctx.measureText(labelText)
          const textWidth = textMetrics.width
          const textHeight = 20

          // Label background
          ctx.fillStyle = det.color
          ctx.beginPath()
          ctx.roundRect(boxX, Math.max(0, boxY - textHeight), textWidth + 12, textHeight, 4)
          ctx.fill()

          // Label text
          ctx.fillStyle = '#ffffff'
          ctx.fillText(labelText, boxX + 6, Math.max(14, boxY - 5))
        }

        ctx.restore()
      })
    }
    img.src = inputMedia.previewUrl
  }, [inputMedia.previewUrl, activeDetections, showBbox, showLabels, selectedDetectionId, viewMode])

  const handleDownload = () => {
    const canvas = canvasRef.current
    if (!canvas) return
    const link = document.createElement('a')
    link.download = `inference-result-${Date.now()}.png`
    link.href = canvas.toDataURL('image/png')
    link.click()
  }

  const handleCopyJSON = () => {
    const jsonStr = JSON.stringify(results, null, 2)
    navigator.clipboard.writeText(jsonStr)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-6">
      {/* Classification Top 1 Highlight Banner if model is classification */}
      {model.type === 'classification' && results.topClasses && results.topClasses.length > 0 && (
        <div className="p-4 rounded-xl border border-primary/40 bg-primary/10 flex items-center justify-between animate-fadeInUp">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center font-bold text-lg">
              🏆
            </div>
            <div>
              <p className="text-xs text-muted-foreground font-medium">Kết quả phân loại chính xác nhất (Top 1 Prediction):</p>
              <h3 className="text-lg font-bold text-foreground capitalize">
                {results.topClasses[0].label}
              </h3>
            </div>
          </div>
          <div className="text-right">
            <span className="text-2xl font-extrabold text-primary">
              {(results.topClasses[0].confidence * 100).toFixed(1)}%
            </span>
            <p className="text-[11px] text-muted-foreground font-medium">Độ tin cậy</p>
          </div>
        </div>
      )}

      {/* Metrics Banner */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="p-3 rounded-xl border border-border bg-card/60">
          <p className="text-xs text-muted-foreground mb-1">
            {model.type === 'classification' ? 'Lớp dự đoán hàng đầu' : 'Đối tượng phát hiện'}
          </p>
          <div className="flex items-baseline gap-1.5">
            {model.type === 'classification' ? (
              <span className="text-base font-bold text-foreground truncate max-w-[130px]">
                {results.topClasses && results.topClasses.length > 0 ? results.topClasses[0].label : 'N/A'}
              </span>
            ) : (
              <>
                <span className="text-2xl font-bold text-foreground">{activeDetections.length}</span>
                <span className="text-xs text-muted-foreground">/ {results.detections.length}</span>
              </>
            )}
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card/60">
          <p className="text-xs text-muted-foreground mb-1">
            {model.type === 'classification' ? 'Độ tin cậy Top 1' : 'Độ tin cậy TB'}
          </p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-primary">
              {model.type === 'classification' && results.topClasses && results.topClasses.length > 0
                ? (results.topClasses[0].confidence * 100).toFixed(1)
                : activeDetections.length > 0
                ? ((activeDetections.reduce((acc, d) => acc + d.confidence, 0) / activeDetections.length) * 100).toFixed(0)
                : 0}%
            </span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card/60">
          <p className="text-xs text-muted-foreground mb-1">Thời gian suy luận</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-green-500">{results.latencyMs}</span>
            <span className="text-xs text-muted-foreground">ms</span>
          </div>
        </div>

        <div className="p-3 rounded-xl border border-border bg-card/60">
          <p className="text-xs text-muted-foreground mb-1">Tốc độ xử lý (FPS)</p>
          <div className="flex items-baseline gap-1.5">
            <span className="text-2xl font-bold text-amber-500">{results.fps}</span>
            <span className="text-xs text-muted-foreground">FPS ({results.device})</span>
          </div>
        </div>
      </div>

      {/* Visual Canvas Viewer */}
      <div className="rounded-xl border border-border bg-black/40 overflow-hidden relative group">
        {/* Top Control Bar inside Viewer */}
        <div className="p-3 border-b border-border/60 bg-background/80 backdrop-blur-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-foreground flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-primary" />
              Kết quả trực quan hóa:
            </span>
            <div className="inline-flex rounded-lg border border-border p-0.5 bg-muted/30 text-xs">
              <button
                type="button"
                onClick={() => setViewMode('detected')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === 'detected' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Mô hình suy luận
              </button>
              <button
                type="button"
                onClick={() => setViewMode('original')}
                className={`px-2.5 py-1 rounded font-medium transition-colors ${
                  viewMode === 'original' ? 'bg-primary text-primary-foreground' : 'text-muted-foreground hover:text-foreground'
                }`}
              >
                Ảnh gốc
              </button>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => onToggleBbox(!showBbox)}
              className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                showBbox ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              {showBbox ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
              Bounding Boxes
            </button>
            <button
              type="button"
              onClick={() => onToggleLabels(!showLabels)}
              className={`text-xs px-2.5 py-1 rounded-md border flex items-center gap-1 transition-colors ${
                showLabels ? 'border-primary/40 bg-primary/10 text-primary' : 'border-border text-muted-foreground'
              }`}
            >
              Nhãn & Điểm
            </button>
          </div>
        </div>

        {/* Canvas Area */}
        <div className="p-4 flex items-center justify-center bg-slate-950/80 min-h-[360px] max-h-[560px] overflow-auto">
          <canvas
            ref={canvasRef}
            className="max-h-[500px] w-auto max-w-full rounded-lg shadow-xl object-contain border border-slate-800"
          />
        </div>
      </div>

      {/* Threshold Slider + Controls */}
      <div className="p-4 rounded-xl border border-border bg-card/40 space-y-3">
        <div className="flex items-center justify-between text-xs">
          <div className="flex items-center gap-1.5 font-medium text-foreground">
            <Sliders className="w-4 h-4 text-primary" />
            <span>Ngưỡng tin cậy (Confidence Threshold):</span>
          </div>
          <span className="font-mono font-bold text-primary text-sm">
            {(confidenceThreshold * 100).toFixed(0)}%
          </span>
        </div>
        <input
          type="range"
          min="0.1"
          max="0.99"
          step="0.01"
          value={confidenceThreshold}
          onChange={(e) => onConfidenceChange(parseFloat(e.target.value))}
          className="w-full accent-primary h-2 rounded-lg cursor-pointer bg-muted"
        />
        <div className="flex justify-between text-[10px] text-muted-foreground font-mono">
          <span>10% (Nhiều phát hiện)</span>
          <span>50% (Tiêu chuẩn)</span>
          <span>99% (Độ chính xác cao nhất)</span>
        </div>
      </div>

      {/* Verified Model Classes Banner */}
      {availableClasses.length > 0 && (
        <div className="p-3.5 rounded-xl border border-primary/30 bg-primary/5 space-y-2.5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Tag className="w-4 h-4 text-primary" />
              <span className="text-xs font-semibold text-foreground">
                Tập nhãn gốc từ metadata file mô hình của bạn ({availableClasses.length} nhãn):
              </span>
            </div>
            <span className="text-[10px] text-green-600 dark:text-green-400 font-medium bg-green-500/10 px-2.5 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> 100% nhãn từ model thật
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-2 rounded-lg bg-background/60 border border-border/50">
            {availableClasses.map((cls, idx) => {
              const detectedCount = activeDetections.filter(
                (d) => d.label.toLowerCase() === cls.toLowerCase()
              ).length
              return (
                <span
                  key={idx}
                  className={`text-[11px] font-mono px-2 py-0.5 rounded-md border transition-all ${
                    detectedCount > 0
                      ? 'bg-primary text-primary-foreground font-bold border-primary shadow-xs'
                      : 'bg-card border-border/70 text-muted-foreground'
                  }`}
                  title={
                    detectedCount > 0
                      ? `Đã nhận diện ${detectedCount} đối tượng "${cls}"`
                      : `Không có đối tượng "${cls}" vượt ngưỡng tin cậy`
                  }
                >
                  #{idx} {cls} {detectedCount > 0 && `(${detectedCount})`}
                </span>
              )
            })}
          </div>

          <p className="text-[10px] text-muted-foreground">
            Các ô màu nổi bật ({activeDetections.length > 0 ? 'màu xanh/accent' : 'không có'}) là các nhãn trong mô hình của bạn đã được phát hiện trong bức ảnh này.
          </p>
        </div>
      )}

      {/* Detected Objects Table & Classification breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Detection List */}
        <div className="lg:col-span-2 rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/20 flex items-center justify-between">
            <h4 className="font-semibold text-xs text-foreground flex items-center gap-1.5">
              <BarChart2 className="w-4 h-4 text-primary" />
              Danh sách đối tượng nhận diện ({activeDetections.length})
            </h4>
            <span className="text-[10px] text-muted-foreground">Click để highlight</span>
          </div>

          <div className="max-h-64 overflow-y-auto divide-y divide-border/40">
            {activeDetections.length === 0 ? (
              <div className="p-6 text-center text-xs text-muted-foreground">
                Không có đối tượng nào vượt qua ngưỡng tin cậy {(confidenceThreshold * 100).toFixed(0)}%. Hãy hạ ngưỡng xuống để xem thêm.
              </div>
            ) : (
              activeDetections.map((det, index) => {
                const isSelected = selectedDetectionId === det.id
                return (
                  <div
                    key={det.id}
                    onClick={() => setSelectedDetectionId(isSelected ? null : det.id)}
                    className={`p-3 flex items-center justify-between text-xs cursor-pointer transition-colors ${
                      isSelected ? 'bg-primary/15' : 'hover:bg-muted/40'
                    }`}
                  >
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono text-muted-foreground text-[10px] w-4">
                        #{index + 1}
                      </span>
                      <span
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{ backgroundColor: det.color }}
                      />
                      <span className="font-semibold text-foreground capitalize">{det.label}</span>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="w-24 bg-muted rounded-full h-2 overflow-hidden hidden sm:block">
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${det.confidence * 100}%`,
                            backgroundColor: det.color,
                          }}
                        />
                      </div>
                      <span className="font-mono font-bold text-foreground w-12 text-right">
                        {(det.confidence * 100).toFixed(1)}%
                      </span>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </div>

        {/* Top Classification Scores */}
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="p-3 border-b border-border bg-muted/20">
            <h4 className="font-semibold text-xs text-foreground">Top Phân loại (Classification)</h4>
          </div>
          <div className="p-3 space-y-3">
            {results.topClasses && results.topClasses.length > 0 ? (
              results.topClasses.map((item, i) => (
                <div key={i} className="space-y-1">
                  <div className="flex justify-between text-xs">
                    <span className="font-medium text-foreground truncate max-w-[150px]">{item.label}</span>
                    <span className="font-mono text-primary font-bold">{(item.confidence * 100).toFixed(1)}%</span>
                  </div>
                  <div className="h-1.5 w-full bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary rounded-full transition-all"
                      style={{ width: `${item.confidence * 100}%` }}
                    />
                  </div>
                </div>
              ))
            ) : (
              <p className="text-xs text-muted-foreground py-4 text-center">
                Mô hình phát hiện vật thể (Object Detection)
              </p>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex flex-col sm:flex-row gap-3 pt-2">
        <Button onClick={handleDownload} variant="outline" className="flex-1 text-xs h-10">
          <Download className="w-4 h-4 mr-2" />
          Tải ảnh kết quả đã nhận diện
        </Button>
        <Button onClick={handleCopyJSON} variant="outline" className="flex-1 text-xs h-10">
          {copied ? (
            <>
              <Check className="w-4 h-4 mr-2 text-green-500" />
              Đã sao chép JSON!
            </>
          ) : (
            <>
              <Copy className="w-4 h-4 mr-2" />
              Sao chép kết quả JSON
            </>
          )}
        </Button>
      </div>
    </div>
  )
}
