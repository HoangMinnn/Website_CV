import { NextRequest, NextResponse } from 'next/server'
import { newRunId, runModelScript, safeUnlink, saveUpload } from '@/lib/python-runner'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function POST(req: NextRequest) {
  let modelPath: string | null = null
  let labelsPath: string | null = null
  try {
    const form = await req.formData()
    const modelFile = form.get('modelFile') as File | null
    const labelsFile = form.get('labelsFile') as File | null
    if (!modelFile || modelFile.size === 0) {
      return NextResponse.json({ success: false, error: 'Chưa nhận được file mô hình để phân tích.' }, { status: 400 })
    }

    const runId = newRunId('inspect')
    modelPath = await saveUpload(modelFile, runId, 'model')
    const args = ['--model', modelPath, '--inspect', '--name', modelFile.name]
    if (labelsFile && labelsFile.size > 0) {
      labelsPath = await saveUpload(labelsFile, runId, 'labels')
      args.push('--labels', labelsPath)
    }
    const imgsz = form.get('imgsz')
    const norm = form.get('norm')
    if (imgsz && Number(imgsz) > 0) args.push('--imgsz', String(Number(imgsz)))
    if (norm) args.push('--norm', String(norm))

    const r = await runModelScript(args)
    if (!r.ok) return NextResponse.json({ success: false, error: r.error }, { status: 500 })
    return NextResponse.json(r.data, { status: r.data?.success ? 200 : 422 })
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message || 'Lỗi server khi phân tích model.' }, { status: 500 })
  } finally {
    safeUnlink(modelPath, labelsPath)
  }
}
