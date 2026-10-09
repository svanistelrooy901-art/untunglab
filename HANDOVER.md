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
- Harga: `PRICE_SEN` dalam `server/worker/wrangler.toml`. Sebelum jual: PRICE_SEN=4900, EARLY_BIRD_SLOTS=15, kunci lesen baharu (`server/PUBLIC_KEY.json`, `pages.yml`), kunci Brevo baharu, `ADMIN_TOKEN` panjang, ToyyibPay live.
- Batal/reset/cari kod: `server/README.md` (bahagian admin).
- Deploy: `DEPLOY.md`.

## Kerja yang masih menjadi milik anda
Akaun dan deploy (Cloudflare, Vercel/Netlify), ujian sandbox ToyyibPay, pengesahan sender Brevo, ujian telefon sebenar (`docs/qa/manual-phone-checklist.md`), teks halaman jualan dan terma (termasuk dasar refund 7 hari dan makna "selamanya").

## Di luar skop V1 (Doc 07)
Senarai Harga untuk pelanggan, kos pekerja penuh (KWSP/PERKESO), laporan lebih kaya, pemetaan rujukan pasaran, Pencari Bahan, pembolehubah senario lanjutan (isi padu/bahagian/pembaziran), sync awan, log masuk, langganan.
