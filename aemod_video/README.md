# AERMOD 3D — video pipeline

Tạo 2 video 3D (2 phút, bản 16:9 và 9:16) giới thiệu ứng dụng web AERMOD (bản đồ lan truyền ô nhiễm không khí).
Thư mục này chỉ chứa **mã**; ảnh vệ tinh, dữ liệu và khung hình nằm ngoài repo (biến `AEMOD_SCRATCH`).

| Bước | Script | Ghi chú |
|---|---|---|
| 1. Chụp / sao chép trang | `capture.cjs`, `mirror.cjs`, `appshots.cjs` | Playwright; ẩn thanh bên trái (`.panel`) khi chụp giao diện |
| 2. Ảnh nền | `tiles.py`, `colormatch.py` | Ghép tile theo nhiều mức zoom, chiếu về lưới kinh/vĩ độ, cân màu mức mịn theo mức thô |
| 3. Nhạc | `music.py v1|v2 out.wav` | Tổng hợp bằng numpy (96 / 120 BPM, đúng 120 s) |
| 4. Render | `render.cjs --story v1 --w 1920 --h 1080 --out DIR` | Three.js trong Chromium (Xvfb + Mesa llvmpipe), xuất JPEG từng khung |
| 5. Ghép | `encode.sh DIR music.wav out.mp4` | H.264 30 fps + AAC |

Engine (`engine/`): `geo.js` (WGS84/ECEF/ENU, camera kiểu Cesium), `data.js` (giải mã lưới u16 và vẽ lớp nồng độ
giống hệt ứng dụng: thang % QCVN, dải màu, đường đồng mức), `world.js` (địa cầu, địa hình nhiều mức ảnh, khí quyển,
ống khói, khói, cột 3D, cửa sổ trình duyệt), `overlay.js` (chữ, chú giải, HUD), `stories/v1.js`, `stories/v2.js` (kịch bản).
