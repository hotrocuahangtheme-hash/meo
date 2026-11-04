"""Download Esri World Imagery tiles for a lon/lat box and reproject the mosaic to a linear lon/lat grid.
Usage: python3 tiles.py <out.jpg> <zoom> <west> <south> <east> <north> [max_px]
Writes <out.jpg> and <out.json> ({west,south,east,north,w,h}).
"""
import sys, math, json, io, os, time, urllib.request, concurrent.futures as cf
import numpy as np
from PIL import Image

URL = 'https://services.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
CACHE = os.environ.get('TILE_CACHE', '/tmp/tilecache')
os.makedirs(CACHE, exist_ok=True)


def lon2x(lon, z): return (lon + 180) / 360 * 2 ** z
def lat2y(lat, z):
    r = math.radians(lat)
    return (1 - math.log(math.tan(r) + 1 / math.cos(r)) / math.pi) / 2 * 2 ** z


def fetch(z, x, y):
    p = f'{CACHE}/{z}_{x}_{y}.jpg'
    if os.path.exists(p) and os.path.getsize(p) > 0:
        return p
    for attempt in range(5):
        try:
            req = urllib.request.Request(URL.format(z=z, x=x, y=y), headers={'User-Agent': 'aemod-video-renderer/1.0'})
            with urllib.request.urlopen(req, timeout=30) as r:
                data = r.read()
            with open(p, 'wb') as f:
                f.write(data)
            return p
        except Exception as e:
            time.sleep(1.5 * (attempt + 1))
    raise RuntimeError(f'tile failed {z}/{x}/{y}')


def main():
    out, z = sys.argv[1], int(sys.argv[2])
    west, south, east, north = map(float, sys.argv[3:7])
    max_px = int(sys.argv[7]) if len(sys.argv) > 7 else 8192
    x0, x1 = int(math.floor(lon2x(west, z))), int(math.floor(lon2x(east, z)))
    y0, y1 = int(math.floor(lat2y(north, z))), int(math.floor(lat2y(south, z)))
    jobs = [(z, x, y) for y in range(y0, y1 + 1) for x in range(x0, x1 + 1)]
    print(f'z{z}: {len(jobs)} tiles ({x1-x0+1}x{y1-y0+1})', flush=True)
    with cf.ThreadPoolExecutor(24) as ex:
        paths = list(ex.map(lambda j: fetch(*j), jobs))
    W, H = (x1 - x0 + 1) * 256, (y1 - y0 + 1) * 256
    mosaic = Image.new('RGB', (W, H))
    for (zz, x, y), p in zip(jobs, paths):
        try:
            mosaic.paste(Image.open(p).convert('RGB'), ((x - x0) * 256, (y - y0) * 256))
        except Exception:
            pass
    M = np.asarray(mosaic)
    # output grid: linear lon/lat; size from mercator pixel density at box center
    ppd_x = 256 * 2 ** z / 360.0
    ow = int(round((east - west) * ppd_x))
    yc = lat2y((north + south) / 2, z)
    ppd_y = abs(lat2y((north + south) / 2 + 0.01, z) - lat2y((north + south) / 2 - 0.01, z)) * 256 / 0.02
    oh = int(round((north - south) * ppd_y))
    scale = min(1.0, max_px / max(ow, oh))
    ow, oh = int(ow * scale), int(oh * scale)
    lons = west + (np.arange(ow) + 0.5) / ow * (east - west)
    lats = north - (np.arange(oh) + 0.5) / oh * (north - south)
    sx = (np.array([lon2x(l, z) for l in lons]) - x0) * 256 - 0.5
    sy = (np.array([lat2y(l, z) for l in lats]) - y0) * 256 - 0.5
    # bilinear sample
    X, Y = np.meshgrid(sx, sy)
    xi = np.clip(np.floor(X).astype(int), 0, W - 2); yi = np.clip(np.floor(Y).astype(int), 0, H - 2)
    fx = np.clip(X - xi, 0, 1)[..., None]; fy = np.clip(Y - yi, 0, 1)[..., None]
    Mf = M.astype(np.float32)
    o = (Mf[yi, xi] * (1 - fx) + Mf[yi, xi + 1] * fx) * (1 - fy) + (Mf[yi + 1, xi] * (1 - fx) + Mf[yi + 1, xi + 1] * fx) * fy
    Image.fromarray(np.clip(o, 0, 255).astype(np.uint8)).save(out, quality=92)
    json.dump({'west': west, 'south': south, 'east': east, 'north': north, 'w': ow, 'h': oh, 'zoom': z}, open(out.rsplit('.', 1)[0] + '.json', 'w'))
    print('wrote', out, ow, oh, flush=True)


if __name__ == '__main__':
    main()
