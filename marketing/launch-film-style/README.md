# UntungLab launch film style (Digital Sambal house style)

Reference: AdvisorLink Launch Film v2 (16:9, 1080p, ~66 s). Dark problem acts, light product acts, dark closer.

- **flask3d.html**: three.js (0.170, `npm i three`) glass Erlenmeyer flask, mint emissive liquid, $ plate, bubbles, Clippy-style eyes and brows
  (`setPose(kind, ry, rz, x)`, kinds: neutral, happy, wow). Needs headless Chromium with SwiftShader WebGL
  (`--use-gl=angle --use-angle=swiftshader --enable-unsafe-swiftshader --ignore-gpu-blocklist`).
- **phone-mock.html**: CSS 3D iPhone (titanium frame, Dynamic Island, glare, buttons, contact shadow), real app screenshot as the screen
  (390x844 at DSF3 from the e2e scripts), floating glass cards, gradient keyword headline.
- Paths inside the files point at /tmp working copies; copy the assets next to them first.
- Render deterministic frames with a `seek(t)` timeline (see marketing/video and marketing/video-brownies), mux with loudnormed audio.

## Storyboard (9 scenes, ~68 s)
`storyboard/storyboard-stills.html` builds all nine 1920x1080 still frames (`render-stills.mjs` screenshots each `.sc`);
`storyboard/storyboard-page.html` is the review page that was published (stills as JPEG data URIs plus timing, motion, flask line, sound).
Transparent flask poses come from `flask3d-transparent.html` + `flask3d-transparent-shot.mjs`.
Scene order: 1 Masalah (dark), 2 Kejutan (dark), 3 Peralihan (dark to light), 4 Bahan, 5 Kos Operasi, 6 Hasil, 7 Cadangan Harga, 8 Dashboard (light), 9 Penutup (dark).
