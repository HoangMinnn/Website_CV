# syntax=docker/dockerfile:1
# AI Lab UI - Next.js frontend + Python inference (PyTorch / YOLO / ONNX / TensorFlow)
# Works on Hugging Face Spaces (Docker SDK, port 7860) and any Docker host.

# ---------- Stage 1: build the Next.js app ----------
FROM node:22-bookworm-slim AS web-builder
WORKDIR /app
ENV NEXT_TELEMETRY_DISABLED=1 \
    NEXT_OUTPUT=standalone

COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

COPY . .
RUN npm run build

# ---------- Stage 2: runtime (Python + Node) ----------
FROM python:3.12-slim-bookworm AS runtime

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# System libs needed by OpenCV and the Node binary
RUN apt-get update \
 && apt-get install -y --no-install-recommends libgl1 libglib2.0-0 libstdc++6 ca-certificates \
 && rm -rf /var/lib/apt/lists/*

# Node.js runtime (copied from the builder image, same Debian base)
COPY --from=web-builder /usr/local/bin/node /usr/local/bin/node

# Python deps: CPU-only PyTorch first (much smaller than the CUDA build), then the rest
COPY requirements.txt /tmp/requirements.txt
RUN pip install --index-url https://download.pytorch.org/whl/cpu torch torchvision \
 && pip install -r /tmp/requirements.txt

# Hugging Face Spaces runs containers as uid 1000
RUN useradd -m -u 1000 user
WORKDIR /app

COPY --from=web-builder --chown=user /app/.next/standalone ./
COPY --from=web-builder --chown=user /app/.next/static ./.next/static
COPY --from=web-builder --chown=user /app/public ./public
COPY --chown=user scripts ./scripts
RUN mkdir -p /app/.temp_inference && chown -R user:user /app/.temp_inference

USER user
ENV HOME=/home/user \
    NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    PORT=7860 \
    HOSTNAME=0.0.0.0 \
    PYTHON_BIN=python \
    YOLO_CONFIG_DIR=/tmp/Ultralytics \
    MPLCONFIGDIR=/tmp/matplotlib

EXPOSE 7860
CMD ["node", "server.js"]
