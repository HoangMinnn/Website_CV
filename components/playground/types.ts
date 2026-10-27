export type TaskType = 'detection' | 'classification' | 'segmentation'

export type NormKey = 'auto' | 'imagenet' | 'zero_one' | 'minus_one_one' | 'mnist' | 'raw255'

export interface ModelInfo {
  id: string
  name: string
  fileName: string
  file?: File | null
  type: TaskType
  sizeMB: number
  inputShape: string
  architecture: string
  classesCount: number
  isPretrained?: boolean
  description?: string
  classes?: string[]
  datasetPreset?: string
  customLabels?: string
  framework?: string
  /** Optional labels file (.txt/.json) used when the model has no class names stored */
  labelsFile?: File | null
  /** Preprocessing overrides for non-Ultralytics models (0 / 'auto' = detect automatically) */
  imgsz?: number
  norm?: NormKey
  notes?: string[]
  /** Preprocessing actually used by the backend probe */
  preprocess?: PreprocessInfo
}

export interface PreprocessInfo {
  imgsz?: number[] | null
  norm?: string
  normKey?: string
  channels?: number
  layout?: string
  note?: string
}

export interface InputImageMedia {
  file: File | null
  fileName: string
  previewUrl: string
  originalUrl?: string
  width?: number
  height?: number
  sizeMB?: number
  isSample?: boolean
  mediaType?: 'image' | 'video'
  appliedFilters?: string[]
}

export interface DetectionBox {
  id: string
  label: string
  classId?: number
  confidence: number
  color: string
  // Normalized coordinates (0 to 1)
  x: number
  y: number
  width: number
  height: number
  /** Optional normalized polygon (instance segmentation / OBB) */
  polygon?: number[][]
}

export interface SegStat {
  label: string
  index: number
  ratio: number
  color: string
}

export interface InferenceResult {
  modelName: string
  modelType: TaskType
  detections: DetectionBox[]
  topClasses?: { label: string; confidence: number; index?: number }[]
  modelClasses?: string[]
  totalModelClasses?: number
  latencyMs: number
  fps: number
  device: string
  timestamp: string
  framework?: string
  architecture?: string
  segMask?: string | null
  segStats?: SegStat[]
  preprocess?: PreprocessInfo
  notes?: string[]
  rawOutputShape?: number[]
}
