# 🧪 AI Lab – Computer Vision Playground

Website kiểm thử mô hình Computer Vision: tải mô hình (`.pt`, `.onnx`, `.h5`, `.keras`, `.tflite`, YOLO…) và ảnh lên để chạy inference trực tiếp.

## 🚀 Dùng ngay – không cần cài đặt

👉 **[Mở website AI Lab](https://YOUR_HF_USERNAME-ai-lab.hf.space)** 👈

[![Open in Hugging Face Spaces](https://huggingface.co/datasets/huggingface/badges/resolve/main/open-in-hf-spaces-lg.svg)](https://huggingface.co/spaces/YOUR_HF_USERNAME/ai-lab)

> Nếu web đang “ngủ” (Space không có truy cập trong 48 giờ), chỉ cần đợi khoảng 1–2 phút để nó tự khởi động lại.

**Tài khoản demo**

| Vai trò | Email | Mật khẩu |
|---|---|---|
| Admin | `admin@ailab.com` | `admin123` |
| User | `user@ailab.com` | `user123` |

## 🧱 Công nghệ

- **Frontend:** Next.js 16, React 19, Tailwind CSS 4
- **Inference:** Python 3.12 – PyTorch, Ultralytics YOLO, ONNX Runtime, TensorFlow/Keras
- **Triển khai:** Docker trên Hugging Face Spaces (tự động deploy qua GitHub Actions)

## 💻 Chạy trên máy (tùy chọn)

**Cách 1 – Docker (1 lệnh):**

```bash
docker build -t ai-lab . && docker run -p 7860:7860 ai-lab
```

Mở http://localhost:7860

**Cách 2 – Thủ công:** cần Node.js ≥ 20 và Python ≥ 3.10

```bash
npm install
pip install torch torchvision -r requirements.txt
npm run dev
```

Mở http://localhost:3000
