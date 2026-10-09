# UntungLab: nota serahan

## Apa ini
PWA pengiraan kos dan untung untuk perniagaan makanan rumah. Dwibahasa (BM lalai, English di Tetapan), berfungsi luar talian, tiada log masuk, data kekal dalam peranti (sandaran ialah satu-satunya salinan luar). Dijual sekali bayar melalui kod lesen.

## Peta kod
| Folder | Isi |
|---|---|
| `src/domain` | Enjin kos tulen (satu-satunya tempat formula). Dikawal oleh ujian seni bina: tiada React/storan di sini. |
| `src/db` | Dexie (IndexedDB): skema, repo, sandaran/pulihkan, lesen. |
| `src/app` | Skrin, laluan, Laporan, had percuma. |
| `src/license` | Kod lesen, token luar talian, had percuma. |
| `server` | Pelayan lesen (Cloudflare Worker + D1). |
| `docs/qa` | Bukti QA setiap fasa, jejak ujian, senarai semak telefon. |
| `manual` | Pembina manual PDF dwibahasa (`content.mjs` ialah teks BM/EN berpasangan), `capture/all.mjs` ambil gambar skrin. |
| `DECISIONS.md` | Semua keputusan (D-01 hingga D-89) dan sebabnya. |

## Peraturan yang tidak boleh dilanggar
1. Satu enjin kos. Skrin tidak mengira formula sendiri.
2. Kos tidak disimpan pada baris; sumber hidup sentiasa menang.
3. Tiada tekaan: input yang hilang dinamakan, bukan diisi sifar.
4. Jejak Harga tidak boleh diubah atau dipadam (kecuali semasa pulihkan penuh).
5. Nombor negatif dipaparkan dengan tanda −, ikon dan label, bukan warna sahaja.
6. Had percuma hanya menyekat penambahan; data sedia ada tidak dipadam dan nombor tidak berubah mengikut pelan.
7. Keenam-enam kategori Kos Operasi wajib diisi (RM0 dikira sebagai diisi). Elektrik peralatan hanya dikira bila Elektrik ialah Kira Lebih Tepat (D-70, D-71). Versi percuma ada semua fungsi, hanya had bilangan: 2 menu, 10 bahan, 2 pembungkusan, 3 kos lain (D-77, D-84). Variasi menu dan import Excel ialah ciri versi penuh sahaja (D-86, D-87).
8. Kos masa: kerja sendiri guna Nilai Masa; ada pekerja guna kadar sejam pasukan = jumlah gaji ÷ jumlah jam (D-85). Gaji sahaja, tanpa KWSP/PERKESO majikan (D-88).
9. Kemas kini app menunggu pengguna (banner Muat semula), tidak reload sendiri (D-89).

## Perintah
`npm run dev` · `npm test` · `npm run typecheck` · `npm run typecheck:server` · `npm run build`
Semakan pelayar: `scripts/e2e-build.sh` kemudian `scripts/e2e-*.mjs` (lihat komen di atas setiap skrip; `PW_ROOT`, `APP_URL`, `E2E_KEYS=/tmp/e2e-keys.json`).
Manual PDF: `npx tsx manual/build.mjs` (BM + EN) selepas `LANG_CODE=ms|en npx tsx manual/capture/all.mjs` dan tukar PNG ke JPG dalam `manual/shots` / `shots-en`.
Ujian mutasi: `node scripts/mutation-check.mjs` (`ONLY=regex` untuk sebahagian).

## Operasi
**Status: LIVE sejak 2026-10-10.** Semua ujian lulus (beli sebenar, emel kod, aktivasi telefon, kod percuma).
- Harga: RM49 (`PRICE_SEN=4900`), early bird RM39 untuk 15 pembeli berbayar pertama (`EARLY_BIRD_PRICE_SEN=3900`, `EARLY_BIRD_SLOTS=15`) dalam `server/worker/wrangler.toml`. Tukar harga: edit, deploy Worker, tiada kemas kini app.
- ToyyibPay live, hanya FPX (`billPaymentChannel '0'`). Kad belum dibuka (tukar ke `'2'` jika diaktifkan di ToyyibPay).
- Kunci lesen produksi baharu (D-90 era): kunci awam dalam `server/PUBLIC_KEY.json` dan `.github/workflows/pages.yml`; kunci privat hanya sebagai secret `LICENSE_PRIVATE_KEY` di Cloudflare dan dalam password manager pemilik. Jika kunci hilang, semua lesen perlu dikeluarkan semula.
- Secret di Cloudflare: `TOYYIB_SECRET`, `LICENSE_PRIVATE_KEY`, `ADMIN_TOKEN`, `BREVO_API_KEY` (tidak boleh dibaca balik, hanya ditimpa).
- **Papan pemuka admin**: `https://beli.untunglab.space/admin` (D-90, D-91). Masukkan `ADMIN_TOKEN` (disimpan dalam memori halaman sahaja). Ringkasan pesanan/pengguna/RM/lesen/peranti/early bird; cari ikut emel atau kod; Batalkan, Pulihkan, Hantar semula emel, Reset peranti; **Jana kod percuma** (RM0, tidak guna slot early bird, tidak dikira dalam RM). Dua kod percuma digunakan untuk akaun ujian pemilik.
- Refund: manual dalam 7 hari (bank transfer / DuitNow ke pembeli), kemudian Batalkan di /admin. Batal hanya menyekat aktivasi baharu; peranti yang sudah aktif terus berfungsi luar talian (D-63). Semakan berkala ditangguh (keputusan pemilik: kekal buat masa ini).
- Pangkalan data: D1 `untunglab-license` (jadual orders, licenses, devices, failures; `server/worker/schema.sql`).
- Batal/reset/cari kod melalui curl: `server/README.md` (bahagian admin). Deploy: `DEPLOY.md`.

## Kerja yang masih menjadi milik anda
Pantau pesanan awal di /admin (emel kod sampai, early bird berkurang betul), maklum balas Android (masalah "Loading" telah dibaiki secara defensif, belum disahkan pada peranti pelanggan), keputusan membuka bayaran kad, dan jika perlu semakan berkala untuk lesen yang dibatalkan.

## Di luar skop V1 (Doc 07)
Senarai Harga untuk pelanggan, kos pekerja penuh (KWSP/PERKESO), laporan lebih kaya, pemetaan rujukan pasaran, Pencari Bahan, pembolehubah senario lanjutan (isi padu/bahagian/pembaziran), sync awan, log masuk, langganan.
