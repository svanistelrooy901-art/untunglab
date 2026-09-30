# UntungLab: nota serahan

## Apa ini
PWA pengiraan kos dan untung untuk perniagaan makanan rumah. Bahasa Melayu dahulu, berfungsi luar talian, tiada log masuk, data kekal dalam peranti (sandaran ialah satu-satunya salinan luar). Dijual sekali bayar melalui kod lesen.

## Peta kod
| Folder | Isi |
|---|---|
| `src/domain` | Enjin kos tulen (satu-satunya tempat formula). Dikawal oleh ujian seni bina: tiada React/storan di sini. |
| `src/db` | Dexie (IndexedDB): skema, repo, sandaran/pulihkan, lesen. |
| `src/app` | Skrin, laluan, Laporan, had percuma. |
| `src/license` | Kod lesen, token luar talian, had percuma. |
| `server` | Pelayan lesen (Cloudflare Worker + D1). |
| `docs/qa` | Bukti QA setiap fasa, jejak ujian, senarai semak telefon. |
| `DECISIONS.md` | Semua keputusan (D-01 hingga D-69) dan sebabnya. |

## Peraturan yang tidak boleh dilanggar
1. Satu enjin kos. Skrin tidak mengira formula sendiri.
2. Kos tidak disimpan pada baris; sumber hidup sentiasa menang.
3. Tiada tekaan: input yang hilang dinamakan, bukan diisi sifar.
4. Jejak Harga tidak boleh diubah atau dipadam (kecuali semasa pulihkan penuh).
5. Nombor negatif dipaparkan dengan tanda −, ikon dan label, bukan warna sahaja.
6. Had percuma hanya menyekat penambahan; data sedia ada tidak dipadam dan nombor tidak berubah mengikut pelan.

## Perintah
`npm run dev` · `npm test` · `npm run typecheck` · `npm run typecheck:server` · `npm run build`
Semakan pelayar: `scripts/e2e-build.sh` kemudian `scripts/e2e-phase*.mjs` (lihat komen di atas setiap skrip).
Ujian mutasi: `node scripts/mutation-check.mjs` (`ONLY=regex` untuk sebahagian).

## Operasi
- Harga: `PRICE_SEN` dalam `server/worker/wrangler.toml`.
- Batal/reset/cari kod: `server/README.md` (bahagian admin).
- Deploy: `DEPLOY.md`.

## Kerja yang masih menjadi milik anda
Akaun dan deploy (Cloudflare, Vercel/Netlify), ujian sandbox ToyyibPay, pengesahan sender Brevo, ujian telefon sebenar (`docs/qa/manual-phone-checklist.md`), teks halaman jualan dan terma (termasuk dasar refund 7 hari dan makna "selamanya").

## Di luar skop V1 (Doc 07)
Senarai Harga untuk pelanggan, laporan lebih kaya, pemetaan rujukan pasaran, Pencari Bahan, pembolehubah senario lanjutan (isi padu/bahagian/pembaziran), sync awan, log masuk, langganan.
