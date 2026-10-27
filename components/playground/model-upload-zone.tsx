'use client'

import { useState, useRef, useEffect } from 'react'
import {
  Upload, CheckCircle2, FileCode2, Layers, AlertCircle, RotateCcw,
  Search, Tag, Loader2, Info, SlidersHorizontal, FileText, ChevronDown, ChevronUp, X
} from 'lucide-react'
import { ModelInfo, NormKey } from './types'
import { Button } from '@/components/ui/button'

const SUPPORTED_EXTS = ['.onnx', '.pt', '.pth', '.tflite', '.h5', '.bin', '.pb', '.keras', '.ckpt', '.torchscript']
const MAX_SIZE_MB = 1000

interface ModelUploadZoneProps {
  currentModel: ModelInfo | null
  onModelSelect: (model: ModelInfo | null) => void
}

/**
 * Client-side parser for labels file (.txt, .yaml, .yml, .json)
 */
export async function parseLabelsFile(file: File): Promise<string[]> {
  try {
    const text = await file.text()
    const trimmed = text.trim()
    if (!trimmed) return []

    // 1. JSON
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) {
      try {
        const parsed = JSON.parse(trimmed)
        if (Array.isArray(parsed)) {
          return parsed.map((x) => String(x).trim()).filter(Boolean)
        }
        if (typeof parsed === 'object' && parsed !== null) {
          for (const k of ['names', 'classes', 'labels', 'class_names']) {
            if (Array.isArray(parsed[k])) {
              return parsed[k].map((x: any) => String(x).trim()).filter(Boolean)
            }
            if (typeof parsed[k] === 'object' && parsed[k] !== null) {
              return Object.values(parsed[k]).map((x: any) => String(x).trim()).filter(Boolean)
            }
          }
          const keys = Object.keys(parsed)
          if (keys.every((k) => !isNaN(Number(k)))) {
            return keys
              .sort((a, b) => Number(a) - Number(b))
              .map((k) => String(parsed[k]).trim())
              .filter(Boolean)
          }
          return Object.values(parsed).map((x) => String(x).trim()).filter(Boolean)
        }
      } catch {
        // Fallthrough to YAML/lines
      }
    }

    // 2. YAML inline: names: [a, b, c]
    const inlineMatch = trimmed.match(/names\s*:\s*\[([^\]]+)\]/i)
    if (inlineMatch && inlineMatch[1]) {
      const items = inlineMatch[1]
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
      if (items.length > 0) return items
    }

    // 3. Lines & YAML block
    const rawLines = trimmed.split(/\r?\n/).map((l) => l.trim()).filter((l) => l && !l.startsWith('#'))

    let inNames = false
    const hasNamesKey = rawLines.some((l) => /^names\s*:/i.test(l))
    let targetLines = rawLines
    if (hasNamesKey) {
      const filtered: string[] = []
      for (const l of rawLines) {
        if (/^names\s*:/i.test(l)) {
          inNames = true
          continue
        }
        if (inNames) {
          if (/^[a-zA-Z0-9_-]+\s*:/i.test(l) && !l.startsWith('-')) break
          filtered.push(l)
        }
      }
      if (filtered.length > 0) targetLines = filtered
    }

    const result: string[] = []
    const pat = /^(?:-\s*)?(?:\d+\s*[:,\t \-]\s*)?(.+)$/
    for (const line of targetLines) {
      if (/^nc\s*:\s*\d+/i.test(line)) continue
      if (/^(train|val|test|path)\s*:/i.test(line)) continue
      const m = line.match(pat)
      if (m && m[1]) {
        const val = m[1].trim().replace(/^['"]|['"]$/g, '')
        if (val && !val.endsWith(':')) result.push(val)
      } else {
        const val = line.trim().replace(/^['"]|['"]$/g, '')
        if (val && !val.endsWith(':')) result.push(val)
      }
    }
    return result.filter(Boolean)
  } catch (e) {
    console.warn('Lỗi khi đọc file nhãn:', e)
    return []
  }
}

export function ModelUploadZone({ currentModel, onModelSelect }: ModelUploadZoneProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [isAnalyzing, setIsAnalyzing] = useState(false)
  const [analysisError, setAnalysisError] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<'detection' | 'classification' | 'segmentation'>('detection')
  const [labelFilter, setLabelFilter] = useState('')
  const [showAdvanced, setShowAdvanced] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const labelsInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (currentModel) {
      setSelectedTask(currentModel.type)
    }
  }, [currentModel?.id])

  const inspectModelWithFiles = async (
    modelFile: File,
    labelsFile?: File | null,
    imgsz?: number,
    norm?: NormKey
  ) => {
    setIsAnalyzing(true)
    setAnalysisError(null)

    // Parse labels file on client side immediately if provided
    let clientParsedLabels: string[] = []
    if (labelsFile) {
      clientParsedLabels = await parseLabelsFile(labelsFile)
    }

    try {
      const formData = new FormData()
      formData.append('modelFile', modelFile)
      if (labelsFile) formData.append('labelsFile', labelsFile)
      if (imgsz && imgsz > 0) formData.append('imgsz', String(imgsz))
      if (norm && norm !== 'auto') formData.append('norm', norm)

      const res = await fetch('/api/model-info', {
        method: 'POST',
        body: formData,
      })

      const data = await res.json()

      const ext = '.' + modelFile.name.split('.').pop()?.toLowerCase()
      let finalTask: 'detection' | 'classification' | 'segmentation' = selectedTask
      let detectedClasses: string[] = []
      let detectedCount = 0
      let hasEmbedded = false
      let frameworkName = ext === '.pt' || ext === '.pth' ? 'PyTorch' : 'ONNX / Tensor'
      let archName = frameworkName
      let inputShape = 'Auto-detect'
      let notes: string[] = []

      let isFallback = false

      if (data && data.success) {
        if (data.task && ['detection', 'classification', 'segmentation'].includes(data.task)) {
          finalTask = data.task
        }
        const serverClasses = Array.isArray(data.classes) ? data.classes : []
        hasEmbedded = Boolean(data.hasEmbeddedLabels ?? (serverClasses.length > 0 && !labelsFile))
        detectedClasses = serverClasses.length > 0 ? serverClasses : clientParsedLabels
        detectedCount = data.classesCount || detectedClasses.length
        if (detectedClasses.length === 0 && detectedCount > 0) {
          detectedClasses = Array.from({ length: detectedCount }, (_, i) => `Lớp ${i}`)
        }
        frameworkName = data.framework || frameworkName
        archName = data.architecture || frameworkName
        inputShape = data.inputShape || inputShape
        notes = Array.isArray(data.notes) ? data.notes : []
        setAnalysisError(null)
      } else {
        // Smart client-side fallback if server lacks Python/Torch
        isFallback = true
        detectedClasses = clientParsedLabels
        detectedCount = detectedClasses.length
        hasEmbedded = false
        notes = [
          '⚡ Chế độ Client CV: Máy chủ chưa có thư viện Python đầy đủ.',
          'Mô hình sẽ chạy suy luận trực tiếp trên trình duyệt (WebGPU/Wasm).'
        ]
        if (detectedClasses.length === 0) {
          notes.push('⚠️ Chưa có file nhãn đi kèm. Bạn hãy tải file nhãn (.txt/.yaml/.json) để hiển thị đúng tên đối tượng.')
        }
        setAnalysisError(null)
      }

      setSelectedTask(finalTask)
      const finalLabelsFile = labelsFile !== undefined ? labelsFile : (currentModel?.labelsFile ?? null)

      onModelSelect({
        id: currentModel?.id || ('model-' + Date.now()),
        name: modelFile.name.replace(/\.[^/.]+$/, ''),
        fileName: modelFile.name,
        file: modelFile,
        labelsFile: finalLabelsFile,
        hasEmbeddedLabels: hasEmbedded,
        type: finalTask,
        sizeMB: +(modelFile.size / (1024 * 1024)).toFixed(2),
        inputShape,
        architecture: archName,
        classesCount: detectedCount,
        classes: detectedClasses,
        framework: isFallback ? `${frameworkName} (Client Mode)` : frameworkName,
        imgsz: imgsz ?? currentModel?.imgsz ?? 0,
        norm: norm ?? currentModel?.norm ?? 'auto',
        notes,
        isPretrained: false,
        description: `Mô hình: ${modelFile.name}`,
      })
    } catch (err: any) {
      console.warn('Backend model inspection failed, activating client fallback:', err)
      const ext = '.' + modelFile.name.split('.').pop()?.toLowerCase()
      const frameworkName = ext === '.pt' || ext === '.pth' ? 'PyTorch / YOLO' : ext === '.onnx' ? 'ONNX Runtime' : 'Deep Learning'
      const finalLabelsFile = labelsFile !== undefined ? labelsFile : (currentModel?.labelsFile ?? null)
      const detectedClasses = clientParsedLabels
      onModelSelect({
        id: currentModel?.id || ('model-' + Date.now()),
        name: modelFile.name.replace(/\.[^/.]+$/, ''),
        fileName: modelFile.name,
        file: modelFile,
        labelsFile: finalLabelsFile,
        hasEmbeddedLabels: false,
        type: selectedTask,
        sizeMB: +(modelFile.size / (1024 * 1024)).toFixed(2),
        inputShape: 'Auto (Client)',
        architecture: frameworkName,
        classesCount: detectedClasses.length,
        classes: detectedClasses,
        framework: `${frameworkName} (Client Mode)`,
        imgsz: imgsz ?? currentModel?.imgsz ?? 0,
        norm: norm ?? currentModel?.norm ?? 'auto',
        notes: [
          '⚡ Chế độ dự phòng: Chạy trực tiếp trên trình duyệt bằng Client CV Engine.',
          detectedClasses.length === 0
            ? '⚠️ Chưa có nhãn đi kèm. Hãy tải file nhãn (.txt/.yaml/.json) để hiển thị tên.'
            : `✓ Đã nạp ${detectedClasses.length} nhãn từ file nhãn.`
        ],
        isPretrained: false,
        description: `Mô hình: ${modelFile.name}`,
      })
      setAnalysisError(null)
    } finally {
      setIsAnalyzing(false)
    }
  }

  const handleProcessFile = (file: File) => {
    const sizeMB = +(file.size / (1024 * 1024)).toFixed(2)
    if (sizeMB > MAX_SIZE_MB) {
      alert(`File mô hình quá lớn (${sizeMB}MB). Giới hạn tối đa là ${MAX_SIZE_MB}MB`)
      return
    }
    const ext = '.' + file.name.split('.').pop()?.toLowerCase()
    if (!SUPPORTED_EXTS.includes(ext)) {
      alert(`Định dạng "${ext}" chưa được hỗ trợ. Vui lòng chọn file mô hình: ${SUPPORTED_EXTS.join(', ')}`)
      return
    }
    setLabelFilter('')
    inspectModelWithFiles(file, null)
  }

  const handleAttachLabels = async (file: File) => {
    if (!currentModel?.file) return
    const parsed = await parseLabelsFile(file)
    if (parsed.length > 0) {
      onModelSelect({
        ...currentModel,
        labelsFile: file,
        classes: parsed,
        classesCount: parsed.length,
        hasEmbeddedLabels: false,
      })
    }
    inspectModelWithFiles(currentModel.file, file, currentModel.imgsz, currentModel.norm)
  }

  const handleRemoveLabels = () => {
    if (labelsInputRef.current) {
      labelsInputRef.current.value = ''
    }
    if (!currentModel?.file) return
    inspectModelWithFiles(currentModel.file, null, currentModel.imgsz, currentModel.norm)
  }

  const handlePreprocessChange = (imgsz: number, norm: NormKey) => {
    if (!currentModel?.file) return
    inspectModelWithFiles(currentModel.file, currentModel.labelsFile, imgsz, norm)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleProcessFile(e.dataTransfer.files[0])
    }
  }

  const handleTaskChange = (newTask: 'detection' | 'classification' | 'segmentation') => {
    setSelectedTask(newTask)
    if (currentModel) {
      onModelSelect({ ...currentModel, type: newTask })
    }
  }

  const filteredClasses = (currentModel?.classes || []).filter((c) =>
    c.toLowerCase().includes(labelFilter.toLowerCase())
  )

  return (
    <div className="space-y-4">
      {/* Upload Zone for Custom Models */}
      {!currentModel && (
        <div
          onDragOver={(e) => {
            e.preventDefault()
            setIsDragging(true)
          }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-7 text-center cursor-pointer transition-all ${
            isDragging
              ? 'border-primary bg-primary/10 scale-[0.99]'
              : 'border-border/80 hover:border-primary/60 bg-muted/20 hover:bg-muted/30'
          }`}
        >
          <div className="w-12 h-12 rounded-xl bg-primary/15 text-primary flex items-center justify-center mx-auto mb-3 shadow-xs">
            <Upload className="w-6 h-6" />
          </div>
          <h4 className="font-semibold text-foreground text-sm mb-1">
            Kéo thả file mô hình AI hoặc click để chọn từ máy tính của bạn
          </h4>
          <p className="text-xs text-muted-foreground mb-3">
            Hỗ trợ tất cả định dạng: <span className="font-mono font-medium text-foreground">{SUPPORTED_EXTS.join(' ')}</span>
            <br />
            <span className="text-[11px]">Tối đa {MAX_SIZE_MB}MB · Ultralytics YOLO, PyTorch, TorchScript, torchvision, ONNX, TFLite, Keras</span>
          </p>
          <Button size="sm" variant="outline" className="pointer-events-none text-xs">
            <Upload className="w-3.5 h-3.5 mr-1.5" />
            Chọn file model từ máy tính (.pt, .onnx, .tflite, .h5...)
          </Button>
          <input
            ref={inputRef}
            id="model-upload-input"
            type="file"
            accept={SUPPORTED_EXTS.join(',')}
            onChange={(e) => {
              if (e.target.files && e.target.files.length > 0) {
                handleProcessFile(e.target.files[0])
                e.target.value = ''
              }
            }}
            className="hidden"
            aria-label="Upload model file"
          />
        </div>
      )}

      {/* Analyzing Indicator */}
      {isAnalyzing && (
        <div className="rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 animate-pulse">
          <Loader2 className="w-5 h-5 text-primary animate-spin flex-shrink-0" />
          <div className="text-xs">
            <p className="font-semibold text-foreground">Đang đọc cấu trúc mô hình...</p>
            <p className="text-muted-foreground">
              Tự động phân tích metadata, danh sách nhãn, kiến trúc mạng và chuẩn hóa tensor đầu vào.
            </p>
          </div>
        </div>
      )}

      {/* Analysis Error / Warning */}
      {analysisError && !isAnalyzing && (
        <div className="flex items-start gap-2.5 text-xs bg-destructive/10 border border-destructive/25 rounded-xl p-3.5 text-destructive dark:text-red-400 animate-fadeInUp">
          <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
          <div className="space-y-1">
            <p className="font-semibold">Lưu ý về file mô hình vừa tải lên:</p>
            <p className="leading-relaxed whitespace-pre-line text-[11px]">{analysisError}</p>
          </div>
        </div>
      )}

      {/* No model yet */}
      {!currentModel && !isAnalyzing && (
        <div className="flex items-start gap-2 text-xs text-muted-foreground bg-muted/30 border border-border/60 rounded-lg p-3">
          <Info className="w-4 h-4 mt-0.5 flex-shrink-0 text-primary" />
          <div>
            <p className="font-medium text-foreground mb-0.5">Ứng dụng kiểm thử mô hình thực tế</p>
            <p className="leading-relaxed text-[11px]">
              Bạn có thể tải lên bất kỳ mô hình nào lưu ở bất kỳ thư mục nào trên máy (Desktop, Downloads, D:\...). Hệ thống tự nạp và suy luận 100% bằng trọng số thật, đọc đúng nhãn của mô hình đó.
            </p>
          </div>
        </div>
      )}

      {/* Model loaded and verified */}
      {currentModel && !isAnalyzing && (
        <div className="rounded-xl border border-primary/30 bg-card p-4 space-y-4 animate-fadeInUp">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-lg bg-primary/20 text-primary flex items-center justify-center flex-shrink-0">
                <FileCode2 className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h4 className="font-bold text-foreground text-sm">{currentModel.name}</h4>
                  <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-green-500/20 text-green-600 dark:text-green-400 flex items-center gap-1">
                    <CheckCircle2 className="w-3 h-3" /> Sẵn sàng suy luận
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-mono mt-0.5">
                  {currentModel.fileName} · {currentModel.sizeMB} MB · {currentModel.architecture || currentModel.framework}
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => onModelSelect(null)}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors px-2 py-1 rounded hover:bg-destructive/10 flex items-center gap-1"
            >
              <RotateCcw className="w-3 h-3" /> Đổi model khác
            </button>
          </div>

          {/* Notes from inspect */}
          {currentModel.notes && currentModel.notes.length > 0 && (
            <div className="p-2.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-xs text-blue-700 dark:text-blue-300 space-y-1">
              {currentModel.notes.map((note, i) => (
                <p key={i} className="text-[11px] leading-relaxed flex items-start gap-1.5">
                  <Info className="w-3.5 h-3.5 mt-0.5 flex-shrink-0" />
                  <span>{note}</span>
                </p>
              ))}
            </div>
          )}

          {/* Task Type */}
          <div className="space-y-1.5 pt-2 border-t border-border/60">
            <label className="text-xs font-semibold text-foreground flex items-center justify-between">
              <span>Loại bài toán (Task Type):</span>
              <span className="text-[10px] text-muted-foreground font-normal">Tự động nhận diện từ cấu trúc mô hình</span>
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { id: 'detection', label: '🎯 Phát hiện vật thể' },
                { id: 'classification', label: '🏷️ Phân loại ảnh' },
                { id: 'segmentation', label: '🎨 Phân đoạn ảnh' },
              ].map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => handleTaskChange(t.id as any)}
                  className={`py-2 px-2 rounded-lg border text-xs font-medium transition-all ${
                    selectedTask === t.id
                      ? 'border-primary bg-primary/10 text-primary font-bold shadow-xs'
                      : 'border-border bg-card/60 text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Real Classes Extracted From Model */}
          <div className="pt-2 border-t border-border/60 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-foreground flex items-center gap-1.5">
                <Tag className="w-3.5 h-3.5 text-primary" />
                <span>
                  Danh sách nhãn của mô hình này ({currentModel.classesCount || currentModel.classes?.length || 0} nhãn):
                </span>
              </label>
              {currentModel.labelsFile ? (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-medium bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20 flex items-center gap-1">
                  ✓ File nhãn tải kèm: {currentModel.labelsFile.name}
                </span>
              ) : currentModel.hasEmbeddedLabels ? (
                <span className="text-[10px] text-green-600 dark:text-green-400 font-medium bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20 flex items-center gap-1">
                  ✓ Đọc trực tiếp từ mô hình
                </span>
              ) : (
                <span className="text-[10px] text-amber-600 dark:text-amber-400 font-medium bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20 flex items-center gap-1">
                  ⚠️ Chưa có tên nhãn
                </span>
              )}
            </div>

            {/* If model has class names (either embedded or from uploaded labels file) */}
            {currentModel.classes && currentModel.classes.length > 0 && (currentModel.hasEmbeddedLabels || currentModel.labelsFile) ? (
              <div className="space-y-2">
                {currentModel.classes.length > 10 && (
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground" />
                    <input
                      type="text"
                      placeholder={`Tìm kiếm trong ${currentModel.classes.length} nhãn...`}
                      value={labelFilter}
                      onChange={(e) => setLabelFilter(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-xs bg-muted/40 border border-border rounded-md text-foreground placeholder:text-muted-foreground/70"
                    />
                  </div>
                )}

                <div className="max-h-36 overflow-y-auto p-2 rounded-lg bg-muted/30 border border-border/60 flex flex-wrap gap-1.5">
                  {filteredClasses.length > 0 ? (
                    filteredClasses.map((label, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1 text-[11px] font-mono px-2 py-0.5 rounded-md bg-card border border-border/80 text-foreground"
                      >
                        <span className="text-[9px] text-muted-foreground">#{currentModel.classes?.indexOf(label)}</span>
                        <span>{label}</span>
                      </span>
                    ))
                  ) : (
                    <p className="text-[11px] text-muted-foreground py-2 text-center w-full">
                      Không tìm thấy nhãn phù hợp với từ khóa tìm kiếm.
                    </p>
                  )}
                </div>

                <p className="text-[10px] text-muted-foreground leading-relaxed flex items-start gap-1">
                  <CheckCircle2 className="w-3 h-3 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>
                    Chỉ đúng {currentModel.classes.length} nhãn của mô hình này mới có thể xuất hiện khi chạy dự đoán. Tuyệt đối không xuất hiện bất kỳ nhãn đề xuất nào ngoài mô hình.
                  </span>
                </p>
              </div>
            ) : (
              /* If model does NOT have labels stored in file and user hasn't uploaded a labels file */
              <div className="p-3.5 rounded-xl border border-amber-500/30 bg-amber-500/10 text-xs space-y-3">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 text-amber-600 dark:text-amber-400 mt-0.5 flex-shrink-0" />
                  <div className="space-y-1">
                    <p className="font-semibold text-foreground">
                      Mô hình không lưu kèm tên nhãn trong file
                    </p>
                    <p className="text-[11px] text-muted-foreground leading-relaxed">
                      Mô hình có {currentModel.classesCount > 0 ? `${currentModel.classesCount} lớp đầu ra` : 'đầu ra chưa có nhãn chữ'} (kết quả đang hiển thị tạm dạng Lớp 0, Lớp 1...). Bạn hãy tải lên file nhãn để trang web hiển thị đúng tên đối tượng thực tế của mô hình:
                    </p>
                  </div>
                </div>

                <Button
                  type="button"
                  size="sm"
                  onClick={() => labelsInputRef.current?.click()}
                  className="w-full text-xs h-9 bg-amber-600 hover:bg-amber-700 text-white font-medium flex items-center justify-center gap-2 shadow-xs"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Tải file nhãn lên (.txt, .yaml, .json, classes.txt, data.yaml)
                </Button>
              </div>
            )}

            {/* Optional Labels File Attachment / Management Bar */}
            <div className="pt-1 flex items-center justify-between text-xs">
              <span className="text-[11px] text-muted-foreground">File nhãn tùy chỉnh (.txt / .yaml / .json):</span>
              {currentModel.labelsFile ? (
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[11px] text-foreground flex items-center gap-1 bg-muted/60 px-2 py-0.5 rounded">
                    <FileText className="w-3 h-3 text-primary" />
                    {currentModel.labelsFile.name}
                  </span>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation()
                      handleRemoveLabels()
                    }}
                    className="p-1 rounded-md text-muted-foreground hover:text-destructive hover:bg-destructive/10 transition-colors"
                    title="Gỡ bỏ file nhãn này"
                    aria-label="Xoá file nhãn"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => labelsInputRef.current?.click()}
                  className="text-xs h-7 text-primary hover:text-primary"
                >
                  <FileText className="w-3 h-3 mr-1" />
                  {currentModel.hasEmbeddedLabels ? 'Đính kèm file nhãn thay thế' : 'Tải file nhãn'}
                </Button>
              )}
              <input
                ref={labelsInputRef}
                id="labels-upload-input"
                type="file"
                accept=".txt,.json,.yaml,.yml"
                onChange={(e) => {
                  if (e.target.files && e.target.files.length > 0) {
                    handleAttachLabels(e.target.files[0])
                    e.target.value = ''
                  }
                }}
                className="hidden"
                aria-label="Upload custom labels file"
              />
            </div>
          </div>

          {/* Advanced Preprocessing Controls Toggle */}
          <div className="pt-2 border-t border-border/60">
            <button
              type="button"
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="text-xs text-muted-foreground hover:text-foreground flex items-center justify-between w-full font-medium"
            >
              <span className="flex items-center gap-1.5">
                <SlidersHorizontal className="w-3.5 h-3.5 text-primary" />
                Cấu hình tiền xử lý Tensor (Kích thước & Chuẩn hoá)
              </span>
              {showAdvanced ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
            </button>

            {showAdvanced && (
              <div className="mt-3 p-3 rounded-lg bg-muted/20 border border-border/60 space-y-3 text-xs">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-[11px] font-medium text-foreground block mb-1">
                      Kích thước ảnh vào (imgsz):
                    </label>
                    <select
                      value={currentModel.imgsz || 0}
                      onChange={(e) =>
                        handlePreprocessChange(Number(e.target.value), currentModel.norm || 'auto')
                      }
                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
                    >
                      <option value="0">Tự động nhận diện</option>
                      <option value="224">224 x 224 (ResNet / MobileNet)</option>
                      <option value="256">256 x 256</option>
                      <option value="384">384 x 384 (Vision Transformer)</option>
                      <option value="416">416 x 416 (YOLOv3 / v4)</option>
                      <option value="512">512 x 512 (Segmentation)</option>
                      <option value="640">640 x 640 (YOLOv5 / v8 / v11)</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[11px] font-medium text-foreground block mb-1">
                      Chuẩn hoá pixel (Normalization):
                    </label>
                    <select
                      value={currentModel.norm || 'auto'}
                      onChange={(e) =>
                        handlePreprocessChange(currentModel.imgsz || 0, e.target.value as NormKey)
                      }
                      className="w-full px-2 py-1 bg-background border border-border rounded text-xs"
                    >
                      <option value="auto">Tự động theo loại model</option>
                      <option value="imagenet">ImageNet (mean/std)</option>
                      <option value="zero_one">Chia 255 về [0, 1]</option>
                      <option value="minus_one_one">Khoảng [-1, 1]</option>
                      <option value="mnist">MNIST (0.1307, 0.3081)</option>
                      <option value="raw255">Gốc 0 - 255 (không chia)</option>
                    </select>
                  </div>
                </div>
                <p className="text-[10px] text-muted-foreground">
                  * Với các mô hình Ultralytics YOLO, tiền xử lý chuẩn letterbox [0, 1] được áp dụng tự động mà không cần can thiệp.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
