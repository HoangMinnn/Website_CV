#!/usr/bin/env node
/**
 * AI Lab - one-command launcher (Windows / macOS / Linux).
 *
 *   npm start              -> check tools, install missing deps, build, start, open browser
 *   npm start -- --dev     -> same, but run the dev server (hot reload)
 *   npm start -- --no-open -> do not open the browser automatically
 *
 * Only requires Node.js >= 20 and Python >= 3.9 to be installed. Uses no npm packages itself,
 * so it works before `npm install` has ever been run.
 */
import { spawn, spawnSync } from 'node:child_process'
import fs from 'node:fs'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const IS_WIN = process.platform === 'win32'
const ARGS = process.argv.slice(2)
const DEV = ARGS.includes('--dev')
const OPEN = !ARGS.includes('--no-open')
const NEXT_BIN = path.join(ROOT, 'node_modules', 'next', 'dist', 'bin', 'next')

const color = (code) => (s) => (process.stdout.isTTY ? `\x1b[${code}m${s}\x1b[0m` : s)
const cyan = color(36), green = color(32), yellow = color(33), red = color(31), bold = color(1)
const step = (msg) => console.log(cyan(`\n▶ ${msg}`))
const ok = (msg) => console.log(green(`  ✔ ${msg}`))
const warn = (msg) => console.log(yellow(`  ⚠ ${msg}`))
function fail(msg) {
  console.error(red(`\n✖ ${msg}\n`))
  process.exit(1)
}

function run(cmd, args, opts = {}) {
  const r = spawnSync(cmd, args, { cwd: ROOT, stdio: 'inherit', ...opts })
  return r.status === 0
}

// ------------------------------------------------------------------ 1. Node.js
function checkNode() {
  step('Kiểm tra Node.js')
  const [major, minor] = process.versions.node.split('.').map(Number)
  if (major < 20 || (major === 20 && minor < 9)) {
    fail(`Cần Node.js >= 20.9 (máy đang có ${process.versions.node}). Tải tại https://nodejs.org`)
  }
  ok(`Node.js ${process.versions.node}`)
}

// ------------------------------------------------------------------ 2. Python
function findPython() {
  step('Kiểm tra Python')
  const candidates = [process.env.PYTHON_BIN, ...(IS_WIN ? ['python', 'py', 'python3'] : ['python3', 'python'])]
  for (const bin of candidates.filter(Boolean)) {
    const r = spawnSync(bin, ['-c', 'import sys; print("%d.%d.%d" % sys.version_info[:3])'], { encoding: 'utf8' })
    if (r.status !== 0 || !r.stdout) continue
    const version = r.stdout.trim()
    const [maj, min] = version.split('.').map(Number)
    if (maj === 3 && min >= 9) {
      ok(`Python ${version} (${bin})`)
      return bin
    }
    warn(`Bỏ qua ${bin} (Python ${version}, cần >= 3.9)`)
  }
  fail('Không tìm thấy Python >= 3.9. Tải tại https://www.python.org/downloads/ (nhớ tick "Add python.exe to PATH").')
}

// Python module name -> pip package name
const CORE_PACKAGES = {
  numpy: 'numpy',
  PIL: 'pillow',
  cv2: 'opencv-python-headless',
  ultralytics: 'ultralytics',
  onnxruntime: 'onnxruntime',
  h5py: 'h5py',
}
const OPTIONAL_PACKAGES = { tensorflow: 'tensorflow' }

function missingModules(python, modules) {
  const code =
    'import importlib.util, json, sys\n' +
    'print(json.dumps([m for m in sys.argv[1:] if importlib.util.find_spec(m) is None]))'
  const r = spawnSync(python, ['-c', code, ...modules], { encoding: 'utf8' })
  try {
    return JSON.parse(r.stdout.trim().split(/\r?\n/).pop())
  } catch {
    return modules
  }
}

function hasNvidiaGpu() {
  return spawnSync('nvidia-smi', ['-L'], { encoding: 'utf8' }).status === 0
}

function pipInstall(python, packages, extra = []) {
  console.log(`  pip install ${packages.join(' ')} ${extra.join(' ')}`.trimEnd())
  return run(python, ['-m', 'pip', 'install', '--disable-pip-version-check', ...extra, ...packages])
}

function ensurePythonPackages(python) {
  step('Kiểm tra thư viện Python (PyTorch, YOLO, ONNX, TensorFlow)')

  if (spawnSync(python, ['-m', 'pip', '--version']).status !== 0) {
    warn('Chưa có pip, đang cài...')
    run(python, ['-m', 'ensurepip', '--upgrade'])
  }

  // PyTorch first: on Linux without an NVIDIA GPU use the much smaller CPU build
  const torchMissing = missingModules(python, ['torch', 'torchvision'])
  if (torchMissing.length) {
    console.log('  Đang cài PyTorch (lần đầu có thể mất vài phút)...')
    const extra = process.platform === 'linux' && !hasNvidiaGpu()
      ? ['--index-url', 'https://download.pytorch.org/whl/cpu'] : []
    if (!pipInstall(python, ['torch', 'torchvision'], extra)) fail('Cài PyTorch thất bại. Xem lỗi phía trên.')
  }

  const core = missingModules(python, Object.keys(CORE_PACKAGES)).map((m) => CORE_PACKAGES[m])
  if (core.length && !pipInstall(python, core)) fail('Cài thư viện Python thất bại. Xem lỗi phía trên.')

  const optional = missingModules(python, Object.keys(OPTIONAL_PACKAGES)).map((m) => OPTIONAL_PACKAGES[m])
  if (optional.length && !pipInstall(python, optional)) {
    warn('Không cài được TensorFlow -> web vẫn chạy, chỉ không hỗ trợ mô hình .h5/.keras/.tflite.')
  }
  ok('Thư viện Python đã sẵn sàng')
}

// ------------------------------------------------------------------ 3. Node packages
function ensureNodeModules() {
  step('Kiểm tra thư viện Node.js')
  if (fs.existsSync(NEXT_BIN)) return ok('node_modules đã có')
  console.log('  Đang chạy npm install (lần đầu mất khoảng 1 phút)...')
  // npm is a .cmd on Windows, so it needs a shell there
  if (!run('npm', ['install', '--no-audit', '--no-fund'], { shell: IS_WIN })) fail('npm install thất bại.')
  ok('Đã cài node_modules')
}

// ------------------------------------------------------------------ 4. Build
function newestMtime(p) {
  if (!fs.existsSync(p)) return 0
  const st = fs.statSync(p)
  if (!st.isDirectory()) return st.mtimeMs
  return fs.readdirSync(p).reduce((m, f) => Math.max(m, newestMtime(path.join(p, f))), st.mtimeMs)
}

function ensureBuild() {
  step('Build giao diện web')
  const buildId = path.join(ROOT, '.next', 'BUILD_ID')
  const sources = ['app', 'components', 'lib', 'public', 'next.config.mjs', 'package.json', 'postcss.config.mjs']
  const srcTime = Math.max(...sources.map((s) => newestMtime(path.join(ROOT, s))))
  const isStandalone = fs.existsSync(path.join(ROOT, '.next', 'standalone'))
  if (fs.existsSync(buildId) && fs.statSync(buildId).mtimeMs > srcTime && !isStandalone) {
    return ok('Bản build đã mới nhất')
  }
  const env = { ...process.env, NEXT_TELEMETRY_DISABLED: '1' }
  delete env.NEXT_OUTPUT
  if (!run(process.execPath, [NEXT_BIN, 'build'], { env })) fail('Build thất bại. Xem lỗi phía trên.')
  ok('Build xong')
}

// ------------------------------------------------------------------ 5. Start
function isPortFree(port) {
  return new Promise((resolve) => {
    const srv = net.createServer().once('error', () => resolve(false))
    srv.listen(port, () => srv.close(() => resolve(true)))
  })
}

async function findPort(start) {
  for (let p = start; p < start + 20; p++) if (await isPortFree(p)) return p
  fail(`Không tìm được cổng trống từ ${start} đến ${start + 19}.`)
}

function openBrowser(url) {
  const [cmd, args] = IS_WIN ? ['cmd', ['/c', 'start', '""', url]]
    : process.platform === 'darwin' ? ['open', [url]] : ['xdg-open', [url]]
  try {
    spawn(cmd, args, { stdio: 'ignore', detached: true }).unref()
  } catch {
    /* ignore - the URL is printed anyway */
  }
}

async function waitAndOpen(url) {
  for (let i = 0; i < 120; i++) {
    try {
      await fetch(url)
      console.log(bold(green(`\n  🚀 AI Lab đang chạy tại: ${url}`)))
      console.log('     Tài khoản demo: admin@ailab.com / admin123  •  user@ailab.com / user123')
      console.log('     Nhấn Ctrl+C để dừng.\n')
      if (OPEN) openBrowser(url)
      return
    } catch {
      await new Promise((r) => setTimeout(r, 1000))
    }
  }
}

async function start(python) {
  const port = await findPort(Number(process.env.PORT) || 3000)
  step(`Khởi động web (${DEV ? 'dev' : 'production'}) trên cổng ${port}`)
  const child = spawn(process.execPath, [NEXT_BIN, DEV ? 'dev' : 'start', '-p', String(port)], {
    cwd: ROOT,
    stdio: 'inherit',
    env: { ...process.env, PYTHON_BIN: python, NEXT_TELEMETRY_DISABLED: '1' },
  })
  child.on('exit', (code) => process.exit(code ?? 0))
  for (const sig of ['SIGINT', 'SIGTERM']) process.on(sig, () => child.kill(sig))
  waitAndOpen(`http://localhost:${port}`)
}

// ------------------------------------------------------------------ main
console.log(bold('\n🧪 AI Lab - tự động cài đặt & khởi chạy'))
checkNode()
const python = findPython()
ensurePythonPackages(python)
ensureNodeModules()
if (!DEV) ensureBuild()
await start(python)
