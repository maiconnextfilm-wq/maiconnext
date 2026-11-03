"""
Recorta a pessoa do vídeo base (MediaPipe selfie_multiclass) para a órbita 3D.

Entrada : public/clip/base.mp4 (1080x1440)
Saídas  : public/clip/fg/0000.png ... (RGBA, só a pessoa)
          public/clip/track.json      (centro do rosto por frame, suavizado)

Uso: python3 scripts/recorte.py <caminho/selfie_multiclass_256x256.tflite>
Modelo: https://storage.googleapis.com/mediapipe-models/image_segmenter/selfie_multiclass_256x256/float32/latest/selfie_multiclass_256x256.tflite
"""
import json
import sys
from pathlib import Path

import cv2
import mediapipe as mp
import numpy as np
from mediapipe.tasks.python import BaseOptions
from mediapipe.tasks.python.vision import ImageSegmenter, ImageSegmenterOptions, RunningMode

root = Path(__file__).resolve().parent.parent
src = root / 'public/clip/base.mp4'
out_dir = root / 'public/clip/fg'
out_dir.mkdir(parents=True, exist_ok=True)

opts = ImageSegmenterOptions(
    base_options=BaseOptions(model_asset_path=sys.argv[1]),
    running_mode=RunningMode.VIDEO,
    output_confidence_masks=True,
    output_category_mask=False,
)
seg = ImageSegmenter.create_from_options(opts)  # noqa
cap = cv2.VideoCapture(str(src))
fps = cap.get(cv2.CAP_PROP_FPS) or 30
prev = None
faces = []
i = 0
while True:
    ok, bgr = cap.read()
    if not ok:
        break
    rgb = cv2.cvtColor(bgr, cv2.COLOR_BGR2RGB)
    res = seg.segment_for_video(mp.Image(image_format=mp.ImageFormat.SRGB, data=rgb), int(i * 1000 / fps))
    conf = [np.squeeze(m.numpy_view()).astype(np.float32) for m in res.confidence_masks]
    person = 1.0 - conf[0]
    face = conf[3]
    # suavização temporal + limpeza da borda
    person = person if prev is None else 0.65 * person + 0.35 * prev
    prev = person
    a = np.clip((person - 0.35) / 0.3, 0, 1)
    # mantém só a pessoa (maior região) e partes grandes ligadas a ela; remove ruído da mesa
    n, lab, stats, _ = cv2.connectedComponentsWithStats((a > 0.5).astype(np.uint8), 8)
    if n > 1:
        big = stats[1:, cv2.CC_STAT_AREA].max()
        keep = np.zeros(n, bool)
        keep[1:] = stats[1:, cv2.CC_STAT_AREA] > big * 0.08
        a = a * cv2.dilate(keep[lab].astype(np.uint8), np.ones((9, 9), np.uint8))
    a = cv2.GaussianBlur(a, (0, 0), 1.6)
    rgba = np.dstack([bgr, (a * 255).astype(np.uint8)])
    cv2.imwrite(str(out_dir / f'{i:04d}.png'), rgba, [cv2.IMWRITE_PNG_COMPRESSION, 3])
    ys, xs = np.nonzero(face > 0.5)
    faces.append([float(xs.mean()), float(ys.mean())] if len(xs) > 200 else None)
    i += 1

# preenche buracos e suaviza o rastreio do rosto
last = next(f for f in faces if f)
filled = []
for f in faces:
    last = f or last
    filled.append(last)
arr = np.array(filled)
k = 9
pad = np.pad(arr, ((k, k), (0, 0)), mode='edge')
smooth = np.array([pad[j:j + 2 * k + 1].mean(axis=0) for j in range(len(arr))])
(root / 'public/clip/track.json').write_text(json.dumps({'fps': fps, 'face': smooth.round(1).tolist()}))
print(f'{i} frames → {out_dir}')
seg.close()
