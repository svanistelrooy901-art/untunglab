import os, sys, time
from playwright.sync_api import sync_playwright
HERE = os.path.dirname(os.path.abspath(__file__)); HTML = "file://" + os.path.join(HERE, "scene.html")
W, H = 1080, 1920
mode = sys.argv[1]
with sync_playwright() as p:
    b = p.chromium.launch(args=["--allow-file-access-from-files"])
    pg = b.new_page(viewport={"width": W, "height": H}, device_scale_factor=1)   # viewport MUST equal canvas
    pg.goto(HTML)
    pg.evaluate("Promise.all([...document.fonts].map(f=>f.load())).then(()=>document.fonts.ready)")  # force-load fonts
    pg.wait_for_timeout(400)
    if mode == "stills":                       # python3 render.py stills 0.5 3 8 ...
        os.makedirs(f"{HERE}/qa", exist_ok=True)
        for ts in sys.argv[2:]:
            pg.evaluate(f"window.renderAt({float(ts)})"); pg.screenshot(path=f"{HERE}/qa/still_{float(ts):05.2f}.png")
    else:                                      # python3 render.py frames 60 30 [i0 i1]
        fps, dur = int(sys.argv[2]), float(sys.argv[3]); n = int(round(fps * dur))
        i0 = int(sys.argv[4]) if len(sys.argv) > 4 else 0; i1 = int(sys.argv[5]) if len(sys.argv) > 5 else n
        os.makedirs(f"{HERE}/frames", exist_ok=True); t0 = time.time()
        for i in range(i0, i1):
            pg.evaluate(f"window.renderAt({i / fps})")
            pg.screenshot(path=f"{HERE}/frames/{i:05d}.jpg", type="jpeg", quality=94)
            if i % 120 == 0: print(f"frame {i}/{n} {time.time()-t0:.0f}s", flush=True)
        print("frames done")
    b.close()
