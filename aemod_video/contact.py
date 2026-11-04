"""Contact sheet: python3 contact.py out.jpg cols thumb_w frame1.jpg frame2.jpg ..."""
import sys
from PIL import Image, ImageDraw
out, cols, tw = sys.argv[1], int(sys.argv[2]), int(sys.argv[3])
files = sys.argv[4:]
ims = [Image.open(f).convert('RGB') for f in files]
th = int(tw * ims[0].height / ims[0].width)
rows = (len(ims) + cols - 1) // cols
sheet = Image.new('RGB', (cols * tw + (cols + 1) * 6, rows * (th + 24) + 6), (20, 20, 20))
d = ImageDraw.Draw(sheet)
for i, (f, im) in enumerate(zip(files, ims)):
    x, y = 6 + (i % cols) * (tw + 6), 6 + (i // cols) * (th + 24)
    sheet.paste(im.resize((tw, th), Image.LANCZOS), (x, y))
    d.text((x + 4, y + th + 4), f.split('/')[-1], fill=(220, 220, 220))
sheet.save(out, quality=88)
