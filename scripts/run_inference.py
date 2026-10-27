#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
AI Lab - real model runner.

Usage:
  python run_inference.py --model M --image I [--conf 0.25] [--iou 0.45]
                          [--imgsz 0] [--norm auto] [--labels L] [--name N]
  python run_inference.py --model M --inspect [--labels L] [--name N]

Protocol: stdout contains exactly ONE line:  __AILAB_RESULT__{json}
Everything else (library logs, warnings, prints inside pickled user code)
is redirected to stderr so it can never corrupt the result.
"""
import os
import sys

os.environ.setdefault("YOLO_VERBOSE", "False")
os.environ.setdefault("YOLO_AUTOINSTALL", "False")
os.environ.setdefault("YOLO_OFFLINE", "True")
os.environ.setdefault("TF_CPP_MIN_LOG_LEVEL", "3")

import ast
import json
import time
import base64
import argparse
import warnings
import traceback

warnings.filterwarnings("ignore")

RESULT_MARKER = "__AILAB_RESULT__"
_REAL_STDOUT = sys.stdout
sys.stdout = sys.stderr  # every library print goes to stderr from now on

COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#06b6d4',
          '#ec4899', '#14b8a6', '#f97316', '#84cc16', '#6366f1', '#e11d48']

TASK_MAP = {"detect": "detection", "segment": "segmentation", "classify": "classification",
            "pose": "detection", "obb": "detection"}

NORMS = {
    "imagenet": ([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
    "zero_one": ([0.0, 0.0, 0.0], [1.0, 1.0, 1.0]),
    "minus_one_one": ([0.5, 0.5, 0.5], [0.5, 0.5, 0.5]),
    "mnist": ([0.1307, 0.1307, 0.1307], [0.3081, 0.3081, 0.3081]),
}
NORM_LABELS = {
    "imagenet": "ImageNet mean/std", "zero_one": "[0, 1] (chia 255)",
    "minus_one_one": "[-1, 1]", "mnist": "MNIST (0.1307, 0.3081)", "raw255": "Giá trị gốc 0-255",
    "ultralytics": "Ultralytics letterbox [0, 1]", "custom": "mean/std lưu trong checkpoint",
}
SIZE_CANDIDATES = [224, 32, 28, 64, 96, 128, 160, 192, 256, 299, 320, 384, 416, 448, 512, 640]


class ModelError(Exception):
    """Error carrying a user-facing explanation."""


def emit(payload):
    line = RESULT_MARKER + json.dumps(payload, ensure_ascii=False, default=str) + "\n"
    _REAL_STDOUT.buffer.write(line.encode("utf-8"))
    _REAL_STDOUT.flush()


def color_for(i):
    return COLORS[int(i) % len(COLORS)]


# --------------------------------------------------------------------------- labels
def names_to_list(raw):
    if raw is None:
        return []
    if isinstance(raw, str):
        s = raw.strip()
        if not s:
            return []
        try:
            raw = ast.literal_eval(s)
        except Exception:
            try:
                raw = json.loads(s)
            except Exception:
                return []
    if isinstance(raw, dict):
        if not raw:
            return []
        keys_numeric = all(isinstance(k, int) or str(k).isdigit() for k in raw.keys())
        vals_int = all(isinstance(v, int) for v in raw.values())
        if vals_int and not keys_numeric:  # class_to_idx {name: idx}
            inv = {v: k for k, v in raw.items()}
            return [str(inv.get(i, f"Class {i}")) for i in range(max(inv) + 1)]
        if keys_numeric:
            items = {int(k): v for k, v in raw.items()}
            return [str(items.get(i, f"Class {i}")) for i in range(max(items) + 1)]
        return [str(v) for v in raw.values()]
    if isinstance(raw, (list, tuple)):
        if raw and all(isinstance(c, (str, int, float)) for c in raw):
            return [str(c) for c in raw]
    return []


NAME_KEYS = ("names", "classes", "class_names", "labels", "label_names",
             "idx_to_class", "class_to_idx", "categories")


def find_names(obj, depth=0):
    if obj is None or depth > 2:
        return []
    if isinstance(obj, dict):
        for k in NAME_KEYS:
            if k in obj:
                lst = names_to_list(obj[k])
                if lst:
                    return lst
        for k in ("hyper_parameters", "hparams", "meta", "metadata", "config", "args"):
            if isinstance(obj.get(k), dict):
                lst = find_names(obj[k], depth + 1)
                if lst:
                    return lst
        for k in ("model", "ema", "net", "module"):
            v = obj.get(k)
            if v is not None and not isinstance(v, dict):
                lst = find_names(v, depth + 1)
                if lst:
                    return lst
        return []
    for k in ("names", "classes", "class_names", "labels"):
        try:
            v = getattr(obj, k, None)
        except Exception:
            v = None
        if v is not None and not callable(v):
            lst = names_to_list(v)
            if lst:
                return lst
    return []


def load_labels_file(path):
    import re
    with open(path, "r", encoding="utf-8-sig", errors="replace") as f:
        text = f.read()
    stripped = text.strip()
    if stripped.startswith("{") or stripped.startswith("["):
        lst = names_to_list(stripped)
        if lst:
            return lst
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    pat = re.compile(r"^\d+\s*[:,\t ]\s*(.+)$")
    if lines and all(pat.match(ln) for ln in lines):
        lines = [pat.match(ln).group(1).strip().strip("'\"") for ln in lines]
    return lines


def label_of(names, idx):
    idx = int(idx)
    return names[idx] if 0 <= idx < len(names) else f"Class {idx}"


# --------------------------------------------------------------------------- image
def load_image_rgb(path):
    from PIL import Image, ImageOps
    try:
        img = Image.open(path)
        img = ImageOps.exif_transpose(img)
        return img.convert("RGB")
    except Exception as e:
        raise ModelError(f"Không đọc được ảnh đầu vào ({e}). Hãy dùng ảnh JPG/PNG/WebP/BMP.")


def preprocess(img, size_hw, channels, norm, layout="NCHW", dtype="float32", mean_std=None):
    import numpy as np
    from PIL import Image
    h, w = size_hw
    arr = np.asarray(img.resize((w, h), Image.BILINEAR)).astype(np.float32)
    if norm != "raw255":
        arr = arr / 255.0
    if channels == 1:
        arr = (arr @ np.array([0.299, 0.587, 0.114], dtype=np.float32))[..., None]
    if norm not in ("raw255", "zero_one"):
        mean, std = mean_std if (norm == "custom" and mean_std) else NORMS.get(norm, NORMS["imagenet"])
        mean = np.array(mean[:channels] if len(mean) >= channels else [mean[0]] * channels, dtype=np.float32)
        std = np.array(std[:channels] if len(std) >= channels else [std[0]] * channels, dtype=np.float32)
        arr = (arr - mean) / std
    if layout == "NCHW":
        arr = arr.transpose(2, 0, 1)
    return np.ascontiguousarray(arr[None]).astype(dtype)


def looks_like_shape_error(e):
    msg = str(e).lower()
    keys = ("size", "shape", "mat1", "mat2", "dimension", "expected", "mismatch", "out of range",
            "kernel", "padded input", "invalid_argument", "invalid dimensions", "must match", "view")
    return any(k in msg for k in keys)


# --------------------------------------------------------------------------- output decoding
def squeeze_batch(arr):
    import numpy as np
    a = np.asarray(arr, dtype=np.float32)
    if a.ndim >= 2 and a.shape[0] == 1:
        a = a[0]
    return a


def output_task(arr, names):
    a = squeeze_batch(arr)
    if a.ndim == 0:
        raise ModelError("Mô hình trả về một số vô hướng, không thể diễn giải.")
    if a.ndim == 1:
        return "classification", (2 if a.size == 1 else int(a.size))
    if a.ndim == 3 and min(a.shape[1], a.shape[2]) >= 4:
        return "segmentation", (2 if a.shape[0] == 1 else int(a.shape[0]))
    if a.ndim == 2:
        f = min(a.shape)
        nc = len(names) if names else max(1, f - 4)
        return "detection", nc
    raise ModelError(f"Không diễn giải được đầu ra của mô hình có shape {list(arr.shape)}.")


def classify_output(arr, names):
    import numpy as np
    v = squeeze_batch(arr).astype(np.float64).ravel()
    if v.size == 1:
        p = float(v[0]) if 0.0 <= v[0] <= 1.0 else float(1.0 / (1.0 + np.exp(-v[0])))
        probs = np.array([1.0 - p, p])
        labels = names if len(names) == 2 else ["Class 0", "Class 1"]
    else:
        if np.all(v >= 0) and abs(v.sum() - 1.0) < 1e-3:
            probs = v
        else:
            e = np.exp(v - v.max())
            probs = e / e.sum()
        labels = None
    order = np.argsort(probs)[::-1][:5]
    out = []
    for i in order:
        lbl = labels[i] if labels is not None else label_of(names, i)
        out.append({"label": lbl, "index": int(i), "confidence": round(float(probs[i]), 4)})
    return out


def nms_xyxy(boxes, scores, classes, iou):
    import numpy as np
    import cv2
    if len(boxes) == 0:
        return []
    off = classes.astype(np.float32)[:, None] * 8192.0
    b = boxes + off
    xywh = [[float(x1), float(y1), float(x2 - x1), float(y2 - y1)] for x1, y1, x2, y2 in b]
    idx = cv2.dnn.NMSBoxes(xywh, scores.astype(float).tolist(), 0.0, float(iou))
    return np.array(idx).reshape(-1).tolist() if len(idx) else []


def decode_yolo_raw(arr, names, conf, iou, in_hw):
    import numpy as np
    a = squeeze_batch(arr)
    if a.shape[0] < a.shape[1]:
        a = a.T  # -> [N, F]
    n_feat = a.shape[1]
    nc = len(names)
    v5 = bool(nc) and n_feat == 5 + nc
    if n_feat < 5:
        raise ModelError(f"Đầu ra dạng {list(arr.shape)} không giống định dạng phát hiện vật thể YOLO.")
    boxes = a[:, :4].astype(np.float32)
    if v5:
        scores_all = a[:, 5:5 + nc] * a[:, 4:5]
    else:
        scores_all = a[:, 4:4 + nc] if nc else a[:, 4:]
    cls = scores_all.argmax(1)
    sc = scores_all.max(1)
    keep = sc >= conf
    boxes, cls, sc = boxes[keep], cls[keep], sc[keep]
    in_h, in_w = in_hw
    if len(boxes) and boxes.max() <= 1.5:
        boxes = boxes * np.array([in_w, in_h, in_w, in_h], dtype=np.float32)
    xyxy = np.stack([boxes[:, 0] - boxes[:, 2] / 2, boxes[:, 1] - boxes[:, 3] / 2,
                     boxes[:, 0] + boxes[:, 2] / 2, boxes[:, 1] + boxes[:, 3] / 2], 1) if len(boxes) else boxes
    keep_idx = nms_xyxy(xyxy, sc, cls, iou)[:300]
    dets = []
    for j, k in enumerate(keep_idx):
        x1, y1, x2, y2 = xyxy[k]
        dets.append(make_det(j, label_of(names, cls[k]), int(cls[k]), float(sc[k]),
                             x1 / in_w, y1 / in_h, x2 / in_w, y2 / in_h))
    return dets


def make_det(i, label, cls_id, conf, x1, y1, x2, y2, polygon=None):
    x1, y1 = max(0.0, min(1.0, float(x1))), max(0.0, min(1.0, float(y1)))
    x2, y2 = max(0.0, min(1.0, float(x2))), max(0.0, min(1.0, float(y2)))
    d = {"id": f"det-{i + 1}", "label": label, "classId": int(cls_id), "confidence": round(conf, 4),
         "color": color_for(cls_id), "x": round(x1, 4), "y": round(y1, 4),
         "width": round(max(0.001, x2 - x1), 4), "height": round(max(0.001, y2 - y1), 4)}
    if polygon is not None and len(polygon) >= 3:
        step = max(1, len(polygon) // 200)
        d["polygon"] = [[round(float(px), 4), round(float(py), 4)] for px, py in polygon[::step]]
    return d


def segment_output(arr, names, orig_wh):
    import numpy as np
    import cv2
    a = squeeze_batch(arr)
    c = a.shape[0]
    if c == 1:
        m = a[0]
        if m.min() < 0 or m.max() > 1:
            m = 1.0 / (1.0 + np.exp(-m))
        mask = (m > 0.5).astype(np.int32)
        seg_names = names if len(names) == 2 else (["background", names[0]] if len(names) == 1 else ["background", "foreground"])
        n_cls = 2
    else:
        mask = a.argmax(0).astype(np.int32)
        seg_names = names
        n_cls = c
    bg_transparent = c == 1 or (seg_names and str(seg_names[0]).lower() in ("background", "__background__", "bg", "_background_"))
    counts = np.bincount(mask.ravel(), minlength=n_cls)
    total = float(mask.size)
    palette = np.array([[int(col[1:3], 16), int(col[3:5], 16), int(col[5:7], 16)] for col in
                        [color_for(i) for i in range(n_cls)]], dtype=np.uint8)
    rgb = palette[mask]
    alpha = np.full(mask.shape, 150, dtype=np.uint8)
    if bg_transparent:
        alpha[mask == 0] = 0
    rgba = np.dstack([rgb, alpha])
    w, h = orig_wh
    rgba = cv2.resize(rgba, (w, h), interpolation=cv2.INTER_NEAREST)
    ok, buf = cv2.imencode(".png", cv2.cvtColor(rgba, cv2.COLOR_RGBA2BGRA))
    seg_png = "data:image/png;base64," + base64.b64encode(buf.tobytes()).decode("ascii") if ok else None
    stats = []
    for i in np.argsort(counts)[::-1]:
        if counts[i] == 0:
            continue
        stats.append({"label": label_of(seg_names, i), "index": int(i),
                      "ratio": round(counts[i] / total, 4), "color": color_for(i)})
    top = [{"label": s["label"], "index": s["index"], "confidence": s["ratio"]} for s in stats[:5]]
    return seg_png, stats, top, seg_names


# --------------------------------------------------------------------------- result helpers
def device_label_torch(device):
    import torch
    if str(device).startswith("cuda") and torch.cuda.is_available():
        return f"NVIDIA CUDA ({torch.cuda.get_device_name(0)})"
    return "CPU"


def summarize_dets(dets):
    best = {}
    for d in dets:
        best[d["label"]] = max(best.get(d["label"], 0.0), d["confidence"])
    return [{"label": k, "confidence": v} for k, v in sorted(best.items(), key=lambda x: -x[1])[:5]]


def finalize(base, task, names, nc, latency_ms, extra):
    classes = names if names else [f"Class {i}" for i in range(nc or 0)]
    out = dict(base)
    out.update({
        "success": True, "modelType": task,
        "latencyMs": round(float(latency_ms), 1),
        "fps": round(1000.0 / max(latency_ms, 0.1), 1),
        "modelClasses": classes, "totalModelClasses": len(classes),
        "timestamp": time.strftime("%H:%M:%S"),
    })
    out.update(extra)
    return out


def inspect_payload(base, task, names, nc, input_shape, notes):
    classes = names if names else []
    return dict(base, success=True, task=task, classes=classes,
                classesCount=len(classes) if classes else int(nc or 0),
                inputShape=input_shape, notes=notes)


# --------------------------------------------------------------------------- ultralytics
def run_ultralytics(args, img_path, labels, base, task_hint=None):
    import torch
    from ultralytics import YOLO
    model = YOLO(args.model, task=task_hint) if task_hint else YOLO(args.model)
    names = names_to_list(getattr(model, "names", None))
    notes = []
    if labels:
        if names and len(labels) != len(names):
            notes.append(f"File nhãn có {len(labels)} dòng nhưng mô hình có {len(names)} lớp.")
        names = labels
    task = TASK_MAP.get(getattr(model, "task", "detect"), "detection")
    base = dict(base, framework=base.get("framework") or "Ultralytics YOLO",
                architecture=f"Ultralytics YOLO ({getattr(model, 'task', 'detect')})")
    if args.inspect:
        imgsz = None
        try:
            imgsz = model.overrides.get("imgsz") or model.ckpt.get("train_args", {}).get("imgsz")
        except Exception:
            pass
        return inspect_payload(base, task, names, len(names), f"1 x 3 x {imgsz or 640} x {imgsz or 640}", notes)

    device = 0 if torch.cuda.is_available() else "cpu"
    kw = dict(conf=args.conf, iou=args.iou, device=device, verbose=False, max_det=300)
    if args.imgsz > 0:
        kw["imgsz"] = args.imgsz
    t0 = time.time()
    res = model.predict(img_path, **kw)[0]
    wall = (time.time() - t0) * 1000
    speed = getattr(res, "speed", None) or {}
    latency = sum(v for v in speed.values() if v) if speed else wall

    dets, top = [], []
    if getattr(res, "obb", None) is not None and len(res.obb):
        polys = res.obb.xyxyxyxyn.cpu().numpy()
        for i, (cid, cf) in enumerate(zip(res.obb.cls.cpu().numpy(), res.obb.conf.cpu().numpy())):
            p = polys[i]
            dets.append(make_det(i, label_of(names, cid), int(cid), float(cf),
                                 p[:, 0].min(), p[:, 1].min(), p[:, 0].max(), p[:, 1].max(), polygon=p))
    elif getattr(res, "boxes", None) is not None and len(res.boxes):
        xyxyn = res.boxes.xyxyn.cpu().numpy()
        cls = res.boxes.cls.cpu().numpy()
        cf = res.boxes.conf.cpu().numpy()
        polys = res.masks.xyn if getattr(res, "masks", None) is not None else None
        for i in range(len(cls)):
            poly = polys[i] if polys is not None and i < len(polys) else None
            x1, y1, x2, y2 = xyxyn[i]
            dets.append(make_det(i, label_of(names, cls[i]), int(cls[i]), float(cf[i]), x1, y1, x2, y2, polygon=poly))
    if getattr(res, "probs", None) is not None:
        p = res.probs
        top = [{"label": label_of(names, i), "index": int(i), "confidence": round(float(c), 4)}
               for i, c in zip(p.top5, p.top5conf.tolist())]
    elif dets:
        top = summarize_dets(dets)

    return finalize(base, task, names, len(names), latency, {
        "device": device_label_torch("cuda" if device == 0 else "cpu"),
        "detections": dets, "topClasses": top, "notes": notes,
        "preprocess": {"imgsz": [args.imgsz, args.imgsz] if args.imgsz > 0 else None,
                       "norm": NORM_LABELS["ultralytics"], "channels": 3,
                       "note": "Tiền xử lý chuẩn của Ultralytics (giống hệt khi chạy model.predict)"},
    })


# --------------------------------------------------------------------------- generic runner
class Runner:
    def __init__(self, forward, channels=3, layout="NCHW", fixed_hw=None, dtype="float32",
                 size_hint=None, default_norm="imagenet", mean_std=None, device_label="CPU", input_desc=None):
        self.forward = forward
        self.channels = channels
        self.layout = layout
        self.fixed_hw = fixed_hw
        self.dtype = dtype
        self.size_hint = size_hint
        self.default_norm = default_norm
        self.mean_std = mean_std
        self.device_label = device_label
        self.input_desc = input_desc


def run_with_runner(runner, args, img, names, base, notes):
    from PIL import Image
    norm = args.norm if args.norm and args.norm != "auto" else runner.default_norm
    if norm == "custom" and not runner.mean_std:
        norm = "imagenet"
    probe = img if img is not None else Image.new("RGB", (640, 480), (128, 128, 128))

    if runner.fixed_hw:
        sizes = [runner.fixed_hw]
    elif args.imgsz > 0:
        sizes = [(args.imgsz, args.imgsz)]
    else:
        cand = ([runner.size_hint] if runner.size_hint else []) + [s for s in SIZE_CANDIDATES if s != runner.size_hint]
        sizes = [(s, s) for s in cand]

    out, used, last_err = None, None, None
    for hw in sizes:
        x = preprocess(probe, hw, runner.channels, norm, runner.layout, runner.dtype, runner.mean_std)
        try:
            out = runner.forward(x)
            used = hw
            break
        except ModelError:
            raise
        except Exception as e:
            last_err = e
            if not looks_like_shape_error(e) or len(sizes) == 1:
                raise ModelError(f"Mô hình báo lỗi khi chạy với ảnh {hw[1]}x{hw[0]}: {type(e).__name__}: {e}")
    if out is None:
        raise ModelError("Không tìm được kích thước ảnh đầu vào phù hợp (đã thử "
                         f"{', '.join(str(s[0]) for s in sizes)}). Lỗi cuối: {last_err}. "
                         "Hãy nhập đúng kích thước ảnh lúc huấn luyện ở mục 'Tiền xử lý'.")

    task, nc = output_task(out, names)
    if names and task == "classification" and nc != len(names):
        notes.append(f"Mô hình có {nc} đầu ra nhưng danh sách nhãn có {len(names)} tên.")
    if not names:
        notes.append("Mô hình không lưu tên nhãn, kết quả hiển thị theo chỉ số lớp (Class i). "
                     "Có thể tải thêm file nhãn (.txt/.json) để hiển thị tên.")
    in_shape = (f"1 x {runner.channels} x {used[0]} x {used[1]}" if runner.layout == "NCHW"
                else f"1 x {used[0]} x {used[1]} x {runner.channels}")
    pre = {"imgsz": [used[0], used[1]], "norm": NORM_LABELS.get(norm, norm), "normKey": norm,
           "channels": runner.channels, "layout": runner.layout}
    if args.inspect:
        return inspect_payload(dict(base, preprocess=pre), task, names, nc, runner.input_desc or in_shape, notes)

    # timed run (second pass excludes CUDA/ORT warm-up)
    x = preprocess(img, used, runner.channels, norm, runner.layout, runner.dtype, runner.mean_std)
    t0 = time.time()
    out = runner.forward(x)
    latency = (time.time() - t0) * 1000

    extra = {"device": runner.device_label, "detections": [], "topClasses": [], "notes": notes,
             "preprocess": pre, "rawOutputShape": list(out.shape)}
    if task == "classification":
        extra["topClasses"] = classify_output(out, names)
    elif task == "segmentation":
        seg_png, stats, top, seg_names = segment_output(out, names, img.size)
        extra.update({"segMask": seg_png, "segStats": stats, "topClasses": top})
        names = names or seg_names
    else:
        dets = decode_yolo_raw(out, names, args.conf, args.iou, used)
        extra.update({"detections": dets, "topClasses": summarize_dets(dets)})
    return finalize(base, task, names, nc, latency, extra)


# --------------------------------------------------------------------------- torch
def to_numpy_output(out):
    import numpy as np
    import torch
    if isinstance(out, dict):
        for k in ("out", "logits", "pred", "preds", "output", "scores", "prob", "probs"):
            if k in out:
                return to_numpy_output(out[k])
        return to_numpy_output(next(iter(out.values())))
    if hasattr(out, "logits") and not torch.is_tensor(out):
        return to_numpy_output(out.logits)
    if isinstance(out, (list, tuple)):
        return to_numpy_output(out[0])
    if torch.is_tensor(out):
        return out.detach().float().cpu().numpy()
    return np.asarray(out, dtype=np.float32)


def first_conv_channels(module):
    try:
        for p in module.parameters():
            if p.ndim == 4:
                c = int(p.shape[1])
                return c if c in (1, 3) else 3
    except Exception:
        pass
    return 3


def ckpt_hints(obj):
    size, mean_std = None, None
    if isinstance(obj, dict):
        for k in ("img_size", "image_size", "input_size", "imgsz", "resolution"):
            v = obj.get(k)
            if isinstance(v, int):
                size = v
            elif isinstance(v, (list, tuple)) and v and isinstance(v[-1], int):
                size = int(v[-1])
            if size:
                break
        m, s = obj.get("mean"), obj.get("std")
        if isinstance(m, (list, tuple)) and isinstance(s, (list, tuple)):
            mean_std = (list(m), list(s))
    return size, mean_std


def torch_runner(module, size_hint=None, mean_std=None):
    import torch
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    try:
        module = module.float()
    except Exception:
        pass
    module.eval()
    try:
        module.to(device)
    except Exception:
        device = torch.device("cpu")
        module.to(device)
    state = {"device": device}

    def fwd(x):
        with torch.no_grad():
            try:
                out = module(torch.from_numpy(x).to(state["device"]))
            except RuntimeError as e:
                if "device" in str(e).lower() and state["device"].type == "cuda":
                    module.to("cpu")
                    state["device"] = torch.device("cpu")
                    out = module(torch.from_numpy(x))
                else:
                    raise
        return to_numpy_output(out)

    r = Runner(fwd, channels=first_conv_channels(module), size_hint=size_hint,
               default_norm="custom" if mean_std else ("imagenet" if first_conv_channels(module) == 3 else "zero_one"),
               mean_std=mean_std, device_label=device_label_torch(device))
    return r


def torch_load_any(path):
    import torch
    try:
        return "torchscript", torch.jit.load(path, map_location="cpu")
    except Exception:
        pass
    try:
        try:
            obj = torch.load(path, map_location="cpu", weights_only=False)
        except TypeError:
            obj = torch.load(path, map_location="cpu")
        return "pickle", obj
    except (AttributeError, ModuleNotFoundError, ImportError) as e:
        msg = str(e)
        hint = ""
        if "models" in msg and ("yolo" in msg.lower() or "No module named 'models'" in msg):
            hint = (" File có vẻ là YOLOv5 bản gốc (repo ultralytics/yolov5). Hãy export sang ONNX "
                    "(python export.py --include onnx) hoặc huấn luyện lại bằng gói ultralytics.")
        raise ModelError(
            "File được lưu bằng torch.save(model) nên cần mã nguồn class gốc mới mở được "
            f"({type(e).__name__}: {msg}).{hint} Cách khắc phục: export sang TorchScript "
            "(torch.jit.trace(model, x).save('model.pt')) hoặc ONNX (torch.onnx.export), "
            "hoặc lưu state_dict của một kiến trúc torchvision chuẩn.")
    except Exception as e:
        raise ModelError(f"Không mở được file PyTorch: {type(e).__name__}: {e}")


def is_ultralytics(obj):
    def mod(x):
        return type(x).__module__ or ""
    if isinstance(obj, dict):
        if "train_args" in obj:
            return True
        for k in ("model", "ema"):
            v = obj.get(k)
            if v is not None and mod(v).startswith("ultralytics"):
                return True
        return False
    return mod(obj).startswith("ultralytics")


def extract_state_dict(obj):
    import torch
    def is_sd(d):
        return isinstance(d, dict) and len(d) > 0 and all(torch.is_tensor(v) for v in d.values())
    if is_sd(obj):
        return obj
    if isinstance(obj, dict):
        for k in ("state_dict", "model_state_dict", "model_state", "model", "net", "weights", "params", "ema", "network"):
            if is_sd(obj.get(k)):
                return obj[k]
    return None


def strip_prefixes(sd):
    for pref in ("module.", "model.", "net.", "_orig_mod."):
        keys = list(sd.keys())
        if keys and all(k.startswith(pref) for k in keys):
            sd = {k[len(pref):]: v for k, v in sd.items()}
    return sd


TV_CLASSIFIERS = [
    "resnet18", "resnet34", "resnet50", "resnet101", "resnet152", "resnext50_32x4d", "resnext101_32x8d",
    "wide_resnet50_2", "mobilenet_v2", "mobilenet_v3_small", "mobilenet_v3_large",
    "efficientnet_b0", "efficientnet_b1", "efficientnet_b2", "efficientnet_b3", "efficientnet_b4",
    "efficientnet_v2_s", "vgg11", "vgg13", "vgg16", "vgg19", "vgg11_bn", "vgg13_bn", "vgg16_bn", "vgg19_bn",
    "alexnet", "densenet121", "densenet161", "densenet169", "densenet201", "squeezenet1_0", "squeezenet1_1",
    "shufflenet_v2_x0_5", "shufflenet_v2_x1_0", "mnasnet0_5", "mnasnet1_0", "regnet_y_400mf", "regnet_y_800mf",
    "convnext_tiny", "convnext_small", "vit_b_16", "vit_b_32", "swin_t",
]
TV_DETECTORS = ["fasterrcnn_resnet50_fpn", "fasterrcnn_resnet50_fpn_v2", "fasterrcnn_mobilenet_v3_large_fpn",
                "fasterrcnn_mobilenet_v3_large_320_fpn", "maskrcnn_resnet50_fpn", "retinanet_resnet50_fpn",
                "fcos_resnet50_fpn"]
TV_SEGMENTERS = ["deeplabv3_resnet50", "deeplabv3_resnet101", "deeplabv3_mobilenet_v3_large",
                 "fcn_resnet50", "fcn_resnet101", "lraspp_mobilenet_v3_large"]


def tv_kwargs(kind, name, sd):
    if kind == "classification":
        last_w = [k for k in sd.keys() if k.endswith(".weight")][-1]
        return {"num_classes": int(sd[last_w].shape[0])}
    if kind == "detection":
        if name.startswith(("fasterrcnn", "maskrcnn")):
            nc = int(sd["roi_heads.box_predictor.cls_score.weight"].shape[0])
        elif name.startswith("retinanet"):
            nc = int(sd["head.classification_head.cls_logits.weight"].shape[0]) // 9
        else:
            nc = int(sd["head.classification_head.cls_logits.weight"].shape[0])
        return {"num_classes": nc, "weights_backbone": None}
    if name.startswith("lraspp"):
        return {"num_classes": int(sd["classifier.low_classifier.weight"].shape[0]), "weights_backbone": None}
    return {"num_classes": int(sd["classifier.4.weight"].shape[0]), "weights_backbone": None,
            "aux_loss": any(k.startswith("aux_classifier") for k in sd)}


def match_torchvision(sd):
    import torch
    from torchvision import models as tvm
    norm_keys = {k for k in sd if not k.endswith("num_batches_tracked")}
    for kind, cands in (("classification", TV_CLASSIFIERS), ("detection", TV_DETECTORS), ("segmentation", TV_SEGMENTERS)):
        for name in cands:
            try:
                kw = tv_kwargs(kind, name, sd)
            except Exception:
                continue
            try:
                with torch.device("meta"):
                    meta = tvm.get_model(name, weights=None, **kw)
            except Exception:
                continue
            msd = meta.state_dict()
            mkeys = {k for k in msd if not k.endswith("num_batches_tracked")}
            if mkeys != norm_keys:
                continue
            if any(tuple(msd[k].shape) != tuple(sd[k].shape) for k in mkeys):
                continue
            model = tvm.get_model(name, weights=None, **kw)
            missing, unexpected = model.load_state_dict(sd, strict=False)
            if [m for m in missing if not m.endswith("num_batches_tracked")] or unexpected:
                continue
            return name, kind, model, kw["num_classes"]
    return None


def run_tv_detection(model, args, img, names, base, notes, nc):
    import numpy as np
    import torch
    import cv2
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.eval().to(device)
    # torchvision detection classes include background at index 0
    if names and len(names) == nc - 1:
        names = ["__background__"] + names
    if args.inspect:
        shown = [n for n in names if n != "__background__"] if names else []
        return inspect_payload(base, "detection", shown, nc - 1, "Ảnh RGB kích thước bất kỳ (tự resize nội bộ)", notes)
    x = torch.from_numpy(np.asarray(img).astype(np.float32) / 255.0).permute(2, 0, 1).to(device)
    with torch.no_grad():
        model([x])  # warm-up
        t0 = time.time()
        out = model([x])[0]
        latency = (time.time() - t0) * 1000
    w, h = img.size
    boxes = out["boxes"].cpu().numpy()
    scores = out["scores"].cpu().numpy()
    labels = out["labels"].cpu().numpy()
    masks = out.get("masks")
    masks = masks.cpu().numpy() if masks is not None else None
    dets = []
    for i in range(len(scores)):
        if scores[i] < args.conf:
            continue
        poly = None
        if masks is not None:
            m = (masks[i, 0] > 0.5).astype(np.uint8)
            cnts, _ = cv2.findContours(m, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
            if cnts:
                c = max(cnts, key=cv2.contourArea).reshape(-1, 2).astype(np.float32)
                poly = c / np.array([w, h], dtype=np.float32)
        x1, y1, x2, y2 = boxes[i]
        dets.append(make_det(len(dets), label_of(names, labels[i]), int(labels[i]), float(scores[i]),
                             x1 / w, y1 / h, x2 / w, y2 / h, polygon=poly))
    shown = [n for n in names if n != "__background__"] if names else [f"Class {i}" for i in range(1, nc)]
    return finalize(base, "detection", shown, nc - 1, latency, {
        "device": device_label_torch(device), "detections": dets, "topClasses": summarize_dets(dets),
        "notes": notes, "preprocess": {"imgsz": [h, w], "norm": "torchvision nội bộ (GeneralizedRCNNTransform)", "channels": 3},
    })


def run_tv_segmentation(model, args, img, names, base, notes, nc):
    import torch
    from PIL import Image
    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    model.eval().to(device)
    if args.inspect:
        return inspect_payload(base, "segmentation", names, nc, "1 x 3 x H x W (cạnh ngắn 520)", notes)
    w, h = img.size
    scale = 520.0 / min(w, h)
    size = (max(1, int(round(h * scale))), max(1, int(round(w * scale))))
    x = torch.from_numpy(preprocess(img, size, 3, "imagenet")).to(device)
    with torch.no_grad():
        model(x)
        t0 = time.time()
        out = to_numpy_output(model(x))
        latency = (time.time() - t0) * 1000
    seg_png, stats, top, seg_names = segment_output(out, names, img.size)
    return finalize(base, "segmentation", names or seg_names, nc, latency, {
        "device": device_label_torch(device), "detections": [], "topClasses": top, "segMask": seg_png,
        "segStats": stats, "notes": notes,
        "preprocess": {"imgsz": list(size), "norm": NORM_LABELS["imagenet"], "channels": 3},
    })


def handle_torch(args, img, labels, base):
    import torch
    kind, obj = torch_load_any(args.model)
    notes = []
    if kind == "torchscript":
        names = labels or find_names(obj)
        base = dict(base, framework="PyTorch TorchScript", architecture=getattr(obj, "original_name", "ScriptModule"))
        return run_with_runner(torch_runner(obj), args, img, names, base, notes)

    if is_ultralytics(obj):
        del obj
        return run_ultralytics(args, args.image, labels, dict(base, framework="Ultralytics YOLO (PyTorch)"))

    names = labels or find_names(obj)
    size_hint, mean_std = ckpt_hints(obj)
    module = obj if isinstance(obj, torch.nn.Module) else None
    if module is None and isinstance(obj, dict):
        for k in ("model", "ema", "net", "module", "network"):
            if isinstance(obj.get(k), torch.nn.Module):
                module = obj[k]
                break
    if module is not None:
        mod = type(module).__module__ or ""
        arch = type(module).__name__
        base = dict(base, framework="PyTorch (nn.Module)", architecture=arch)
        if mod.startswith("torchvision.models.detection"):
            nc = int(module.roi_heads.box_predictor.cls_score.out_features) if hasattr(module, "roi_heads") else len(names) + 1
            return run_tv_detection(module, args, img, names, base, notes, nc)
        if mod.startswith("torchvision.models.segmentation"):
            return run_tv_segmentation(module, args, img, names, base, notes, len(names) or 21)
        return run_with_runner(torch_runner(module, size_hint, mean_std), args, img, names, base, notes)

    sd = extract_state_dict(obj)
    if sd is None:
        desc = f"dict với các khóa {list(obj.keys())[:12]}" if isinstance(obj, dict) else type(obj).__name__
        raise ModelError(f"File PyTorch không chứa mô hình hay state_dict nhận dạng được (nội dung: {desc}).")
    sd = strip_prefixes(sd)
    match = match_torchvision(sd)
    if match is None:
        sample = ", ".join(list(sd.keys())[:6])
        raise ModelError(
            f"File chỉ chứa trọng số (state_dict, {len(sd)} tensor; ví dụ: {sample}) mà không kèm kiến trúc mạng, "
            "và không khớp với kiến trúc chuẩn nào của torchvision. Không thể chạy chính xác khi thiếu mã nguồn kiến trúc. "
            "Hãy export mô hình: TorchScript → torch.jit.trace(model.eval(), torch.randn(1,3,H,W)).save('model.pt') "
            "hoặc ONNX → torch.onnx.export(model, x, 'model.onnx').")
    name, task, model, nc = match
    base = dict(base, framework="PyTorch state_dict + torchvision", architecture=f"torchvision.{name}")
    notes.append(f"Đã nhận diện kiến trúc {name} từ cấu trúc trọng số (khớp 100% tên và kích thước tensor).")
    if task == "detection":
        return run_tv_detection(model, args, img, names, base, notes, nc)
    if task == "segmentation":
        return run_tv_segmentation(model, args, img, names, base, notes, nc)
    return run_with_runner(torch_runner(model, size_hint, mean_std), args, img, names, base, notes)


# --------------------------------------------------------------------------- onnx
def handle_onnx(args, img, labels, base):
    try:
        import onnxruntime as ort
    except ImportError:
        raise ModelError("Chưa cài onnxruntime. Chạy: pip install onnxruntime-gpu (hoặc onnxruntime).")
    avail = ort.get_available_providers()
    providers = [p for p in ("CUDAExecutionProvider", "CPUExecutionProvider") if p in avail]
    try:
        sess = ort.InferenceSession(args.model, providers=providers)
    except Exception:
        try:
            sess = ort.InferenceSession(args.model, providers=["CPUExecutionProvider"])
        except Exception as e:
            raise ModelError(f"Không mở được file ONNX: {e}")
    meta = sess.get_modelmeta()
    custom = dict(meta.custom_metadata_map or {})
    if "names" in custom and ("ultralytics" in custom.get("author", "").lower() or "stride" in custom):
        del sess
        return run_ultralytics(args, args.image, labels, dict(base, framework="Ultralytics YOLO (ONNX)"),
                               task_hint=custom.get("task"))

    names = labels or names_to_list(custom.get("names") or custom.get("classes") or custom.get("labels"))
    inp = sess.get_inputs()[0]
    shape = list(inp.shape)
    layout, channels, fixed = "NCHW", 3, None
    if len(shape) == 4:
        if shape[1] in (1, 3):
            channels = int(shape[1])
        elif shape[3] in (1, 3):
            layout, channels = "NHWC", int(shape[3])
        hh, ww = (shape[2], shape[3]) if layout == "NCHW" else (shape[1], shape[2])
        if isinstance(hh, int) and isinstance(ww, int) and hh > 0 and ww > 0:
            fixed = (hh, ww)
    elif len(shape) != 4:
        raise ModelError(f"Đầu vào ONNX có shape {shape}, ứng dụng chỉ hỗ trợ mô hình ảnh 4 chiều (N,C,H,W hoặc N,H,W,C).")
    dtype_map = {"tensor(float)": "float32", "tensor(float16)": "float16", "tensor(double)": "float64", "tensor(uint8)": "uint8"}
    dtype = dtype_map.get(inp.type, "float32")
    active = sess.get_providers()
    dev = "NVIDIA CUDA (ONNX Runtime)" if "CUDAExecutionProvider" in active else "CPU (ONNX Runtime)"

    def fwd(x):
        return sess.run(None, {inp.name: x})[0]

    runner = Runner(fwd, channels=channels, layout=layout, fixed_hw=fixed, dtype=dtype,
                    default_norm="raw255" if dtype == "uint8" else "imagenet", device_label=dev,
                    input_desc=" x ".join(str(s) for s in shape))
    base = dict(base, framework="ONNX Runtime", architecture=meta.graph_name or meta.producer_name or "ONNX graph")
    return run_with_runner(runner, args, img, names, base, [])


# --------------------------------------------------------------------------- tensorflow
def handle_tf(args, img, labels, base, ext):
    try:
        import tensorflow as tf
    except ImportError:
        raise ModelError(f"Máy chưa cài TensorFlow nên không chạy được file {ext}. "
                         "Cài bằng: pip install tensorflow, hoặc export mô hình sang ONNX.")
    names = labels
    if ext == ".tflite":
        interp = tf.lite.Interpreter(model_path=args.model)
        interp.allocate_tensors()
        idet, odet = interp.get_input_details()[0], interp.get_output_details()[0]
        shape = list(idet["shape"])
        dtype = "uint8" if idet["dtype"].__name__ == "uint8" else "float32"

        def fwd(x):
            interp.set_tensor(idet["index"], x)
            interp.invoke()
            return interp.get_tensor(odet["index"]).astype("float32")
        runner = Runner(fwd, channels=int(shape[3]), layout="NHWC", fixed_hw=(int(shape[1]), int(shape[2])),
                        dtype=dtype, default_norm="raw255" if dtype == "uint8" else "zero_one",
                        device_label="CPU (TFLite)", input_desc=" x ".join(str(s) for s in shape))
        return run_with_runner(runner, args, img, names, dict(base, framework="TensorFlow Lite", architecture="TFLite"), [])

    # Handle Keras .h5 or .keras model
    model = None
    try:
        model = tf.keras.models.load_model(args.model, compile=False)
    except Exception as e_primary:
        try:
            model = tf.keras.models.load_model(args.model, compile=False, safe_mode=False)
        except Exception:
            # Check if this is a weights-only HDF5 file
            try:
                import h5py
                with h5py.File(args.model, "r") as f:
                    attrs = list(f.attrs.keys())
                    if "model_config" not in attrs:
                        raise ModelError(
                            "File .h5 này chỉ chứa trọng số (weights-only HDF5), không kèm cấu trúc kiến trúc mạng Keras (thiếu 'model_config'). "
                            "Để chạy trực tiếp, hãy lưu toàn bộ mô hình bằng `model.save('model.h5')` hoặc `model.save('model.keras')`, "
                            "hoặc xuất sang định dạng ONNX.")
            except Exception as h5_err:
                if isinstance(h5_err, ModelError):
                    raise h5_err
            raise ModelError(f"Không thể nạp mô hình TensorFlow/Keras: {e_primary}")

    # Inspect input shape
    shape = None
    try:
        raw_shape = getattr(model, "input_shape", None)
        if isinstance(raw_shape, list) and len(raw_shape) > 0:
            shape = list(raw_shape[0])
        elif isinstance(raw_shape, tuple):
            shape = list(raw_shape)
    except Exception:
        pass

    fixed = None
    channels = 3
    if shape and len(shape) == 4:
        # NHWC: (None, H, W, C)
        h, w, c = shape[1], shape[2], shape[3]
        if isinstance(h, int) and isinstance(w, int) and h > 0 and w > 0:
            fixed = (h, w)
        if isinstance(c, int) and c in (1, 3):
            channels = c
    elif shape and len(shape) == 3:
        # (None, H, W) grayscale
        channels = 1
        h, w = shape[1], shape[2]
        if isinstance(h, int) and isinstance(w, int) and h > 0 and w > 0:
            fixed = (h, w)

    # Class names from model if available
    if not names:
        if hasattr(model, "class_names") and model.class_names:
            names = names_to_list(model.class_names)
        elif hasattr(model, "classes") and model.classes:
            names = names_to_list(model.classes)

    gpus = tf.config.list_physical_devices("GPU")
    dev = f"NVIDIA GPU (CUDA, {len(gpus)} device)" if gpus else "CPU (TensorFlow)"

    def fwd(x):
        out = model(x, training=False)
        if isinstance(out, (list, tuple)):
            out = out[0]
        elif isinstance(out, dict):
            out = next(iter(out.values()))
        if hasattr(out, "numpy"):
            return out.numpy()
        import numpy as np
        return np.asarray(out)

    runner = Runner(fwd, channels=channels, layout="NHWC", fixed_hw=fixed, default_norm="zero_one",
                    device_label=dev, input_desc=" x ".join(str(s) for s in shape) if shape else "NHWC")
    arch_name = getattr(model, "name", "Keras Model")
    return run_with_runner(runner, args, img, names, dict(base, framework="Keras (TensorFlow)", architecture=arch_name), [])


# --------------------------------------------------------------------------- main
def parse_args():
    p = argparse.ArgumentParser(description="AI Lab real model runner")
    p.add_argument("--model", required=True)
    p.add_argument("--image", default=None)
    p.add_argument("--conf", type=float, default=0.25)
    p.add_argument("--iou", type=float, default=0.45)
    p.add_argument("--imgsz", type=int, default=0)
    p.add_argument("--norm", default="auto")
    p.add_argument("--labels", default=None)
    p.add_argument("--name", default=None)
    p.add_argument("--task", default="auto")  # kept for backward compatibility (ignored: task comes from the model)
    p.add_argument("--inspect", action="store_true")
    return p.parse_args()


def main():
    args = parse_args()
    try:
        if not os.path.exists(args.model):
            raise ModelError(f"Không tìm thấy file mô hình: {args.model}")
        if not args.inspect and (not args.image or not os.path.exists(args.image)):
            raise ModelError("Không tìm thấy ảnh đầu vào.")
        labels = load_labels_file(args.labels) if args.labels and os.path.exists(args.labels) else []
        ext = os.path.splitext(args.model)[1].lower()
        base = {"modelName": args.name or os.path.basename(args.model),
                "sizeMB": round(os.path.getsize(args.model) / (1024 * 1024), 2)}
        img = None if args.inspect else load_image_rgb(args.image)

        if ext == ".onnx":
            result = handle_onnx(args, img, labels, base)
        elif ext in (".pt", ".pth", ".bin", ".ckpt", ".torchscript", ".ptl"):
            result = handle_torch(args, img, labels, base)
        elif ext in (".h5", ".keras", ".tflite"):
            result = handle_tf(args, img, labels, base, ext)
        elif ext == ".pb":
            raise ModelError("File .pb (frozen graph/SavedModel) chưa được hỗ trợ trực tiếp. Hãy chuyển sang ONNX bằng tf2onnx.")
        else:
            raise ModelError(f"Định dạng {ext} chưa được hỗ trợ.")
        emit(result)
    except ModelError as e:
        emit({"success": False, "error": str(e)})
    except Exception as e:
        tb = traceback.format_exc()
        print(tb, file=sys.stderr)
        emit({"success": False, "error": f"{type(e).__name__}: {e}", "details": tb[-2500:]})


if __name__ == "__main__":
    main()
