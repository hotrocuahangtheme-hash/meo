#!/bin/bash
# encode.sh <frames_dir> <music.wav> <out.mp4>  — H.264 High, 30 fps, yuv420p, AAC 192k, faststart
set -e
FR="$1"; AU="$2"; OUT="$3"
ffmpeg -y -hide_banner -loglevel error -framerate 30 -i "$FR/f%05d.jpg" -i "$AU" \
  -c:v libx264 -preset slow -crf 19 -maxrate 14M -bufsize 28M -pix_fmt yuv420p -profile:v high -level 4.2 \
  -g 60 -bf 2 -movflags +faststart -c:a aac -b:a 192k -ar 48000 -shortest "$OUT"
ffprobe -v error -show_entries format=duration,size,bit_rate -show_entries stream=codec_name,width,height,r_frame_rate -of compact "$OUT"
