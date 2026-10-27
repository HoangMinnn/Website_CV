# 🧪 AI Lab – Computer Vision Playground

Website kiểm thử mô hình Computer Vision: tải mô hình (`.pt`, `.onnx`, `.h5`, `.keras`, `.tflite`, YOLO…) và ảnh lên để chạy inference trực tiếp.

## ✅ Yêu cầu (chỉ cài 1 lần)

| Phần mềm             | Phiên bản                  | Tải về                                                                         |
| -------------------- | -------------------------- | ------------------------------------------------------------------------------ |
| **Node.js**          | ≥ 20 (khuyên dùng bản LTS) | https://nodejs.org                                                             |
| **Python**           | 3.10 – 3.12                | https://www.python.org/downloads/ (Windows: tick **"Add python.exe to PATH"**) |
| **Git** _(tùy chọn)_ | bất kỳ                     | https://git-scm.com                                                            |

## 🚀 Chạy web – 1 lệnh

```bash
git clone https://github.com/HoangMinnn/Website_CV.git
cd Website_CV
npm start
```

> Không có Git? Bấm **Code → Download ZIP** trên GitHub, giải nén, rồi:
>
> - **Windows:** nhấp đúp file **`start.bat`**
> - **macOS / Linux:** chạy `./start.sh`

Lệnh này sẽ **tự động**:

1. Kiểm tra Node.js và Python
2. Cài các thư viện Python còn thiếu (PyTorch, Ultralytics YOLO, ONNX Runtime, TensorFlow…)
3. Cài thư viện Node.js (`npm install`)
4. Build và khởi động web, **tự mở trình duyệt** tại http://localhost:3000

⏱ Lần đầu mất khoảng **5–10 phút** (tải PyTorch/TensorFlow). Các lần sau chỉ vài giây.

**Tài khoản demo**

| Vai trò | Email             | Mật khẩu   |
| ------- | ----------------- | ---------- |
| Admin   | `admin@ailab.com` | `admin123` |
| User    | `user@ailab.com`  | `user123`  |

## ⚙️ Tùy chọn

| Lệnh                                                         | Tác dụng                                                             |
| ------------------------------------------------------------ | -------------------------------------------------------------------- |
| `npm start -- --dev`                                         | Chạy chế độ phát triển (tự reload khi sửa code)                      |
| `npm start -- --no-open` | Không tự mở trình duyệt                                  |
| `PORT=4000 npm start`    | Đổi cổng (mặc định 3000, tự chọn cổng khác nếu bị chiếm) |

## 🧱 Công nghệ

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Inference:** Python – PyTorch, Ultralytics YOLO, ONNX Runtime, TensorFlow/Keras

## ❓ Lỗi thường gặp

- **`Không tìm thấy Python`** → cài Python và nhớ tick _Add to PATH_, rồi mở lại terminal.
- **Cài TensorFlow thất bại** → web vẫn chạy bình thường, chỉ không mở được mô hình `.h5/.keras/.tflite`. Thường do dùng Python 3.13+; hãy dùng Python 3.12.
- **Có GPU NVIDIA nhưng chạy bằng CPU** → cài PyTorch bản CUDA theo hướng dẫn tại https://pytorch.org/get-started/locally/
