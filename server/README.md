# Pelayan lesen UntungLab (Cloudflare Worker + D1)

Satu Worker kecil yang: (1) cipta bil ToyyibPay, (2) terima callback bayaran dan sahkan, (3) keluarkan kod lesen,
(4) hantar kod melalui Brevo, (5) aktifkan peranti dan tandatangan token yang disahkan aplikasi tanpa internet.

Kenapa Cloudflare? ToyyibPay hanya boleh memanggil alamat awam (callback). Aplikasi UntungLab ialah fail statik
tanpa pelayan, jadi perlu satu tempat kecil yang selamat memegang **kunci rahsia ToyyibPay dan kunci tandatangan lesen**.
Worker + D1 percuma untuk skala permulaan (had percuma Cloudflare berubah dari masa ke masa, semak sendiri).

## Apa yang ada dalam repo ini vs apa yang anda perlu buat

| Sudah siap dan diuji | Anda perlu buat (saya tak boleh) |
|---|---|
| Logik pelayan diuji dengan ToyyibPay/Brevo palsu dan SQL sebenar (SQLite) | Buat akaun Cloudflare, cipta D1, deploy Worker |
| Semakan hash callback + pengesahan semula bayaran + kod idempoten | Ujian sandbox ToyyibPay (bentuk permintaan belum disahkan dengan API sebenar) |
| Aplikasi mengesahkan token luar talian | Sahkan sender Brevo, letak kunci rahsia |

## Langkah deploy

Prasyarat: Node 20+, `npm i -g wrangler`, `wrangler login`.

1. **Kunci tandatangan** (sekali sahaja):
   `node server/scripts/gen-keys.mjs`
   - KUNCI PRIVAT: simpan salinan selamat (password manager). Jika hilang, semua lesen perlu dikeluarkan semula.
   - KUNCI AWAM: untuk binaan aplikasi (`VITE_LICENSE_PUBLIC_KEY`).
2. **Pangkalan data**: `cd server/worker && wrangler d1 create untunglab-license`, salin `database_id` ke `wrangler.toml`,
   kemudian `wrangler d1 execute untunglab-license --remote --file=schema.sql`.
3. **Tetapan** dalam `wrangler.toml` (`[vars]`): `TOYYIB_CATEGORY` (kod kategori ToyyibPay), `PUBLIC_BASE_URL` (alamat Worker),
   `APP_ORIGIN` dan `APP_URL` (tempat aplikasi dihoskan), `BREVO_SENDER_EMAIL` (mesti sender yang telah disahkan di Brevo).
   `PRICE_SEN = "4900"` ialah harga (RM49). `EARLY_BIRD_PRICE_SEN = "3900"` dan `EARLY_BIRD_SLOTS = "15"`: RM39 untuk 15 pembeli (berbayar) pertama (D-80); `"0"` untuk matikan. Tukar di sini untuk tukar harga; tiada kemas kini aplikasi diperlukan.
4. **Rahsia** (tidak pernah dalam fail): `wrangler secret put TOYYIB_SECRET`, `LICENSE_PRIVATE_KEY` (tampal JSON kunci privat),
   `ADMIN_TOKEN` (rentetan rawak panjang), `BREVO_API_KEY`.
5. `wrangler deploy`
6. **Ujian sandbox** (WAJIB sebelum jual): biarkan `TOYYIB_BASE_URL=https://dev.toyyibpay.com` dan guna kunci/kategori sandbox.
   Set `PRICE_SEN=100` dan `EARLY_BIRD_SLOTS=0` sementara. Buka `<PUBLIC_BASE_URL>/beli`, bayar bil sandbox, dan pastikan:
   - kod tiba di emel (semak juga folder spam),
   - `/terima` memaparkan kod,
   - kod boleh diaktifkan dalam aplikasi,
   - bayar dua kali tidak keluarkan dua kod untuk satu pesanan.
   Jika ToyyibPay menolak permintaan atau bentuk balasan berbeza, ubah `server/core/toyyibpay.ts` sahaja (ada ujian).
   Rumus hash callback (`md5(secret + status + order_id + refno + "ok")`) juga perlu disahkan dengan dokumentasi/sandbox semasa.
7. **Produksi**: tukar `TOYYIB_BASE_URL=https://toyyibpay.com`, kunci dan kategori produksi, `PRICE_SEN=4900`, `EARLY_BIRD_SLOTS=15`, deploy semula.
8. **Aplikasi**: bina dengan
   `VITE_LICENSE_PUBLIC_KEY='<json kunci awam>' VITE_LICENSE_API_URL='<PUBLIC_BASE_URL>' VITE_BUY_URL='<PUBLIC_BASE_URL>/beli' npm run build`
   Tanpa tiga pemboleh ubah ini aplikasi berjalan sebagai versi percuma dan skrin Lesen menyatakan aktivasi belum tersedia.

## Operasi harian (admin)

**Cara paling mudah: papan pemuka admin.** Buka `https://beli.untunglab.space/admin`, masukkan `ADMIN_TOKEN` sekali. Ada ringkasan (pesanan, pengguna yang dah bayar, jumlah RM, lesen aktif/dibatalkan, peranti), carian emel/kod, dan butang Batalkan, Pulihkan, Hantar semula emel, Reset peranti. Token hanya dalam memori halaman (tutup tab = hilang). Halaman tak disenaraikan (noindex) dan tak mengandungi rahsia; data hanya keluar bila token betul.

Pautan iklan boleh ditanda `https://beli.untunglab.space/beli?src=fb` (huruf kecil/nombor/-/_, maks 20); jadual "Dari mana pembeli datang" mengira klik beli dan bayaran ikut sumber.

Sebelum deploy versi dengan jadual baharu (`order_meta`, `admin_log`), jalankan `schema.sql` pada D1 (selamat diulang; hanya menambah): `wrangler d1 execute untunglab-license --remote --file=schema.sql`.

Cara curl (sama sahaja di belakang tabir):

Semua guna `Authorization: Bearer <ADMIN_TOKEN>` dan `POST`, JSON `{"code":"UL-...."}`:

| Tujuan | Endpoint |
|---|---|
| Semak kod, peranti, pesanan | `/api/admin/lookup` |
| Hantar semula emel kod | `/api/admin/resend` |
| Kosongkan peranti (pelanggan tukar telefon dan tak boleh lepaskan sendiri) | `/api/admin/reset-devices` |
| Batalkan kod (refund/penyalahgunaan) | `/api/admin/revoke` |
| Pulihkan kod yang tersalah batal | `/api/admin/restore` |
| Jualan 30 hari, sumber pembeli, belum aktif, emel belum hantar | `/api/admin/insights` |
| Nota pada pesanan (`{orderId, note}`) | `/api/admin/note` |
| Log 50 tindakan admin terkini | `/api/admin/log` |
| CSV semua pembeli (ada emel & telefon; jaga elok) | `/api/admin/export` |
| Jana kod percuma (RM0) untuk akaun sendiri/tester, body `{"name":..,"email":..}` | `/api/admin/issue` |
| Ringkasan + 25 pesanan terkini (tanpa no. telefon) | `/api/admin/stats` |

Contoh: `curl -X POST $BASE/api/admin/revoke -H "Authorization: Bearer $ADMIN_TOKEN" -H 'content-type: application/json' -d '{"code":"UL-ABCD-EFGH-JKMN"}'`

**Dasar refund (D-63)**: 7 hari, manual. Refund dibuat sendiri (bank transfer / DuitNow ke pembeli), kemudian `revoke` di /admin. Batal menghalang aktivasi baharu;
peranti yang sudah diaktifkan terus berfungsi luar talian (tiada cara untuk menarik balik token dari peranti tanpa internet, dan itu dipilih dengan sengaja).

## Keselamatan

- Callback ToyyibPay tidak pernah dipercayai sendirian: hash mesti sah **dan** ToyyibPay ditanya semula (pesanan, status bayar, jumlah).
- Kod: 12 aksara daripada 30, ~59 bit; 10 percubaan gagal sejam setiap IP, kemudian disekat.
- Token: ECDSA P-256; aplikasi hanya ada kunci awam, jadi tiada siapa boleh menjana lesen dari aplikasi.
- Had jujur: aplikasi berjalan sepenuhnya di peranti, jadi pengguna yang mahir boleh memintas had percuma dengan alat pembangun.
  Sekatan ini untuk pengguna biasa, bukan DRM. Lihat DECISIONS D-58.

## Pelawat di /admin (Cloudflare Web Analytics, D-93)

1. Cloudflare → **Analytics & Logs → Web Analytics → Add a site**, hostname `untunglab.space`. Jika ditanya, **jangan** hidupkan automatic setup; salin `token` daripada JS snippet.
2. Token itu (bukan rahsia) masuk ke `CF_BEACON_TOKEN` dalam `wrangler.toml` dan `VITE_CF_BEACON_TOKEN` dalam `.github/workflows/pages.yml`. Account ID masuk ke `CF_ACCOUNT_ID`.
3. Cipta API token: My Profile → API Tokens → Create Token → Custom, kebenaran **Account → Account Analytics → Read** untuk akaun anda sahaja.
4. Workers & Pages → `untunglab` → Settings → Variables and Secrets → Add → jenis **Secret**, nama `CF_ANALYTICS_TOKEN`, tampal token. (Atau `wrangler secret put CF_ANALYTICS_TOKEN`.)
5. Deploy Worker dan app seperti biasa. Data mula masuk selepas pelawat pertama; buka /admin → kad Pelawat.

