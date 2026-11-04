"""Match a finer imagery mosaic to a coarser parent so zoom levels blend seamlessly:
1) global per-channel mean/std match, 2) low-frequency colour transfer (ratio of heavily blurred images,
clamped), keeping the fine layer's detail but the parent's regional tone. Usage: colormatch.py fine coarse [blur_m]"""
import sys, json
import numpy as np
from PIL import Image, ImageFilter

def load(n):
    return Image.open(n + '.jpg').convert('RGB'), json.load(open(n + '.json'))

fine_n, coarse_n = sys.argv[1], sys.argv[2]
blur_m = float(sys.argv[3]) if len(sys.argv) > 3 else 0
fi, fj = load(fine_n); ci, cj = load(coarse_n)
x0 = (fj['west'] - cj['west']) / (cj['east'] - cj['west']) * ci.width
x1 = (fj['east'] - cj['west']) / (cj['east'] - cj['west']) * ci.width
y0 = (cj['north'] - fj['north']) / (cj['north'] - cj['south']) * ci.height
y1 = (cj['north'] - fj['south']) / (cj['north'] - cj['south']) * ci.height
crop = ci.crop((int(round(x0)), int(round(y0)), int(round(x1)), int(round(y1))))
# metres per fine pixel (approx)
mpp = (fj['east'] - fj['west']) * 111320 * np.cos(np.radians((fj['north'] + fj['south']) / 2)) / fi.width
if blur_m <= 0:
    blur_m = max(400.0, 40 * mpp * (ci.width / max(1, (x1 - x0))) * (fi.width / ci.width) * 0 + 60 * (crop.width and (fi.width / crop.width)) * mpp)
small_w = max(8, int(fi.width * mpp / blur_m)); small_h = max(8, int(fi.height * mpp / blur_m))
F = np.asarray(fi).astype(np.float32) / 255
cs = np.asarray(crop.resize((small_w, small_h), Image.BOX)).astype(np.float32) / 255
fs = np.asarray(fi.resize((small_w, small_h), Image.BOX)).astype(np.float32) / 255
# 1) global match on non-cloud pixels
mask = (cs.max(-1) < 0.8) & (fs.max(-1) < 0.8)
G = F.copy(); fs2 = fs.copy()
for k in range(3):
    a, b = fs[..., k][mask], cs[..., k][mask]
    if a.size < 10: continue
    s = float(np.clip((b.std() + 1e-4) / (a.std() + 1e-4), 0.75, 1.35))
    G[..., k] = (F[..., k] - a.mean()) * s + b.mean()
    fs2[..., k] = (fs[..., k] - a.mean()) * s + b.mean()
# 2) low-frequency transfer
def soft(x):
    im = Image.fromarray((np.clip(x, 0, 1) * 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.5))
    return np.asarray(im.resize((fi.width, fi.height), Image.BILINEAR)).astype(np.float32) / 255
ratio = (soft(cs) + 0.03) / (soft(fs2) + 0.03)
ratio = np.clip(ratio, 0.72, 1.4)
out = np.clip(G * ratio, 0, 1)
Image.fromarray((out * 255).astype(np.uint8)).save(fine_n + '.jpg', quality=92)
print(f'{fine_n} <- {coarse_n}: blur {blur_m:.0f} m, small {small_w}x{small_h}')
