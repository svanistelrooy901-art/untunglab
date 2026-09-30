# Deploy UntungLab

Dua bahagian, dua tempat:

| Bahagian | Di mana | Kenapa |
|---|---|---|
| **Aplikasi** (fail statik PWA) | **Vercel atau Netlify** (pilih satu) | Sudah ada akaun; config siap dalam repo (`vercel.json`, `netlify.toml`) |
| **Pelayan lesen** (bayaran, kod, aktivasi) | **Cloudflare Worker + D1** | Kod pelayan ditulis untuk D1; ikut `server/README.md` |

Aplikasi berfungsi sendiri tanpa pelayan (versi percuma). Pelayan hanya perlu untuk jual dan aktifkan kod.

## A. Aplikasi di Vercel

1. Vercel → Add New → Project → import repo `svanistelrooy901-art/untunglab`.
2. Framework: Vite (auto). Build `npm run build`, output `dist` (sudah dalam `vercel.json`).
3. Environment Variables (Production), lepas pelayan siap:
   `VITE_LICENSE_PUBLIC_KEY`, `VITE_LICENSE_API_URL`, `VITE_BUY_URL` (lihat `server/README.md` langkah 8).
   Tanpa ketiga-tiganya, apl jadi versi percuma sahaja.
4. Deploy. Buka alamat `.vercel.app`, **Add to Home Screen** pada telefon.

## B. Aplikasi di Netlify

1. Netlify → Add new site → Import from Git → pilih repo.
2. Build `npm run build`, publish `dist` (sudah dalam `netlify.toml`, Node 22).
3. Site configuration → Environment variables: tiga pemboleh ubah `VITE_*` yang sama.
4. Deploy.

Pemboleh ubah `VITE_*` ditanam semasa build. Tukar nilai = deploy semula.

## C. Selepas ada alamat aplikasi

- Letak alamat itu (contoh `https://untunglab.vercel.app`, tanpa `/` di hujung) ke `APP_ORIGIN` dan `APP_URL` dalam `server/worker/wrangler.toml`, kemudian `wrangler deploy`. Jika berbeza walau satu huruf, pelayar akan menyekat aktivasi (CORS).
- Domain sendiri (contoh `app.digitalsambal.com`): tambah di Vercel/Netlify, kemudian kemas kini `APP_ORIGIN`/`APP_URL` dan deploy semula Worker.

## D. Ujian selepas deploy (5 minit)

1. Buka alamat pada telefon, tambah satu bahan, tutup dan buka semula: data kekal.
2. Aktifkan mod kapal terbang, buka semula app dari ikon: masih berfungsi.
3. Skrin Lesen: masukkan kod ujian sandbox, aktifkan, kemudian kapal terbang: masih "UntungLab Penuh".
4. Sandaran → Simpan sandaran: fail tersimpan / helaian kongsi muncul (iPhone: simpan ke Fail).
5. Kemas kini: deploy versi baharu, buka app dua kali; versi baharu muncul (service worker `autoUpdate`).

## Nota

- Router guna `#/` (HashRouter), jadi tiada peraturan rewrite diperlukan pada Vercel/Netlify.
- `sw.js` dan `index.html` ditetapkan `no-cache` supaya kemas kini sampai kepada pengguna; fail `/assets/` di-cache lama (nama fail berhash).
- Header keselamatan asas disertakan. Content-Security-Policy sengaja tidak dipasang lagi kerana `connect-src` bergantung pada alamat pelayan lesen anda; boleh ditambah selepas alamat muktamad.
- Konfigurasi ini belum diuji pada Vercel/Netlify sebenar (tiada akses dari persekitaran saya); pastikan langkah D lulus.
