# JualanLab (adik UntungLab): nota awal untuk sesi baharu

Ini nota, bukan keputusan. Semua perkara bertanda **[Mamu tentukan]** belum diputuskan.

## Apa yang JualanLab perlu tahu tentang UntungLab
- Data UntungLab hanya dalam IndexedDB peranti (Dexie, skema v1). Tiada pelayan data, tiada log masuk. Origin app: `https://untunglab.space/`.
- Menu ada: nama, kategori (pilihan), harga jual seunit, hasil setiap batch, bahan, pembungkusan, peralatan, dan variasi (menu anak yang ikut menu asas). Kos sebenar dan untung dikira oleh enjin tulen `src/domain` (satu-satunya tempat formula).
- Lesen: kod `UL-XXXX-XXXX-XXXX`, token ECDSA yang disahkan di peranti, 2 peranti, pelayan Cloudflare Worker + D1 di `beli.untunglab.space`.
- Pengguna sasaran: peniaga makanan rumah Malaysia. BM dahulu, English pilihan.

## Cara menghubungkan dua app (pilihan untuk dibincang) [Mamu tentukan]
1. **Origin yang sama** (contoh `untunglab.space/jualan`): IndexedDB dikongsi, jadi POS boleh baca menu dan harga UntungLab terus. Paling mudah, tetapi dua app dalam satu pakej dan satu skema data.
2. **Origin berlainan + fail pindah** (eksport/import JSON seperti Backup): kekal berasingan, tiada risiko merosakkan data satu sama lain, tetapi pengguna perlu pindah data secara manual.
3. **Origin berlainan + penyegerakan awan**: paling lancar tetapi bertentangan dengan prinsip "tiada akaun, data kekal dalam peranti", dan memerlukan pelayan data, log masuk dan polisi privasi baharu.
Cadangan awal: bermula dengan pilihan 2 atau 1, kerana ia mengekalkan prinsip luar talian dan tanpa akaun.

## Soalan untuk skop JualanLab [Mamu tentukan]
- Fungsi POS minimum: senarai menu, bakul, bayaran tunai/QR/e-wallet, resit, rekod jualan harian?
- Adakah JualanLab guna harga jual dan kos daripada UntungLab, dan UntungLab pula guna isi padu jualan sebenar daripada JualanLab (gantikan Anggaran Jualan Bulanan)?
- Jual berasingan atau satu pakej? Satu kod lesen atau dua?
- Cetakan resit, pencetak Bluetooth, inventori bahan?

## Peraturan yang patut dikekalkan
Satu enjin kos, tiada tekaan angka, nombor negatif dengan tanda dan label, had percuma hanya menyekat penambahan, kemas kini app menunggu pengguna, dwibahasa sejak awal, ujian dahulu dan keputusan direkod dalam DECISIONS.md.
