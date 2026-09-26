#!/bin/zsh
# Poster → frame 0, encode, loudness-normalise (two-pass), mux. Run from brag-output/work.
set -euo pipefail
POSTER_FRAME=${1:-0108}
cp -n frames/f0000.jpg frames/f0000-original.jpg 2>/dev/null || true
cp "frames/f${POSTER_FRAME}.jpg" ../brag.jpg
cp "frames/f${POSTER_FRAME}.jpg" frames/f0000.jpg

# Pass 1: measure loudness.
measured=$(ffmpeg -hide_banner -nostats -i audio.wav -af loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json -f null - 2>&1 | sed -n '/^{/,/^}/p')
mi=$(print -r -- "$measured" | sed -n 's/.*"input_i" : "\(.*\)",/\1/p')
mtp=$(print -r -- "$measured" | sed -n 's/.*"input_tp" : "\(.*\)",/\1/p')
mlra=$(print -r -- "$measured" | sed -n 's/.*"input_lra" : "\(.*\)",/\1/p')
mth=$(print -r -- "$measured" | sed -n 's/.*"input_thresh" : "\(.*\)",/\1/p')
off=$(print -r -- "$measured" | sed -n 's/.*"target_offset" : "\(.*\)"/\1/p')
echo "measured I=$mi TP=$mtp LRA=$mlra thresh=$mth offset=$off"

# Pass 2: encode video + normalised audio.
ffmpeg -hide_banner -loglevel error -y \
  -framerate 30 -i frames/f%04d.jpg -i audio.wav \
  -af "loudnorm=I=-14:TP=-1.5:LRA=11:measured_I=${mi}:measured_TP=${mtp}:measured_LRA=${mlra}:measured_thresh=${mth}:offset=${off}:linear=true,alimiter=limit=0.794:level=false,aresample=48000" \
  -map 0:v:0 -map 1:a:0 \
  -c:v libx264 -preset slow -crf 18 -pix_fmt yuv420p -profile:v high -r 30 \
  -c:a aac -b:a 192k -movflags +faststart -shortest \
  ../brag.mp4
ffprobe -v error -show_entries format=duration:stream=codec_name,width,height,r_frame_rate,nb_frames -of compact=p=0 ../brag.mp4
