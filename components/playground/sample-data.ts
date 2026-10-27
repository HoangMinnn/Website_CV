import { DetectionBox } from './types'

// High-quality SVG sample images for testing
export interface SampleImageItem {
  id: string
  name: string
  category: string
  previewUrl: string
  detections: DetectionBox[]
  topClasses: { label: string; confidence: number }[]
}

export const SAMPLE_IMAGES: SampleImageItem[] = [
  {
    id: 'sample-street',
    name: 'Giao thông đô thị',
    category: 'Giao thông',
    previewUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
      <defs>
        <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="%231e3a8a"/>
          <stop offset="60%" stop-color="%2360a5fa"/>
          <stop offset="100%" stop-color="%23fef08a"/>
        </linearGradient>
        <linearGradient id="road" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="%23334155"/>
          <stop offset="100%" stop-color="%231e293b"/>
        </linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(%23sky)"/>
      <rect y="300" width="800" height="200" fill="url(%23road)"/>
      <line x1="0" y1="400" x2="800" y2="400" stroke="%23f8fafc" stroke-width="4" stroke-dasharray="30 20"/>
      <!-- Buildings -->
      <rect x="40" y="140" width="90" height="160" fill="%23475569"/>
      <rect x="150" y="90" width="110" height="210" fill="%23334155"/>
      <rect x="280" y="120" width="80" height="180" fill="%2364748b"/>
      <rect x="620" y="80" width="130" height="220" fill="%231e293b"/>
      <!-- Blue Car -->
      <g id="car1">
        <rect x="420" y="340" width="190" height="65" rx="14" fill="%232563eb"/>
        <polygon points="450,340 480,305 560,305 590,340" fill="%2393c5fd" opacity="0.85"/>
        <circle cx="465" cy="405" r="22" fill="%230f172a"/>
        <circle cx="465" cy="405" r="10" fill="%2394a3b8"/>
        <circle cx="575" cy="405" r="22" fill="%230f172a"/>
        <circle cx="575" cy="405" r="10" fill="%2394a3b8"/>
        <rect x="590" y="360" width="16" height="10" rx="3" fill="%23facc15"/>
      </g>
      <!-- Red Car -->
      <g id="car2">
        <rect x="160" y="365" width="160" height="55" rx="12" fill="%23dc2626"/>
        <polygon points="185,365 210,335 280,335 305,365" fill="%23fca5a5" opacity="0.8"/>
        <circle cx="200" cy="420" r="18" fill="%230f172a"/>
        <circle cx="200" cy="420" r="8" fill="%23cbd5e1"/>
        <circle cx="290" cy="420" r="18" fill="%230f172a"/>
        <circle cx="290" cy="420" r="8" fill="%23cbd5e1"/>
      </g>
      <!-- Pedestrian -->
      <g id="pedestrian">
        <circle cx="105" cy="320" r="14" fill="%23f59e0b"/>
        <rect x="97" y="336" width="16" height="42" rx="6" fill="%2310b981"/>
        <line x1="100" y1="378" x2="94" y2="430" stroke="%231e293b" stroke-width="6" stroke-linecap="round"/>
        <line x1="110" y1="378" x2="116" y2="430" stroke="%231e293b" stroke-width="6" stroke-linecap="round"/>
      </g>
      <!-- Traffic Light -->
      <g id="traffic_light">
        <rect x="700" y="210" width="28" height="74" rx="6" fill="%230f172a"/>
        <circle cx="714" cy="225" r="8" fill="%23ef4444"/>
        <circle cx="714" cy="247" r="8" fill="%23713f12"/>
        <circle cx="714" cy="269" r="8" fill="%23064e3b"/>
        <rect x="712" y="284" width="4" height="100" fill="%23475569"/>
      </g>
    </svg>`,
    detections: [
      { id: 'd1', label: 'car', confidence: 0.94, color: '#3b82f6', x: 0.525, y: 0.61, width: 0.24, height: 0.22 },
      { id: 'd2', label: 'car', confidence: 0.88, color: '#3b82f6', x: 0.2, y: 0.67, width: 0.2, height: 0.18 },
      { id: 'd3', label: 'person', confidence: 0.92, color: '#10b981', x: 0.11, y: 0.61, width: 0.05, height: 0.26 },
      { id: 'd4', label: 'traffic light', confidence: 0.85, color: '#f59e0b', x: 0.87, y: 0.42, width: 0.045, height: 0.16 },
    ],
    topClasses: [
      { label: 'street scene / traffic', confidence: 0.95 },
      { label: 'passenger car', confidence: 0.89 },
      { label: 'urban road', confidence: 0.82 },
    ],
  },
  {
    id: 'sample-office',
    name: 'Văn phòng công nghệ',
    category: 'Văn phòng',
    previewUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
      <rect width="800" height="500" fill="%230f172a"/>
      <!-- Desk -->
      <rect x="80" y="320" width="640" height="15" fill="%23d97706" rx="4"/>
      <rect x="120" y="335" width="20" height="150" fill="%23475569"/>
      <rect x="660" y="335" width="20" height="150" fill="%23475569"/>
      <!-- Laptop -->
      <rect x="310" y="200" width="180" height="115" rx="8" fill="%23334155"/>
      <rect x="320" y="210" width="160" height="95" rx="4" fill="%230284c7"/>
      <polygon points="270,320 310,315 490,315 530,320" fill="%2364748b"/>
      <!-- Code editor inside screen -->
      <line x1="330" y1="225" x2="380" y2="225" stroke="%23f8fafc" stroke-width="4"/>
      <line x1="330" y1="237" x2="430" y2="237" stroke="%2338bdf8" stroke-width="3"/>
      <line x1="330" y1="247" x2="400" y2="247" stroke="%234ade80" stroke-width="3"/>
      <line x1="345" y1="257" x2="440" y2="257" stroke="%23fbbf24" stroke-width="3"/>
      <!-- Coffee Cup -->
      <rect x="560" y="275" width="36" height="45" rx="5" fill="%23f8fafc"/>
      <path d="M 596 285 C 612 285 612 305 596 305" stroke="%23f8fafc" stroke-width="4" fill="none"/>
      <!-- Potted Plant -->
      <rect x="160" y="260" width="45" height="60" rx="6" fill="%23ea580c"/>
      <circle cx="182" cy="245" r="28" fill="%2316a34a"/>
      <circle cx="165" cy="235" r="20" fill="%2322c55e"/>
      <circle cx="200" cy="235" r="20" fill="%2322c55e"/>
    </svg>`,
    detections: [
      { id: 'd10', label: 'laptop', confidence: 0.96, color: '#0284c7', x: 0.38, y: 0.4, width: 0.28, height: 0.25 },
      { id: 'd11', label: 'cup', confidence: 0.89, color: '#f59e0b', x: 0.69, y: 0.54, width: 0.08, height: 0.11 },
      { id: 'd12', label: 'potted plant', confidence: 0.91, color: '#10b981', x: 0.19, y: 0.42, width: 0.1, height: 0.23 },
      { id: 'd13', label: 'dining table / desk', confidence: 0.84, color: '#8b5cf6', x: 0.1, y: 0.63, width: 0.8, height: 0.32 },
    ],
    topClasses: [
      { label: 'laptop computer', confidence: 0.97 },
      { label: 'workplace / desk', confidence: 0.91 },
      { label: 'coffee cup', confidence: 0.86 },
    ],
  },
  {
    id: 'sample-pets',
    name: 'Thú cưng gia đình',
    category: 'Động vật',
    previewUrl: `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 500" width="800" height="500">
      <rect width="800" height="500" fill="%23f0fdf4"/>
      <!-- Meadow ground -->
      <rect y="320" width="800" height="180" fill="%2386efac"/>
      <!-- Golden Dog -->
      <g id="dog">
        <ellipse cx="320" cy="310" rx="90" ry="60" fill="%23d97706"/>
        <circle cx="210" cy="250" r="45" fill="%23d97706"/>
        <!-- Snout -->
        <ellipse cx="180" cy="265" rx="28" ry="18" fill="%23b45309"/>
        <circle cx="165" cy="260" r="8" fill="%230f172a"/>
        <!-- Ears -->
        <ellipse cx="235" cy="225" rx="14" ry="32" fill="%2392400e"/>
        <!-- Legs -->
        <rect x="250" y="340" width="18" height="65" rx="8" fill="%23b45309"/>
        <rect x="285" y="340" width="18" height="65" rx="8" fill="%23b45309"/>
        <rect x="360" y="340" width="18" height="65" rx="8" fill="%23b45309"/>
        <rect x="395" y="340" width="18" height="65" rx="8" fill="%23b45309"/>
        <!-- Tail -->
        <path d="M 405 290 Q 450 250 460 220" stroke="%23d97706" stroke-width="14" fill="none" stroke-linecap="round"/>
      </g>
      <!-- Small Cat -->
      <g id="cat">
        <ellipse cx="570" cy="340" rx="55" ry="40" fill="%2364748b"/>
        <circle cx="530" cy="300" r="30" fill="%2364748b"/>
        <!-- Cat ears -->
        <polygon points="510,285 520,250 535,280" fill="%23475569"/>
        <polygon points="535,280 550,250 560,285" fill="%23475569"/>
        <circle cx="518" cy="302" r="4" fill="%23facc15"/>
        <circle cx="538" cy="302" r="4" fill="%23facc15"/>
      </g>
      <!-- Tennis ball -->
      <circle cx="110" cy="400" r="22" fill="%2384cc16"/>
    </svg>`,
    detections: [
      { id: 'd20', label: 'dog', confidence: 0.97, color: '#f59e0b', x: 0.2, y: 0.4, width: 0.38, height: 0.44 },
      { id: 'd21', label: 'cat', confidence: 0.93, color: '#6366f1', x: 0.62, y: 0.52, width: 0.18, height: 0.28 },
      { id: 'd22', label: 'sports ball', confidence: 0.9, color: '#84cc16', x: 0.11, y: 0.76, width: 0.06, height: 0.09 },
    ],
    topClasses: [
      { label: 'golden retriever (dog)', confidence: 0.96 },
      { label: 'domestic cat', confidence: 0.92 },
      { label: 'tennis ball', confidence: 0.88 },
    ],
  },
]
