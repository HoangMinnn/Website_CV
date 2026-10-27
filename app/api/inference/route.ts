import { NextRequest, NextResponse } from 'next/server'
import fs from 'fs'
import path from 'path'
import { ensureTempDir, newRunId, runModelScript, safeUnlink, saveUpload } from '@/lib/python-runner'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let modelPath: string | null = null
  let imagePath: string | null = null
  let labelsPath: string | null = null
  try {
    const form = await req.formData()
    const modelFile = form.get('modelFile') as File | null
    const imageFile = form.get('imageFile') as File | null
    const imageBase64 = form.get('imageBase64') as string | null
    const labelsFile = form.get('labelsFile') as File | null

    if (!modelFile || modelFile.size === 0) {
      return NextResponse.json(
        { success: false, error: 'Chưa có file mô hình được tải lên. Vui lòng tải file mô hình (.pt, .onnx, ...) từ máy của bạn.' },
        { status: 400 }
      )
    }

    const runId = newRunId('infer')
    modelPath = await saveUpload(modelFile, runId, 'model')

    if (imageFile && imageFile.size > 0) {
      imagePath = await saveUpload(imageFile, runId, 'input')
    } else if (imageBase64 && imageBase64.includes('base64,')) {
      const mime = imageBase64.slice(5, imageBase64.indexOf(';'))
      const ext = mime.includes('png') ? '.png' : mime.includes('webp') ? '.webp' : '.jpg'
      imagePath = path.join(ensureTempDir(), `input-${runId}${ext}`)
      fs.writeFileSync(imagePath, Buffer.from(imageBase64.split('base64,')[1], 'base64'))
    } else {
      return NextResponse.json({ success: false, error: 'Chưa có hình ảnh đầu vào để kiểm thử.' }, { status: 400 })
    }

    const args = [
      '--model', modelPath,
      '--image', imagePath,
      '--name', modelFile.name,
      '--conf', String(form.get('confThreshold') ?? '0.25'),
      '--iou', String(form.get('iouThreshold') ?? '0.45'),
    ]
    const imgsz = form.get('imgsz')
    const norm = form.get('norm')
    if (imgsz && Number(imgsz) > 0) args.push('--imgsz', String(Number(imgsz)))
    if (norm) args.push('--norm', String(norm))
    if (labelsFile && labelsFile.size > 0) {
      labelsPath = await saveUpload(labelsFile, runId, 'labels')
      args.push('--labels', labelsPath)
    }

    const r = await runModelScript(args)
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 500 })
    return NextResponse.json(r.data, { status: r.data?.success ? 200 : 422 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server khi xử lý inference.' }, { status: 500 })
  } finally {
    safeUnlink(modelPath, imagePath, labelsPath)
  }
}
