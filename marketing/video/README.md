Launch video generator (HTML timeline + Playwright frames + numpy audio + ffmpeg).
Run: python3 build_video.py; node render.mjs 0 1350 frames; python3 audio.py; ffmpeg -framerate 30 -i frames/%05d.jpg -i audio.wav -c:v libx264 -crf 17 -pix_fmt yuv420p -c:a aac -shortest out.mp4
