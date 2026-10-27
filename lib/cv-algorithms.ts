/**
 * Computer Vision & Digital Image Processing Algorithms
 * Thư viện các thuật toán Xử lý ảnh số & Tiền xử lý cho Thị giác máy tính
 */

export interface CVProcessParams {
  brightness: number // -100 to 100
  contrast: number // -100 to 100
  noiseType: 'none' | 'salt-and-pepper' | 'gaussian' | 'speckle'
  noiseAmount: number // 0 to 100
  blurType: 'none' | 'box' | 'gaussian' | 'median'
  blurRadius: number // 1 to 5
  sharpen: boolean
  edgeDetect: 'none' | 'sobel' | 'laplacian'
  colorFilter: 'none' | 'grayscale' | 'binary' | 'invert' | 'sepia'
  thresholdValue: number // 0 to 255 (for binary thresholding)
  flipH: boolean
  flipV: boolean
}

export const DEFAULT_CV_PARAMS: CVProcessParams = {
  brightness: 0,
  contrast: 0,
  noiseType: 'none',
  noiseAmount: 0,
  blurType: 'none',
  blurRadius: 1,
  sharpen: false,
  edgeDetect: 'none',
  colorFilter: 'none',
  thresholdValue: 128,
  flipH: false,
  flipV: false,
}

export interface CVTheoryInfo {
  id: string
  title: string
  category: 'brightness' | 'noise' | 'filter' | 'edge' | 'color'
  formula: string
  description: string
  applications: string
  robustnessNote: string
}

export const CV_THEORY_DATABASE: Record<string, CVTheoryInfo> = {
  brightness_up: {
    id: 'brightness_up',
    title: 'Tăng sáng (Brighten / Point Operation)',
    category: 'brightness',
    formula: 'I_{out}(x, y) = \\min(255, I_{in}(x, y) + \\beta)',
    description: 'Cộng một hằng số dương β vào từng kênh màu R, G, B của mọi điểm ảnh nhằm tăng cường độ sáng đồng nhất.',
    applications: 'Khôi phục ảnh chụp thiếu sáng, cảnh quan đêm hoặc camera giám sát ánh sáng yếu.',
    robustnessNote: 'Mô hình AI dễ bị bão hòa (saturation) hoặc mất biên độ tương phản nếu tăng sáng quá mức (cháy sáng).',
  },
  brightness_down: {
    id: 'brightness_down',
    title: 'Tăng tối (Darken / Point Operation)',
    category: 'brightness',
    formula: 'I_{out}(x, y) = \\max(0, I_{in}(x, y) - \\beta)',
    description: 'Trừ một giá trị β vào cường độ pixel để hạ sáng, đưa các điểm ảnh về vùng mức xám thấp hơn.',
    applications: 'Mô phỏng điều kiện ngược sáng hoặc cảnh quan đêm, kiểm thử khả năng nhận dạng trong bóng râm.',
    robustnessNote: 'Các mạng CNN phát hiện vật thể dễ bỏ sót vùng biên (feature maps suy giảm) khi ảnh quá tối.',
  },
  contrast: {
    id: 'contrast',
    title: 'Biến đổi tương phản (Linear Contrast Stretching)',
    category: 'brightness',
    formula: 'I_{out} = \\alpha \\cdot (I_{in} - 128) + 128, \\quad \\alpha = \\frac{259(\\text{contrast} + 255)}{255(259 - \\text{contrast})}',
    description: 'Kéo giãn hoặc co hẹp khoảng giá trị mức xám xoay quanh giá trị trung bình 128 nhằm tăng độ tách bạch chi tiết.',
    applications: 'Cải thiện thị giác y tế (ảnh X-quang, MRI), ảnh vệ tinh viễn thám bị mù sương.',
    robustnessNote: 'Tương phản cao giúp các lớp Convolution trích xuất gradient cạnh biên rõ nét hơn.',
  },
  noise_salt_pepper: {
    id: 'noise_salt_pepper',
    title: 'Nhiễu muối tiêu (Salt & Pepper / Impulse Noise)',
    category: 'noise',
    formula: 'P(I = 0) = \\frac{p}{2} \\text{ (tiêu)}, \\quad P(I = 255) = \\frac{p}{2} \\text{ (muối)}, \\quad P(I = I_{in}) = 1 - p',
    description: 'Nhiễu xung đột ngột biến ngẫu nhiên một tỷ lệ p pixel thành trắng tinh (255) hoặc đen kịt (0).',
    applications: 'Mô phỏng lỗi truyền tín hiệu số qua mạng vô tuyến, cảm biến quang học bị kẹt transistor.',
    robustnessNote: 'Cực kỳ nguy hiểm với mô hình AI vì các đốm cực đại phá hủy thông tin cục bộ. Lọc Median là giải pháp vàng.',
  },
  noise_gaussian: {
    id: 'noise_gaussian',
    title: 'Nhiễu Gauss (Gaussian / Normal Distributed Noise)',
    category: 'noise',
    formula: 'I_{out} = \\text{clamp}\\left(I_{in} + \\mathcal{N}(0, \\sigma^2)\\right), \\quad Z = \\sqrt{-2\\ln U_1}\\cos(2\\pi U_2)',
    description: 'Thêm nhiễu ngẫu nhiên tuân theo phân phối chuẩn Gauss vào từng pixel, sinh qua thuật toán Box-Muller.',
    applications: 'Mô phỏng dao động nhiệt điện tử trong cảm biến CMOS/CCD khi tăng độ nhạy sáng ISO cao.',
    robustnessNote: 'Kiểm tra tính bền vững (adversarial robustness) và khả năng khái quát hóa của bộ trích xuất đặc trưng.',
  },
  filter_median: {
    id: 'filter_median',
    title: 'Lọc trung vị (Median Filter / Nonlinear)',
    category: 'filter',
    formula: 'I_{out}(x, y) = \\text{median}\\left\\{ I(x+i, y+j) \\mid (i, j) \\in W \\right\\}',
    description: 'Thuật toán phi tuyến sắp xếp các giá trị pixel trong cửa sổ lân cận và lấy giá trị nằm ở chính giữa.',
    applications: 'Khử triệt để nhiễu muối tiêu (Salt & Pepper) mà bảo toàn tuyệt đối cạnh biên không bị nhòe.',
    robustnessNote: 'Bước tiền xử lý (pre-processing) bắt buộc trong pipeline Computer Vision công nghiệp.',
  },
  filter_gaussian_blur: {
    id: 'filter_gaussian_blur',
    title: 'Làm mờ Gauss (Gaussian Smoothing / Low-pass)',
    category: 'filter',
    formula: 'G(x, y) = \\frac{1}{2\\pi\\sigma^2} e^{-\\frac{x^2+y^2}{2\\sigma^2}} * I',
    description: 'Tích chập ảnh với ma trận nhân Gauss làm giảm các thành phần tần số cao (nhiễu và chi tiết hạt).',
    applications: 'Giảm nhiễu trước khi tính đạo hàm cạnh, mô phỏng camera bị lệch tiêu cự (defocus blur).',
    robustnessNote: 'Làm mờ quá mức khiến mô hình AI không thể trích xuất được keypoint và texture.',
  },
  edge_sobel: {
    id: 'edge_sobel',
    title: 'Toán tử tách cạnh Sobel (Sobel Gradient Operator)',
    category: 'edge',
    formula: 'G = \\sqrt{G_x^2 + G_y^2}, \\quad G_x = \\begin{bmatrix}-1&0&1\\\\-2&0&2\\\\-1&0&1\\end{bmatrix} * I, \\quad G_y = \\begin{bmatrix}-1&-2&-1\\\\0&0&0\\\\1&2&1\\end{bmatrix} * I',
    description: 'Tính gradient không gian bậc nhất theo hai hướng ngang và dọc nhằm làm nổi bật đường bao viền vật thể.',
    applications: 'Phát hiện làn đường tự hành, phân đoạn vật thể, kiểm tra lỗi sản phẩm trong nhà máy.',
    robustnessNote: 'Tương đương với các kernel ban đầu trong tầng Conv1 của mạng nơ-ron tích chập (CNN).',
  },
  sharpen_laplacian: {
    id: 'sharpen_laplacian',
    title: 'Làm nét ảnh (Sharpening / High-pass Kernel)',
    category: 'edge',
    formula: 'K = \\begin{bmatrix} 0 & -1 & 0 \\\\ -1 & 5 & -1 \\\\ 0 & -1 & 0 \\end{bmatrix} * I',
    description: 'Tăng cường đạo hàm bậc hai để nâng cao tương phản tại các điểm chuyển tiếp cạnh viền.',
    applications: 'Làm rõ văn bản OCR, nhận diện biển số xe từ camera khoảng cách xa.',
    robustnessNote: 'Tăng chi tiết viền giúp mô hình nhận diện chính xác hình dáng vật thể ở tỷ lệ nhỏ.',
  },
  color_grayscale: {
    id: 'color_grayscale',
    title: 'Chuyển ảnh mức xám (ITU-R BT.601 Grayscale)',
    category: 'color',
    formula: 'Y = 0.2989 \\times R + 0.5870 \\times G + 0.1140 \\times B',
    description: 'Tính độ chói (luminance) phản ánh độ nhạy cảm thị giác mắt người đối với 3 màu cơ bản.',
    applications: 'Giảm 3 kênh màu RGB xuống 1 kênh xám, tiết kiệm 66% tài nguyên tính toán và bộ nhớ RAM.',
    robustnessNote: 'Hầu hết các bài toán phát hiện cạnh, nhận diện khuôn mặt cổ điển đều chạy trên ảnh xám.',
  },
  color_binary: {
    id: 'color_binary',
    title: 'Phân ngưỡng nhị phân (Binary Thresholding)',
    category: 'color',
    formula: 'I_{out}(x, y) = \\begin{cases} 255 & \\text{nếu } Y(x, y) \\ge T \\\\ 0 & \\text{nếu } Y(x, y) < T \\end{cases}',
    description: 'Chuyển toàn bộ ảnh về chỉ có 2 giá trị: 0 (đen) và 255 (trắng) dựa trên ngưỡng phân tách T.',
    applications: 'Tách chữ viết OCR, phát hiện mã vạch / QR code, đếm tế bào trong ảnh vi sinh.',
    robustnessNote: 'Đơn giản hóa không gian dữ liệu cực đoan, loại bỏ triệt để màu sắc và vân bề mặt.',
  },
  color_invert: {
    id: 'color_invert',
    title: 'Âm bản (Color Invert / Negative Transformation)',
    category: 'color',
    formula: 'I_{out}(x, y) = 255 - I_{in}(x, y)',
    description: 'Đảo ngược giá trị điểm ảnh: điểm sáng thành điểm tối và ngược lại.',
    applications: 'Quan sát phim X-quang y tế, nhận diện tài liệu scan nền đen chữ trắng.',
    robustnessNote: 'Thử nghiệm khả năng nhận diện hình dáng độc lập với sự đảo chiều cường độ sáng.',
  },
}

/**
 * Biến đổi pixel bằng các thuật toán CV
 */
export function applyCVProcessing(
  sourceCtx: CanvasRenderingContext2D,
  width: number,
  height: number,
  params: CVProcessParams
): { imageData: ImageData; histogram: { r: number[]; g: number[]; b: number[]; lum: number[] } } {
  // Lấy dữ liệu pixel gốc
  const srcImageData = sourceCtx.getImageData(0, 0, width, height)
  const data = new Uint8ClampedArray(srcImageData.data)
  const len = data.length

  // 1. Brightness Adjustment
  if (params.brightness !== 0) {
    const b = (params.brightness / 100) * 128
    for (let i = 0; i < len; i += 4) {
      data[i] = Math.min(255, Math.max(0, data[i] + b))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + b))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + b))
    }
  }

  // 2. Contrast Adjustment
  if (params.contrast !== 0) {
    const c = params.contrast
    const factor = (259 * (c + 255)) / (255 * (259 - c))
    for (let i = 0; i < len; i += 4) {
      data[i] = Math.min(255, Math.max(0, factor * (data[i] - 128) + 128))
      data[i + 1] = Math.min(255, Math.max(0, factor * (data[i + 1] - 128) + 128))
      data[i + 2] = Math.min(255, Math.max(0, factor * (data[i + 2] - 128) + 128))
    }
  }

  // 3. Color Filters (Grayscale, Binary, Invert, Sepia)
  if (params.colorFilter === 'grayscale') {
    for (let i = 0; i < len; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      data[i] = lum
      data[i + 1] = lum
      data[i + 2] = lum
    }
  } else if (params.colorFilter === 'binary') {
    const T = params.thresholdValue
    for (let i = 0; i < len; i += 4) {
      const lum = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2]
      const val = lum >= T ? 255 : 0
      data[i] = val
      data[i + 1] = val
      data[i + 2] = val
    }
  } else if (params.colorFilter === 'invert') {
    for (let i = 0; i < len; i += 4) {
      data[i] = 255 - data[i]
      data[i + 1] = 255 - data[i + 1]
      data[i + 2] = 255 - data[i + 2]
    }
  } else if (params.colorFilter === 'sepia') {
    for (let i = 0; i < len; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
      data[i] = Math.min(255, r * 0.393 + g * 0.769 + b * 0.189)
      data[i + 1] = Math.min(255, r * 0.349 + g * 0.686 + b * 0.168)
      data[i + 2] = Math.min(255, r * 0.272 + g * 0.534 + b * 0.131)
    }
  }

  // 4. Add Noise (Nhiễu muối tiêu hoặc nhiễu Gauss)
  if (params.noiseType === 'salt-and-pepper' && params.noiseAmount > 0) {
    const p = (params.noiseAmount / 100) * 0.35 // tối đa 35% pixel bị nhiễu
    for (let i = 0; i < len; i += 4) {
      const rand = Math.random()
      if (rand < p * 0.5) {
        // Pepper (đen)
        data[i] = 0
        data[i + 1] = 0
        data[i + 2] = 0
      } else if (rand < p) {
        // Salt (trắng)
        data[i] = 255
        data[i + 1] = 255
        data[i + 2] = 255
      }
    }
  } else if (params.noiseType === 'gaussian' && params.noiseAmount > 0) {
    const sigma = (params.noiseAmount / 100) * 60
    for (let i = 0; i < len; i += 4) {
      // Box-Muller transform
      const u1 = Math.random() || 0.0001
      const u2 = Math.random()
      const z = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2)
      const noise = z * sigma

      data[i] = Math.min(255, Math.max(0, data[i] + noise))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] + noise))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] + noise))
    }
  } else if (params.noiseType === 'speckle' && params.noiseAmount > 0) {
    const intensity = (params.noiseAmount / 100) * 0.8
    for (let i = 0; i < len; i += 4) {
      const factor = 1 + (Math.random() - 0.5) * intensity
      data[i] = Math.min(255, Math.max(0, data[i] * factor))
      data[i + 1] = Math.min(255, Math.max(0, data[i + 1] * factor))
      data[i + 2] = Math.min(255, Math.max(0, data[i + 2] * factor))
    }
  }

  // 5. Blur Filters
  if (params.blurType === 'median') {
    // Lọc trung vị 3x3 khử nhiễu muối tiêu
    const copy = new Uint8ClampedArray(data)
    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        const rVals: number[] = []
        const gVals: number[] = []
        const bVals: number[] = []

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4
            rVals.push(copy[idx])
            gVals.push(copy[idx + 1])
            bVals.push(copy[idx + 2])
          }
        }

        rVals.sort((a, b) => a - b)
        gVals.sort((a, b) => a - b)
        bVals.sort((a, b) => a - b)

        const centerIdx = (y * width + x) * 4
        data[centerIdx] = rVals[4]
        data[centerIdx + 1] = gVals[4]
        data[centerIdx + 2] = bVals[4]
      }
    }
  } else if (params.blurType === 'box' || params.blurType === 'gaussian') {
    // 3x3 Convolution Blur
    const copy = new Uint8ClampedArray(data)
    const kernel =
      params.blurType === 'gaussian'
        ? [
            [1, 2, 1],
            [2, 4, 2],
            [1, 2, 1],
          ]
        : [
            [1, 1, 1],
            [1, 1, 1],
            [1, 1, 1],
          ]
    const weightSum = params.blurType === 'gaussian' ? 16 : 9

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let rAcc = 0
        let gAcc = 0
        let bAcc = 0

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4
            const weight = kernel[ky + 1][kx + 1]
            rAcc += copy[idx] * weight
            gAcc += copy[idx + 1] * weight
            bAcc += copy[idx + 2] * weight
          }
        }

        const centerIdx = (y * width + x) * 4
        data[centerIdx] = rAcc / weightSum
        data[centerIdx + 1] = gAcc / weightSum
        data[centerIdx + 2] = bAcc / weightSum
      }
    }
  }

  // 6. Sharpen (Làm nét cạnh)
  if (params.sharpen) {
    const copy = new Uint8ClampedArray(data)
    const kernel = [
      [0, -1, 0],
      [-1, 5, -1],
      [0, -1, 0],
    ]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let rAcc = 0
        let gAcc = 0
        let bAcc = 0

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4
            const weight = kernel[ky + 1][kx + 1]
            rAcc += copy[idx] * weight
            gAcc += copy[idx + 1] * weight
            bAcc += copy[idx + 2] * weight
          }
        }

        const centerIdx = (y * width + x) * 4
        data[centerIdx] = Math.min(255, Math.max(0, rAcc))
        data[centerIdx + 1] = Math.min(255, Math.max(0, gAcc))
        data[centerIdx + 2] = Math.min(255, Math.max(0, bAcc))
      }
    }
  }

  // 7. Edge Detection (Sobel hoặc Laplacian)
  if (params.edgeDetect === 'sobel') {
    const copy = new Uint8ClampedArray(data)
    const gxKernel = [
      [-1, 0, 1],
      [-2, 0, 2],
      [-1, 0, 1],
    ]
    const gyKernel = [
      [-1, -2, -1],
      [0, 0, 0],
      [1, 2, 1],
    ]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let gx = 0
        let gy = 0

        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4
            // Dùng độ chói để phát hiện biên
            const lum = 0.299 * copy[idx] + 0.587 * copy[idx + 1] + 0.114 * copy[idx + 2]
            gx += lum * gxKernel[ky + 1][kx + 1]
            gy += lum * gyKernel[ky + 1][kx + 1]
          }
        }

        const mag = Math.min(255, Math.sqrt(gx * gx + gy * gy))
        const centerIdx = (y * width + x) * 4
        data[centerIdx] = mag
        data[centerIdx + 1] = mag
        data[centerIdx + 2] = mag
      }
    }
  } else if (params.edgeDetect === 'laplacian') {
    const copy = new Uint8ClampedArray(data)
    const lapKernel = [
      [0, 1, 0],
      [1, -4, 1],
      [0, 1, 0],
    ]

    for (let y = 1; y < height - 1; y++) {
      for (let x = 1; x < width - 1; x++) {
        let acc = 0
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const idx = ((y + ky) * width + (x + kx)) * 4
            const lum = 0.299 * copy[idx] + 0.587 * copy[idx + 1] + 0.114 * copy[idx + 2]
            acc += lum * lapKernel[ky + 1][kx + 1]
          }
        }

        const val = Math.min(255, Math.max(0, Math.abs(acc)))
        const centerIdx = (y * width + x) * 4
        data[centerIdx] = val
        data[centerIdx + 1] = val
        data[centerIdx + 2] = val
      }
    }
  }

  // 8. Flip Horizontal / Vertical
  if (params.flipH || params.flipV) {
    const copy = new Uint8ClampedArray(data)
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const targetX = params.flipH ? width - 1 - x : x
        const targetY = params.flipV ? height - 1 - y : y
        const srcIdx = (y * width + x) * 4
        const dstIdx = (targetY * width + targetX) * 4

        data[dstIdx] = copy[srcIdx]
        data[dstIdx + 1] = copy[srcIdx + 1]
        data[dstIdx + 2] = copy[srcIdx + 2]
        data[dstIdx + 3] = copy[srcIdx + 3]
      }
    }
  }

  // 9. Compute Realtime Histogram (256 bins)
  const histogram = {
    r: new Array(256).fill(0),
    g: new Array(256).fill(0),
    b: new Array(256).fill(0),
    lum: new Array(256).fill(0),
  }

  for (let i = 0; i < len; i += 4) {
    const r = data[i]
    const g = data[i + 1]
    const b = data[i + 2]
    const lum = Math.round(0.299 * r + 0.587 * g + 0.114 * b)

    histogram.r[r]++
    histogram.g[g]++
    histogram.b[b]++
    histogram.lum[lum]++
  }

  const outImageData = new ImageData(data, width, height)
  return { imageData: outImageData, histogram }
}
