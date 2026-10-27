import { spawn } from 'child_process'
import path from 'path'
import fs from 'fs'

export const RESULT_MARKER = '__AILAB_RESULT__'
const SCRIPT = path.join(process.cwd(), 'scripts', 'run_inference.py')
const TEMP_DIR = path.join(process.cwd(), '.temp_inference')

export type PythonResult = { ok: true; data: any } | { ok: false; error: string }

export function ensureTempDir() {
  if (!fs.existsSync(TEMP_DIR)) fs.mkdirSync(TEMP_DIR, { recursive: true })
  return TEMP_DIR
}

export function newRunId(prefix = 'run') {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`
}

/** Save an uploaded File to the temp dir, keeping its extension (needed to pick the right loader). */
export async function saveUpload(file: File, runId: string, role: string): Promise<string> {
  const ext = (path.extname(file.name) || '').toLowerCase().replace(/[^a-z0-9.]/g, '')
  const p = path.join(ensureTempDir(), `${role}-${runId}${ext}`)
  fs.writeFileSync(p, Buffer.from(await file.arrayBuffer()))
  return p
}

export function safeUnlink(...files: (string | null | undefined)[]) {
  for (const f of files) {
    try {
      if (f && fs.existsSync(f)) fs.unlinkSync(f)
    } catch {
      /* ignore */
    }
  }
}

/** Keep only meaningful stderr lines (drop FutureWarning / UserWarning noise). */
function cleanStderr(stderr: string): string {
  const tbIdx = stderr.lastIndexOf('Traceback (most recent call last)')
  if (tbIdx >= 0) return stderr.slice(tbIdx).trim().slice(-2500)
  const lines = stderr
    .split(/\r?\n/)
    .filter((l) => l.trim() && !/Warning|warnings\.warn|^\s+loaded = torch\.load/.test(l))
  return lines.slice(-15).join('\n').trim()
}

export function runModelScript(args: string[], timeoutMs = 300_000): Promise<PythonResult> {
  return new Promise((resolve) => {
    const child = spawn(process.env.PYTHON_BIN || 'python', [SCRIPT, ...args], {
      cwd: process.cwd(),
      env: { ...process.env, PYTHONIOENCODING: 'utf-8', PYTHONUTF8: '1' },
    })
    let stdout = ''
    let stderr = ''
    let settled = false
    const finish = (r: PythonResult) => {
      if (!settled) {
        settled = true
        clearTimeout(timer)
        resolve(r)
      }
    }
    const timer = setTimeout(() => {
      child.kill()
      finish({ ok: false, error: `Mô hình chạy quá ${Math.round(timeoutMs / 1000)} giây nên đã bị dừng.` })
    }, timeoutMs)

    child.stdout.on('data', (d) => (stdout += d.toString('utf8')))
    child.stderr.on('data', (d) => (stderr += d.toString('utf8')))
    child.on('error', (err: any) => {
      finish({
        ok: false,
        error:
          err?.code === 'ENOENT'
            ? 'Không tìm thấy Python trên máy. Hãy cài Python và thêm vào PATH.'
            : `Không khởi động được Python: ${err.message}`,
      })
    })
    child.on('close', (code) => {
      const line = stdout
        .split(/\r?\n/)
        .reverse()
        .find((l) => l.startsWith(RESULT_MARKER))
      if (line) {
        try {
          return finish({ ok: true, data: JSON.parse(line.slice(RESULT_MARKER.length)) })
        } catch (e: any) {
          return finish({ ok: false, error: `Kết quả trả về không hợp lệ: ${e.message}` })
        }
      }
      const detail = cleanStderr(stderr) || stdout.trim().slice(-1500)
      finish({
        ok: false,
        error: `Tiến trình Python kết thúc (mã ${code}) mà không trả kết quả.${detail ? '\n' + detail : ''}`,
      })
    })
  })
}
