/**
 * Builds the UntungLab user manual (Bahasa Melayu) to public/manual/UntungLab-Manual.pdf.
 *   npx tsx manual/build.mjs
 * Screens in manual/shots are real captures of the app (see manual/capture). Every number in the worked example
 * comes from the app's own engine; nothing is typed in by hand.
 */
import { createRequire } from 'node:module';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { INSTALL_MOCKS } from '../server/core/sales.ts';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.join(here, '..');
const require = createRequire(process.env.PW_ROOT ? process.env.PW_ROOT + '/' : '/home/claude/.npm-global/lib/node_modules/');
const { chromium } = require('playwright');

const VERSION = 'Versi 1.0 · Oktober 2026';
const b64 = (f) => fs.readFileSync(path.join(here, 'shots', f)).toString('base64');
const logoB64 = fs.readFileSync(path.join(root, 'public', 'logo-penuh.png')).toString('base64');
const fontB64 = fs.readFileSync(path.join(root, 'node_modules/@fontsource-variable/inter/files/inter-latin-wght-normal.woff2')).toString('base64');

let figNo = 0;
/** A phone screenshot with a caption and an optional numbered legend that matches the red markers on the picture. */
const fig = (file, caption, legend = []) => {
  figNo += 1;
  return `<figure><div class="ph"><img src="data:image/jpeg;base64,${b64(file + '.jpg')}"></div>
<figcaption><b>Rajah ${figNo}.</b> ${caption}${legend.length ? `<ol class="lg">${legend.map((l, i) => `<li><i>${i + 1}</i><span>${l}</span></li>`).join('')}</ol>` : ''}</figcaption></figure>`;
};
const figs = (...f) => `<div class="figs n${f.length}">${f.join('')}</div>`;
const tip = (t) => `<div class="call tip"><b>Tip</b>${t}</div>`;
const warn = (t) => `<div class="call warn"><b>Perhatian</b>${t}</div>`;
const note = (t) => `<div class="call note"><b>Ingat</b>${t}</div>`;
const steps = (...s) => `<ol class="st">${s.map((x) => `<li>${x}</li>`).join('')}</ol>`;
const chapters = [];
const chapter = (id, title, lead, body) => {
  chapters.push([id, title]);
  const n = chapters.length;
  return `<section class="chap" id="${id}"><header class="ch"><span class="no">${n}</span><div><h1>${title}</h1><p class="lead">${lead}</p></div></header>${body}</section>`;
};

// ---------------------------------------------------------------- chapters
const body = [];

body.push(
  chapter(
    'kenal',
    'Kenali UntungLab',
    'Apa UntungLab buat, dan bagaimana ia mengira untung sebenar setiap menu anda.',
    `
<p>UntungLab ialah app untuk peniaga makanan rumah. Anda masukkan harga bahan, pembungkusan, masa anda dan kos bisnes seperti sewa dan api. UntungLab kira <b>kos sebenar</b> setiap menu, tunjuk <b>untung sebenar</b> dan <b>margin</b>, dan cadangkan harga jual mengikut margin yang anda mahu.</p>
<p>Ramai peniaga kira untung dengan menolak kos bahan sahaja daripada harga jual. Sewa, elektrik, gas, bungkusan dan masa sendiri terlepas pandang, jadi untung kelihatan besar tetapi sebenarnya kecil. UntungLab memasukkan semuanya.</p>

<h2>Bagaimana kos sebenar dikira</h2>
<div class="eq">
  <div class="b"><small>Bahan</small></div><span>+</span>
  <div class="b"><small>Pembungkusan</small></div><span>+</span>
  <div class="b"><small>Masa anda</small></div><span>+</span>
  <div class="b"><small>Utiliti pengeluaran</small></div><span>+</span>
  <div class="b"><small>Kos operasi bersama</small></div><span>=</span>
  <div class="b res"><small>Kos Sebenar</small></div>
</div>
<table class="tb">
<tr><th>Bahagian</th><th>Apa maksudnya</th></tr>
<tr><td>Bahan</td><td>Kos bahan yang guna dalam satu unit jualan, daripada harga pek yang anda masukkan.</td></tr>
<tr><td>Pembungkusan</td><td>Kotak, plastik, sticker dan sebagainya untuk satu unit.</td></tr>
<tr><td>Masa anda</td><td>Masa menyediakan satu unit, dinilai dengan Nilai Masa anda (RM sejam).</td></tr>
<tr><td>Utiliti pengeluaran</td><td>Elektrik peralatan seperti oven, ikut watt dan masa guna.</td></tr>
<tr><td>Kos operasi bersama</td><td>Sewa, air, internet, gas dan kos lain bisnes, diagihkan secara adil kepada setiap menu.</td></tr>
</table>
<div class="eq small">
  <div class="b"><small>Harga Jual</small></div><span>−</span><div class="b"><small>Kos Sebenar</small></div><span>=</span><div class="b res"><small>Anggaran Untung</small></div>
</div>
<p><b>Margin</b> ialah Anggaran Untung dibahagi Harga Jual, dalam peratus. Contoh: untung RM1.25 daripada harga jual RM6.00 ialah margin 20.9%.</p>

<h2>Status margin</h2>
<p>Setiap menu diberi satu status supaya anda terus nampak mana yang perlu dibetulkan.</p>
<table class="tb st4">
<tr><td><span class="pill loss">▼ Menu Ini Rugi</span></td><td>Untung kurang daripada RM0. Kos sebenar lebih tinggi daripada harga jual.</td></tr>
<tr><td><span class="pill low">▼ Margin Rendah</span></td><td>Margin di bawah 25%.</td></tr>
<tr><td><span class="pill watch">! Perlu Perhatian</span></td><td>Margin 25% hingga bawah 40%.</td></tr>
<tr><td><span class="pill ok">✓ Margin Sihat</span></td><td>Margin 40% ke atas.</td></tr>
</table>
${note('Peringkat 25% dan 40% ialah panduan UntungLab, bukan piawaian industri. Anda yang tentukan harga akhir. Jenis perniagaan dan kos tetap anda mungkin memerlukan margin yang lebih tinggi atau lebih rendah.')}

<h2>Data anda dan internet</h2>
<ul class="bl">
<li>Semua data (bahan, menu, kos, sejarah harga) disimpan <b>dalam peranti anda</b>. Tiada akaun, tiada log masuk, dan data tidak dihantar ke mana-mana.</li>
<li>UntungLab boleh digunakan <b>tanpa internet</b> selepas dipasang. Internet hanya diperlukan sekali untuk mengaktifkan kod lesen.</li>
<li>Kerana data hanya ada pada peranti anda, <b>buat sandaran</b> secara berkala (Bab Sandaran).</li>
</ul>

<h2>Versi Percuma dan Versi Penuh</h2>
<table class="tb">
<tr><th></th><th>Versi Percuma</th><th>UntungLab Penuh</th></tr>
<tr><td>Menu</td><td>2</td><td>Tanpa had</td></tr>
<tr><td>Bahan</td><td>10</td><td>Tanpa had</td></tr>
<tr><td>Pembungkusan</td><td>2</td><td>Tanpa had</td></tr>
<tr><td>Kira Lebih Tepat (Kos Operasi)</td><td>Pratonton sahaja</td><td>Ya</td></tr>
<tr><td>Fungsi lain</td><td colspan="2">Sama dalam kedua-duanya</td></tr>
<tr><td>Bayaran</td><td>Percuma</td><td>Sekali bayar, guna selamanya, 2 peranti</td></tr>
</table>
`,
  ),
);

body.push(
  chapter(
    'pasang',
    'Pasang dan mula guna',
    'Tambah UntungLab ke skrin utama, aktifkan kod lesen dan ikut senarai Mula di sini.',
    `
<h2>1. Pasang di skrin utama</h2>
<p>UntungLab ialah app web, jadi tiada Play Store atau App Store. Anda tambah ia ke skrin utama sekali sahaja dan ia berfungsi seperti app biasa. <b>Pasang dan buka sekali semasa ada internet</b> supaya ia boleh dipakai tanpa internet selepas itu.</p>
<div class="inst">
 <div class="c"><h3>iPhone / iPad (Safari)</h3><div class="mk">${INSTALL_MOCKS.iosA}${INSTALL_MOCKS.iosB}</div>
  ${steps('Buka UntungLab di <b>Safari</b>.', 'Tekan butang <b>Kongsi</b> (kotak dengan anak panah ke atas) di bawah skrin.', 'Tatal dan pilih <b>Tambah ke Skrin Utama</b>.', 'Tekan <b>Tambah</b>. Ikon UntungLab muncul di skrin anda.')}</div>
 <div class="c"><h3>Android (Chrome)</h3><div class="mk">${INSTALL_MOCKS.andA}${INSTALL_MOCKS.andB}</div>
  ${steps('Buka UntungLab di <b>Chrome</b>.', 'Tekan menu <b>⋮</b> (tiga titik) di penjuru atas.', 'Pilih <b>Pasang app</b> atau <b>Tambah ke skrin utama</b>.', 'Tekan <b>Pasang</b>. Ikon UntungLab muncul di skrin anda.')}
  <div class="call warn small"><b>Amaran "app tidak selamat"?</b> Itu amaran biasa Android atau Google Play Protect untuk app yang dipasang dari web. UntungLab tidak mengambil data anda. Tekan <b>Lagi butiran</b>, kemudian <b>Pasang juga</b>. Jika tidak pasti, guna UntungLab terus di Chrome tanpa memasangnya.</div></div>
 <div class="c wide"><h3>Komputer (Chrome atau Edge)</h3><div class="mk w">${INSTALL_MOCKS.deskA}${INSTALL_MOCKS.deskB}</div>
  ${steps('Buka UntungLab di Chrome atau Edge.', 'Cari ikon <b>Pasang</b> di hujung bar alamat (atas, sebelah kanan), atau tekan menu <b>⋮</b> dan pilih <b>Pasang UntungLab</b>.', 'Tekan <b>Pasang</b>. UntungLab dibuka dalam tetingkapnya sendiri.')}</div>
</div>
${note('Pasang di telefon yang anda guna untuk berniaga. Data disimpan pada peranti itu sahaja. Telefon lain yang memasang UntungLab ada data kosong sendiri, kecuali anda pulihkan sandaran.')}

<h2>2. Aktifkan kod lesen</h2>
<p>Selepas bayar, anda dapat kod lesen berbentuk <b>UL-XXXX-XXXX-XXXX</b> di skrin bayaran dan melalui emel. Jika emel tiada dalam Inbox, semak <b>Spam</b>, <b>Promotions</b> atau <b>Important</b>.</p>
${steps('Tekan butang <b>Buka UntungLab &amp; aktifkan</b> di skrin bayaran. Kod terisi sendiri. Atau buka <b>Lesen</b> dalam app dan taip atau tampal kod.', 'Tekan <b>Aktifkan</b>. Anda perlu internet untuk langkah ini sahaja.', 'Skrin Lesen bertukar kepada <b>UntungLab Penuh</b> dan semua had dibuka.')}
${figs(fig('03-lesen-percuma', 'Skrin Lesen (Versi Percuma).', ['Ruang kod lesen.', 'Butang Aktifkan.']), fig('04-lesen-pro', 'Selepas aktif: UntungLab Penuh.'))}

<h2>3. Ikut senarai Mula di sini</h2>
<p>Bila anda belum ada menu, Dashboard menunjukkan senarai tujuh langkah. Siapkan langkah 1 hingga 4 dahulu, kemudian cipta menu pertama. Bahagian ini tersusun supaya kos operasi sudah ada sebelum menu dikira.</p>
<table class="tb">
<tr><td>1</td><td>Tetapkan <b>Nilai Masa</b> anda (Kos Operasi)</td></tr>
<tr><td>2</td><td>Isi semua <b>6 kategori Kos Operasi</b>. RM0 jika tiada kos itu</td></tr>
<tr><td>3</td><td>Isi <b>Anggaran Jualan Bulanan</b></td></tr>
<tr><td>4</td><td>Tambah <b>bahan</b> pertama anda</td></tr>
<tr><td>5</td><td>Tambah <b>pembungkusan</b> <i>(pilihan)</i></td></tr>
<tr><td>6</td><td>Tambah <b>peralatan</b> <i>(pilihan)</i></td></tr>
<tr><td>7</td><td>Cipta <b>menu</b> pertama</td></tr>
</table>

<h2>4. Bergerak dalam app</h2>
<p>Di telefon, bar bawah ada empat pilihan utama: Dashboard, Menu, Bahan dan Kesan Harga. Pilihan lain (Pembungkusan, Peralatan Saya, Jejak Harga, Kos Operasi, Laporan, Sandaran, Lesen) ada di bawah <b>Lagi</b>. Di skrin besar, semua pilihan ada di menu sisi.</p>
${figs(fig('01-mula', 'Dashboard bila belum ada menu: senarai Mula di sini.', ['Senarai langkah dan kemajuan.', 'Langkah pertama.']), fig('02-lagi', 'Menu Lagi di telefon.'))}
`,
  ),
);

body.push(
  chapter(
    'operasi',
    'Kos Operasi',
    'Kos bisnes yang dikongsi semua menu: sewa, elektrik, air, internet, gas dan kos lain.',
    `
<p>Isi bahagian ini <b>sekali sahaja</b>. UntungLab membahagikan kos itu kepada setiap menu mengikut jualan, jadi anda tak perlu isi semula dalam setiap menu. Semua <b>6 baris wajib diisi</b>. Kalau anda tiada kos itu, tekan <b>Tiada kos ini (RM0)</b> supaya UntungLab tahu ia bukan terlupa.</p>
<h2>Tetapan bisnes</h2>
<ul class="bl">
<li><b>Nama dan jenis bisnes</b> (pilihan).</li>
<li><b>Nilai Masa (RM sejam)</b>: berapa nilai satu jam kerja anda. Contoh: RM15 sejam, jadi 30 minit menyediakan menu dikira RM7.50.</li>
<li><b>Anggaran Jualan Bulanan (RM)</b>: jumlah jualan yang anda jangka dalam sebulan. Ia digunakan untuk mengagihkan kos operasi. Tanpa nombor ini, kadar kos operasi tidak dapat dikira.</li>
</ul>
${figs(fig('05a-kos-operasi-atas', 'Tetapan bisnes.', ['Bahagian Tetapan bisnes.', 'Nilai Masa.', 'Anggaran Jualan Bulanan.']), fig('05b-kos-operasi-senarai', 'Ringkasan dan enam kategori.', ['Jumlah kos operasi bersama sebulan.', 'Kadar Kos Operasi.', 'Tekan satu baris untuk isi atau sunting.']))}
<p><b>Kadar Kos Operasi</b> ialah jumlah kos sebulan dibahagi Anggaran Jualan Bulanan. Dalam contoh di atas, RM340.00 dibahagi RM2,400 ialah 14.2%. Maknanya setiap RM1 jualan menanggung RM0.142 kos operasi.</p>

<h2>Mudah atau Kira Lebih Tepat</h2>
<p>Setiap kategori boleh diisi dengan dua cara:</p>
<ul class="bl">
<li><b>Mudah</b>: taip jumlah RM sebulan sahaja.</li>
<li><b>Kira Lebih Tepat</b> (Versi Penuh): UntungLab kira jumlahnya. Contoh <b>Ruang Kerja</b>: kos rumah atau sewa × peratus ruang yang digunakan, atau ikut keluasan rumah dan keluasan bisnes. <b>Air</b>: purata bil × peratus air untuk bisnes. <b>Elektrik</b>: elektrik am, ditambah kadar elektrik supaya peralatan boleh dikira dalam menu.</li>
</ul>
<p>Kembali ke Mudah tidak memadam butiran Lebih Tepat anda.</p>
${figs(fig('06-ruang-kerja', 'Ruang Kerja dalam mod Kira Lebih Tepat.', ['Pilih Mudah atau Kira Lebih Tepat.', 'Mod Kira Lebih Tepat dipilih.', 'Kos rumah atau sewa sebulan.', 'Peratus ruang digunakan.']), fig('07-elektrik', 'Elektrik: elektrik am dan kadar sekilowatt jam.', ['Elektrik am sebulan (lampu, peti sejuk, penghawa dingin).', 'Kadar elektrik (RM sekilowatt jam) daripada bil TNB anda.']))}
${warn('<b>Jangan masukkan elektrik oven, mixer atau peralatan pengeluaran dalam Elektrik am.</b> Kos itu dikira dalam setiap menu daripada Peralatan Saya. Kalau dimasukkan di sini juga, ia dikira dua kali.')}
${tip('Isi Elektrik dalam mod Kira Lebih Tepat dan simpan kadar elektrik (contoh RM0.50 sekilowatt jam) bila anda mahu kos elektrik peralatan dikira dalam setiap menu. Dalam mod Mudah, bil elektrik penuh sudah masuk dalam Kos Operasi, jadi peralatan tidak dikira lagi.')}
`,
  ),
);

body.push(
  chapter(
    'bahan',
    'Bahan',
    'Masukkan harga beli dan saiz pek. UntungLab kira kos seunit dan jejak setiap perubahan harga.',
    `
${steps('Buka <b>Bahan</b> dan tekan <b>Tambah bahan</b>.', 'Isi <b>Nama</b>, <b>Harga beli (RM)</b>, <b>Kuantiti dalam pek</b> dan <b>Unit pek</b> (contoh kg, g, l, ml, biji, pek, kotak).', 'Semak <b>Kos seunit</b> yang dikira sendiri, kemudian tekan <b>Simpan</b>.')}
<p>Contoh: butter 250 g berharga RM12 menjadi <b>RM48.00 sekilogram</b>. Kos seunit inilah yang digunakan dalam resipi menu anda.</p>
${figs(fig('09-bahan-tambah', 'Menambah bahan.', ['Nama bahan.', 'Harga beli satu pek.', 'Kuantiti dalam pek.', 'Unit pek.', 'Kos seunit dikira sendiri.']), fig('10-bahan-senarai', 'Senarai bahan.', ['Tambah bahan.', 'Satu bahan: nama, harga pek dan kos seunit. Tekan untuk sunting.']))}
<h2>Pemetaan pek (pilihan)</h2>
<p>Pakai bila anda beli dalam satu unit tetapi guna dalam unit lain. Contoh: telur dibeli dalam pek, tetapi resipi guna biji. Tekan <b>Pemetaan pek</b> dan nyatakan berapa. Contoh: 1 pek = 12 biji.</p>
${figs(fig('09b-bahan-pemetaan', 'Pemetaan pek, tarikh beli dan pembekal.'))}
<h2>Harga naik atau turun</h2>
<p>Bila harga bahan berubah, edit bahan itu dan tukar harga atau saiz pek. Perubahan direkod dalam <b>Jejak Harga</b>, dan semua menu terus menggunakan harga baharu. Mahu cuba dahulu tanpa mengubah apa-apa? Guna <b>Kesan Harga</b>.</p>
<h2>Arkib</h2>
<p>Bahan yang tidak lagi digunakan boleh diarkibkan (butang <b>Arkibkan</b> dalam skrin sunting). Ia hilang daripada senarai tetapi menu lama tidak rosak. Tekan <b>Tunjuk yang diarkib</b> untuk melihatnya dan <b>Pulihkan</b> bila perlu.</p>
${note('Versi Percuma: sehingga 10 bahan. Data sedia ada tetap boleh disunting bila had dicapai.')}
`,
  ),
);

body.push(
  chapter(
    'pembungkusan',
    'Pembungkusan',
    'Kotak, plastik, cawan, sticker dan apa sahaja yang pergi bersama setiap jualan.',
    `
${steps('Buka <b>Pembungkusan</b> (di bawah <b>Lagi</b> pada telefon) dan tekan <b>Tambah pembungkusan</b>.', 'Isi <b>Nama</b>, <b>Harga beli (RM)</b> dan <b>Bilangan dalam satu beli</b>, contoh 50 keping.', 'Semak <b>Kos seunit</b>, kemudian <b>Simpan</b>.')}
<p>Contoh: kotak kek RM30 untuk 50 keping ialah <b>RM0.60 sekeping</b>.</p>
${figs(fig('11-pembungkusan-tambah', 'Menambah pembungkusan.', ['Nama.', 'Harga beli.', 'Bilangan dalam satu beli.', 'Kos seunit.']), fig('12-pembungkusan-senarai', 'Senarai pembungkusan.', ['Tambah pembungkusan.']))}
${tip('Dalam menu, anda pilih sama ada kuantiti pembungkusan itu <b>setiap unit dijual</b> (contoh: 1 kotak setiap brownies) atau <b>setiap batch</b> (contoh: 1 beg besar untuk keseluruhan batch).')}
${note('Versi Percuma: sehingga 2 pembungkusan.')}
`,
  ),
);

body.push(
  chapter(
    'peralatan',
    'Peralatan Saya',
    'Oven, mixer dan peralatan lain. Watt digunakan untuk mengira kos elektrik setiap batch.',
    `
${steps('Buka <b>Peralatan Saya</b> dan tekan <b>Tambah peralatan</b>.', 'Cari dalam senarai (contoh Oven, Air fryer, Blender), atau pilih <b>Peralatan sendiri</b> dan taip namanya.', 'Semak <b>Watt (W)</b>. Nilai yang dicadangkan ialah anggaran, jadi semak label pada peralatan anda dan ubah jika berbeza.', 'Tekan <b>Simpan</b>.')}
${figs(fig('13-peralatan-pilih', 'Pilih peralatan.', ['Cari peralatan.', 'Pilih daripada senarai.', 'Atau tambah peralatan sendiri.']), fig('14-peralatan-watt', 'Nama dan watt.', ['Nama peralatan.', 'Watt (W). Ada pada label peralatan.']), fig('15-peralatan-senarai', 'Peralatan dengan tanda anggaran. Tekan <b>Guna nilai ini</b> untuk mengesahkan nilai watt.'))}
<p>Kos elektrik dikira dalam <b>setiap menu</b>: watt ÷ 1000 × jam guna × kadar elektrik. Untuk ini berfungsi, kadar elektrik mesti disimpan dalam <b>Kos Operasi</b> (Elektrik, Kira Lebih Tepat).</p>
`,
  ),
);

body.push(
  chapter(
    'menu',
    'Menu',
    'Cipta menu, lihat kos sebenar, untung dan margin, dan dapatkan cadangan harga.',
    `
<h2>Cipta menu</h2>
${steps('Buka <b>Menu</b> dan tekan <b>Tambah menu</b>.', 'Isi maklumat asas (lihat di bawah).', 'Tambah <b>bahan</b>, <b>pembungkusan</b> dan <b>peralatan</b> yang digunakan.', 'Lihat <b>Ringkasan langsung</b> di bahagian atas yang berubah semasa anda mengisi, kemudian tekan <b>Simpan menu</b>.')}
<table class="tb">
<tr><th>Ruang</th><th>Isi apa</th></tr>
<tr><td>Nama menu</td><td>Contoh: Standard Brownies.</td></tr>
<tr><td>Hasil setiap batch</td><td>Berapa unit siap dijual daripada satu kali masak. Contoh: 1 batch = 20 keping.</td></tr>
<tr><td>Masa penyediaan setiap batch (minit)</td><td>Jumlah masa anda bekerja untuk satu batch.</td></tr>
<tr><td>Harga Jual seunit (RM)</td><td>Harga anda jual satu unit. Kos hanya dikira bila harga lebih daripada RM0.</td></tr>
</table>
${figs(fig('20-menu-asas', 'Maklumat asas menu.', ['Nama menu.', 'Hasil setiap batch.', 'Masa penyediaan.', 'Harga Jual seunit.']), fig('21-menu-bahan', 'Bahan dalam menu.', ['Pilih bahan.', 'Kuantiti guna dan unit.', 'Tambah bahan lagi.']))}
<h2>Pembungkusan dan peralatan</h2>
<p>Tambah pembungkusan, pilih kuantiti, dan tentukan sama ada ia <b>setiap unit dijual</b> atau <b>setiap batch</b>. Tambah peralatan dan masa guna dalam minit, contoh oven 45 minit.</p>
${figs(fig('22-menu-pembungkusan', 'Pembungkusan dalam menu.', ['Pilih pembungkusan.', 'Tambah pembungkusan lagi.']), fig('23-menu-peralatan', 'Peralatan dalam menu.', ['Pilih peralatan.', 'Masa guna (minit).']))}
<p>Bar di bahagian atas skrin sentiasa menunjukkan <b>Kos Sebenar</b>, <b>Anggaran Untung</b>, margin dan status, yang berubah semasa anda mengisi.</p>

<h2>Senarai menu dan hasil pengiraan</h2>
${figs(fig('24-menu-senarai', 'Senarai menu.', ['Satu menu: harga, kos sebenar, untung, margin dan status.', 'Tambah menu.']), fig('26-menu-hasil', 'Hasil pengiraan.', ['Kos Sebenar.', 'Anggaran Untung.']), fig('27-menu-pecahan', 'Pecahan kos seunit.'))}
<p><b>Pecahan kos seunit</b> menunjukkan dari mana kos datang. Tekan satu baris untuk melihat butirannya dan rumusnya. Menu yang <b>belum lengkap</b> menyenaraikan apa yang kurang, dengan butang <b>Pergi</b> terus ke tempat yang perlu diisi.</p>
${note('Versi Percuma: sehingga 2 menu.')}

<h2>Cadangan Harga</h2>
<p>Pilih margin sasaran (20%, 30%, 40% atau 50%). UntungLab kira harga jual yang perlu, <b>termasuk kos operasi</b>. Tekan <b>Guna harga ini</b> untuk memasukkan harga itu ke ruang Harga Jual, kemudian tekan <b>Simpan menu</b>.</p>
${figs(fig('28-cadangan', 'Cadangan Harga.', ['Pilih margin sasaran.', 'Guna harga ini.']))}
<p>Jika margin sasaran tak boleh dicapai kerana kos operasi sudah mengambil terlalu banyak daripada harga, UntungLab beritahu anda. Cuba margin lebih rendah, atau semak Kos Operasi.</p>
${tip('Harga dicadangkan dikira supaya margin sebenar tepat pada sasaran. Anda yang tentukan harga akhir; bundarkan kepada harga yang sesuai dengan pelanggan anda.')}
`,
  ),
);

body.push(
  chapter(
    'dashboard',
    'Dashboard',
    'Apa yang perlu anda tahu hari ini, dalam satu skrin.',
    `
<ul class="bl">
<li><b>Purata margin semua menu</b>: purata biasa bagi menu yang lengkap. Menu yang belum lengkap tidak dimasukkan.</li>
<li><b>Untung, Rugi, Belum lengkap</b>: bilangan menu dalam setiap kumpulan.</li>
<li><b>Perlu perhatian</b>: menu yang rugi, menu yang belum lengkap, dan perubahan harga bahan yang menjejaskan menu anda.</li>
<li><b>Kedudukan margin</b>: menu disusun dari margin tertinggi ke terendah, dengan bar berwarna ikut status.</li>
</ul>
${figs(fig('30-dashboard', 'Dashboard.', ['Purata margin semua menu.']), fig('31-dashboard-bawah', 'Kad bilangan dan kedudukan margin.'), fig('43-dashboard-amaran', 'Amaran perubahan harga selepas harga butter dinaikkan.'))}
<p>Setiap amaran boleh ditutup dengan <b>×</b>. Tekan <b>Lihat menu</b> atau <b>Lihat kesan harga</b> pada amaran untuk terus ke butirannya. Jika anda belum menyimpan sandaran, Dashboard juga mengingatkan anda.</p>
`,
  ),
);

body.push(
  chapter(
    'kesan',
    'Kesan Harga',
    'Cuba naikkan atau turunkan harga satu bahan dan lihat kesannya pada untung setiap menu, sebelum anda ubah apa-apa.',
    `
${steps('Buka <b>Kesan Harga</b> dan pilih <b>bahan</b>.', 'Pilih chip <b>+5%</b>, <b>+10%</b>, <b>+20%</b> atau <b>+30%</b>, atau tekan <b>Lain-lain</b> dan isi peratusan (guna − jika harga turun) atau harga pek baharu.', 'Lihat <b>Kesan pada kos</b>: setiap menu yang terjejas, kos dan untung sebelum dan selepas, dan jika statusnya bertukar.', 'Mahu guna harga itu? Tekan <b>Guna harga ini</b> dan sahkan. Jika tidak, tekan <b>Set semula</b>.')}
${figs(fig('33-kesan-pilih', 'Pilih bahan dan chip peratus.', ['Pilih bahan.', 'Pilih peratus kenaikan.']), fig('34-kesan-hasil', 'Hasil simulasi.', ['Kesan pada kos bahan.', 'Setiap menu: sebelum dan selepas.', 'Guna harga ini.']))}
${figs(fig('35-kesan-sahkan', 'Pengesahan sebelum harga ditukar.', ['Ya, guna harga ini.']), fig('36-kesan-berjaya', 'Harga dikemas kini dan direkod dalam Jejak Harga.'))}
${note('Ia <b>simulasi sahaja</b>. Tiada data berubah sehingga anda tekan <b>Guna harga ini</b> dan sahkan. Selepas itu semua menu guna harga baharu dan perubahan direkod dalam Jejak Harga.')}
`,
  ),
);

body.push(
  chapter(
    'jejak',
    'Jejak Harga',
    'Rekod setiap perubahan harga beli dan saiz pek, dibandingkan pada kos seunit.',
    `
<p>Setiap kali anda mengubah harga atau saiz pek sesuatu bahan, UntungLab merekodnya. Perbandingan dibuat pada <b>kos seunit</b>, bukan harga pek sahaja, jadi menukar saiz pek tidak mengelirukan. Jika unit berbeza daripada rekod sebelumnya, UntungLab beritahu bahawa ia tidak boleh dibandingkan.</p>
${figs(fig('37-jejak-senarai', 'Senarai bahan dengan perubahan terkini.', ['Harga pek, kos seunit dan perubahan.']), fig('38-jejak-butiran', 'Perubahan, menu yang terjejas dan trend.'), fig('39-jejak-trend', 'Graf trend kos seunit dan sejarah rekod.'))}
<ul class="bl">
<li><b>Menu terjejas</b>: berapa menu menggunakan bahan itu. Tekan <b>Lihat kesan harga</b> untuk simulasi.</li>
<li><b>Trend kos seunit</b>: graf kos seunit dari rekod pertama hingga terkini. Sentuh satu titik untuk melihat harga pada tarikh itu.</li>
<li><b>Sejarah</b>: senarai rekod harga bahan itu. Setiap perubahan boleh disemak kesannya pada menu anda melalui <b>Lihat kesan pada menu</b> (paparan baca sahaja, dikira dengan menu anda sekarang).</li>
</ul>
`,
  ),
);

body.push(
  chapter(
    'laporan',
    'Laporan',
    'Ringkasan kos dan untung setiap menu, boleh dieksport ke Excel atau Google Sheets.',
    `
<p>Laporan menunjukkan setiap menu dengan harga jual, kos sebenar, anggaran untung, margin dan status. Semua angka sama dengan skrin Menu dan Dashboard.</p>
${steps('Buka <b>Laporan</b> (di bawah <b>Lagi</b> pada telefon).', 'Tekan <b>Eksport CSV</b>. Fail CSV disimpan dan boleh dibuka dalam Excel atau Google Sheets.')}
${figs(fig('40-laporan', 'Laporan menu.', ['Eksport CSV.']))}
${note('Tiada jumlah untung keseluruhan kerana UntungLab tidak menyimpan isi padu jualan setiap menu. Angka dalam laporan ialah untung seunit, bukan jumlah sebulan.')}
`,
  ),
);

body.push(
  chapter(
    'sandaran',
    'Sandaran',
    'Lindungi data anda. Ia hanya ada dalam peranti anda, jadi sandaran ialah satu-satunya salinan lain.',
    `
<p>Jika telefon rosak, hilang atau ditukar, data yang tiada sandaran tidak boleh dikembalikan. Simpan sandaran secara berkala, terutama selepas anda menambah banyak bahan atau menu.</p>
<h2>Simpan sandaran</h2>
${steps('Buka <b>Sandaran</b> dan tekan <b>Simpan sandaran</b>.', 'Simpan fail itu di tempat selamat: aplikasi Fail, Google Drive, atau hantar kepada diri sendiri melalui emel atau WhatsApp.')}
<p>Satu fail mengandungi semua bahan, menu, kos dan sejarah harga anda. UntungLab menunjukkan tarikh sandaran terakhir dan mengingatkan anda bila ia sudah lama.</p>
<h2>Pulihkan daripada sandaran</h2>
${steps('Buka <b>Sandaran</b> dan tekan <b>Pilih fail sandaran</b>.', 'UntungLab memeriksa fail dahulu dan menunjukkan ringkasannya. <b>Tiada apa berubah</b> sehingga anda sahkan.', 'Disyorkan: tekan <b>Simpan sandaran semasa dahulu</b>, kemudian <b>Ganti data dalam peranti</b>.')}
${figs(fig('41-sandaran', 'Skrin Sandaran.', ['Simpan sandaran.']), fig('42-sandaran-pulih', 'Pulihkan daripada fail.', ['Pilih fail sandaran.']))}
${warn('Memulihkan sandaran <b>menggantikan semua data</b> dalam peranti itu. Ia tak boleh diundur melainkan anda ada sandaran semasa.')}
<h2>Perlindungan storan</h2>
<p>Pelayar boleh memadam data jika ruang telefon penuh. Tekan <b>Minta perlindungan storan</b> dalam skrin Sandaran. Jika pelayar anda tidak menyokongnya, simpan sandaran lebih kerap.</p>
${note('Lesen dan ID peranti <b>tidak</b> termasuk dalam sandaran. Di telefon baharu, anda masukkan semula kod lesen anda selepas memulihkan data.')}
`,
  ),
);

body.push(
  chapter(
    'lesen',
    'Lesen dan tukar telefon',
    'Satu kod lesen boleh digunakan pada dua peranti.',
    `
<ul class="bl">
<li>Kod lesen berbentuk <b>UL-XXXX-XXXX-XXXX</b>. Simpan emel yang mengandunginya.</li>
<li>Satu kod boleh digunakan pada <b>2 peranti</b>, contohnya telefon dan tablet anda.</li>
<li>Aktivasi perlu internet <b>sekali</b>. Selepas itu UntungLab berfungsi tanpa internet.</li>
<li>Skrin Lesen menunjukkan empat digit terakhir kod anda sebagai rujukan.</li>
</ul>
<h2>Tukar telefon</h2>
${steps('Di telefon lama: buat <b>sandaran</b> (Bab Sandaran) dan hantar fail itu kepada diri sendiri.', 'Di telefon lama: buka <b>Lesen</b> dan tekan <b>Lepaskan peranti ini</b>. Ini membebaskan satu tempat. Perlu internet.', 'Di telefon baharu: pasang UntungLab, <b>pulihkan sandaran</b>, kemudian buka <b>Lesen</b> dan masukkan kod yang sama.')}
${tip('Sudah hilang telefon lama dan tak sempat lepaskan? Hubungi penjual melalui emel pembelian anda. Jangan tunggu sehingga kod penuh.')}
<h2>Mesej yang mungkin anda nampak</h2>
<table class="tb">
<tr><th>Mesej</th><th>Apa nak buat</th></tr>
<tr><td>Kod ini tidak dijumpai</td><td>Semak ejaan. Huruf besar atau kecil dan tanda sengkang tidak penting. Kod tidak pernah mengandungi huruf O, I, L, U atau angka 0 dan 1, jadi jika anda terbaca aksara itu, semak semula.</td></tr>
<tr><td>Kod ini sudah digunakan pada 2 peranti</td><td>Buka Lesen pada peranti lama dan tekan Lepaskan, atau hubungi penjual.</td></tr>
<tr><td>Tiada sambungan internet</td><td>Sambung internet dan cuba lagi. Hanya aktivasi dan pelepasan peranti perlukan internet.</td></tr>
<tr><td>Terlalu banyak percubaan</td><td>Tunggu sejam dan cuba lagi.</td></tr>
<tr><td>Kod ini telah dibatalkan</td><td>Hubungi penjual.</td></tr>
</table>
`,
  ),
);

body.push(
  chapter(
    'faq',
    'Soalan lazim dan masalah biasa',
    'Jawapan pantas kepada perkara yang selalu ditanya.',
    `
<h2>Soalan lazim</h2>
<dl class="faq">
<dt>Menu saya tunjuk "Belum lengkap". Kenapa?</dt><dd>Ada maklumat yang belum diisi. Buka menu itu dan lihat senarai <b>Perlu dilengkapkan</b>. Selalunya: Anggaran Jualan Bulanan, Nilai Masa, atau salah satu daripada 6 kategori Kos Operasi belum diisi, atau kadar elektrik belum disimpan bila menu guna peralatan.</dd>
<dt>Kenapa margin saya rendah walaupun untung nampak banyak?</dt><dd>Kerana UntungLab mengira semua kos, termasuk masa anda dan kos operasi. Anggaran lama yang hanya menolak kos bahan akan sentiasa lebih tinggi.</dd>
<dt>Perlukah saya masukkan gaji sendiri?</dt><dd>Itulah fungsi <b>Nilai Masa</b>. Anda tetapkan berapa nilai sejam masa anda, dan UntungLab masukkannya dalam kos setiap menu.</dd>
<dt>Menu rugi selepas saya ubah harga bahan. Apa nak buat?</dt><dd>Buka menu itu, pilih margin sasaran dalam <b>Cadangan Harga</b> dan lihat harga yang perlu. Anda juga boleh cuba bahan lain atau kurangkan kuantiti.</dd>
<dt>Boleh guna di dua telefon?</dt><dd>Boleh, sehingga 2 peranti. Setiap peranti ada data sendiri, jadi pindahkan data melalui sandaran.</dd>
<dt>Data saya hilang selepas muat semula atau tukar pelayar?</dt><dd>Data disimpan dalam pelayar yang anda gunakan. Buka UntungLab dari ikon yang sama dan pelayar yang sama. Memasang UntungLab dari alamat berbeza memberi data kosong yang berbeza. Pulihkan daripada sandaran jika ada.</dd>
<dt>Bagaimana dengan bayaran balik?</dt><dd>Dalam 7 hari selepas pembelian, balas emel kod lesen anda.</dd>
</dl>

<h2>Masalah biasa</h2>
<table class="tb">
<tr><th>Masalah</th><th>Penyelesaian</th></tr>
<tr><td>App tidak boleh dipasang atau tiada butang Pasang</td><td>Guna Safari (iPhone) atau Chrome (Android). Pastikan alamat bermula dengan <b>https://</b>. Cuba tutup dan buka semula halaman.</td></tr>
<tr><td>Amaran "app tidak selamat" semasa pasang di Android</td><td>Tekan <b>Lagi butiran</b>, kemudian <b>Pasang juga</b>.</td></tr>
<tr><td>Data dalam peranti tak dapat dibuka</td><td>Tutup tab lain yang membuka UntungLab, kemudian muat semula.</td></tr>
<tr><td>Versi baharu tidak muncul</td><td>Tutup app sepenuhnya dan buka semula bila ada internet. Versi baharu dimuat turun di belakang tabir.</td></tr>
<tr><td>Elektrik peralatan tidak dikira dalam menu</td><td>Pastikan Elektrik dalam Kos Operasi ditetapkan kepada <b>Kira Lebih Tepat</b> dan <b>kadar elektrik</b> sudah disimpan.</td></tr>
<tr><td>Tak dapat tambah bahan, menu atau pembungkusan</td><td>Versi Percuma ada had (10 bahan, 2 menu, 2 pembungkusan). Aktifkan kod lesen untuk membuka had.</td></tr>
<tr><td>Emel kod lesen tiada</td><td>Semak Spam, Promotions dan Important. Kod juga dipaparkan di skrin selepas bayar.</td></tr>
</table>
`,
  ),
);

body.push(
  chapter(
    'lampiran',
    'Glosari dan contoh pengiraan',
    'Istilah dalam app, dan satu menu dikira langkah demi langkah.',
    `
<h2>Glosari</h2>
<table class="tb gl">
<tr><td>Kos Sebenar</td><td>Jumlah semua kos satu unit jualan: bahan, pembungkusan, masa, utiliti pengeluaran dan kos operasi bersama.</td></tr>
<tr><td>Harga Jual</td><td>Harga anda jual satu unit.</td></tr>
<tr><td>Anggaran Untung</td><td>Harga Jual tolak Kos Sebenar.</td></tr>
<tr><td>Margin</td><td>Anggaran Untung dibahagi Harga Jual, dalam peratus.</td></tr>
<tr><td>Nilai Masa</td><td>Berapa nilai sejam masa anda bekerja (RM sejam).</td></tr>
<tr><td>Utiliti Pengeluaran</td><td>Kos elektrik peralatan dalam menu.</td></tr>
<tr><td>Kos Operasi Bersama</td><td>Bahagian kos bisnes (sewa, air dan lain-lain) yang ditanggung satu unit jualan.</td></tr>
<tr><td>Kadar Kos Operasi</td><td>Jumlah kos operasi sebulan dibahagi Anggaran Jualan Bulanan.</td></tr>
<tr><td>Batch</td><td>Satu kali masak atau satu kali penyediaan, yang menghasilkan beberapa unit jualan.</td></tr>
<tr><td>Kos seunit</td><td>Harga beli dibahagi kuantiti dalam pek.</td></tr>
<tr><td>Pemetaan pek</td><td>Penerangan berapa unit guna dalam satu pek, contoh 1 pek = 12 biji.</td></tr>
<tr><td>Arkib</td><td>Sembunyikan item yang tidak digunakan tanpa memadamnya.</td></tr>
</table>

<h2>Contoh: Standard Brownies</h2>
<p>Angka di bawah sama dengan skrin dalam manual ini. Satu batch menghasilkan 20 keping, mengambil 120 minit, dan dijual RM6.00 sekeping. Nilai Masa RM15 sejam, kos operasi bulanan RM340.00 dan jualan bulanan RM2,400 (kadar 14.2%), kadar elektrik RM0.50 sekilowatt jam.</p>
<table class="tb calc">
<tr><th>Bahagian</th><th>Pengiraan</th><th>Seunit</th></tr>
<tr><td>Bahan</td><td>(150 g butter × RM0.048) + (200 g coklat × RM0.040) + (4 telur × RM0.50) + (120 g tepung × RM0.004) + (180 g gula × RM0.003) = RM18.22 sebatch, ÷ 20</td><td>RM0.91</td></tr>
<tr><td>Pembungkusan</td><td>Kotak RM1.00 + kertas baking RM0.15 + sticker RM0.10 + beg RM0.20</td><td>RM1.45</td></tr>
<tr><td>Masa</td><td>120 minit ÷ 20 = 6 minit; 6 ÷ 60 × RM15</td><td>RM1.50</td></tr>
<tr><td>Utiliti pengeluaran</td><td>Oven 2,000 W × 0.75 jam × RM0.50 = RM0.75 sebatch, ÷ 20</td><td>RM0.04</td></tr>
<tr><td>Kos operasi bersama</td><td>14.2% × RM6.00 (harga jual)</td><td>RM0.85</td></tr>
<tr class="tot"><td colspan="2">Kos Sebenar</td><td>RM4.75</td></tr>
<tr class="tot"><td colspan="2">Anggaran Untung (RM6.00 − RM4.75)</td><td>RM1.25</td></tr>
<tr class="tot"><td colspan="2">Margin (RM1.25 ÷ RM6.00)</td><td>20.9%</td></tr>
</table>
<p><b>Cadangan harga 30%:</b> kos langsung (tanpa kos operasi) ialah RM0.91 + RM1.45 + RM1.50 + RM0.04 = RM3.90. Harga yang perlu = RM3.90 ÷ (1 − 0.30 − 0.142) = <b>RM6.98</b>. Pada harga itu, kos operasi turut naik kerana ia ikut harga jual, dan margin sebenar tepat 30%.</p>
<p class="end">Terima kasih kerana menggunakan UntungLab. Kira dengan bijak, untung dengan yakin.</p>
<p class="end">Ada soalan atau masalah? Hubungi kami di <b>admin@digitalsambal.space</b></p>
`,
  ),
);

// ---------------------------------------------------------------- html
const toc = chapters.map(([id, title], i) => `<li><a href="#${id}"><span>${i + 1}</span>${title}</a></li>`).join('');
const css = `
@font-face{font-family:Inter;src:url(data:font/woff2;base64,${fontB64}) format('woff2');font-weight:100 900}
@page{size:A4;margin:18mm 17mm 20mm 17mm;@bottom-center{content:"UntungLab · Manual Pengguna · " counter(page);font:500 8pt Inter;color:#7C9A9C}}
@page cover{margin:0;@bottom-center{content:none}}
*{box-sizing:border-box}
html{font:10pt/1.55 Inter,system-ui,sans-serif;color:#10282B}
body{margin:0}
.cover{page:cover;height:297mm;width:210mm;background:radial-gradient(900px 700px at 85% 15%,#0F5A63 0,#04171B 55%,#010608 100%);color:#fff;padding:26mm 22mm;position:relative;break-after:page;overflow:hidden}
.cover img.logo{height:15mm}
.cover h1{font-size:44pt;line-height:1.05;letter-spacing:-.03em;margin:50mm 0 8mm;font-weight:800}
.cover h1 em{display:inline-block;padding-bottom:2mm;font-style:normal;background:linear-gradient(90deg,#2DD4BF,#4F9BFF 70%,#9B82FF);-webkit-background-clip:text;background-clip:text;color:transparent}
.cover p{font-size:13pt;color:#B5CDCE;max-width:80mm;margin:0;position:relative;z-index:2}
.cover .ver{position:absolute;left:22mm;bottom:20mm;font-size:9.5pt;color:#8FB0B2}
.cover .phone{position:absolute;right:-10mm;bottom:-40mm;width:84mm;border-radius:11mm;padding:2.4mm;background:linear-gradient(135deg,#D7DDE0,#8A9498 40%,#E9EEF0 70%,#7C868A);transform:rotate(-8deg);box-shadow:0 8mm 16mm rgba(0,0,0,.5)}
.cover .phone .scr{width:100%;aspect-ratio:780/1688;border-radius:9mm;border:1.6mm solid #05090A;background-size:cover;background-position:top}
.toc{break-after:page}
.toc h1{font-size:24pt;margin:0 0 6mm;letter-spacing:-.02em}
.toc ol{list-style:none;padding:0;margin:0}
.toc li{border-bottom:.3mm solid #D9E7E7}
.toc a{display:flex;gap:5mm;align-items:center;padding:2.6mm 0;color:#10282B;text-decoration:none;font-size:11.5pt;font-weight:600}
.toc a span{display:inline-flex;width:8mm;height:8mm;border-radius:50%;background:#0AA89A;color:#fff;align-items:center;justify-content:center;font-size:9pt;font-weight:800}
.toc p{color:#4D6668;font-size:9pt;margin-top:5mm}
.chap{break-before:page}
.ch{display:flex;gap:6mm;align-items:flex-start;border-bottom:.5mm solid #0AA89A;padding-bottom:5mm;margin-bottom:6mm}
.ch .no{flex:none;width:15mm;height:15mm;border-radius:4mm;background:linear-gradient(135deg,#0AA89A,#2F7BFF);color:#fff;font-size:17pt;font-weight:800;display:flex;align-items:center;justify-content:center}
h1{font-size:22pt;margin:0;letter-spacing:-.02em;line-height:1.1}
.lead{margin:2mm 0 0;color:#4D6668;font-size:10.5pt}
h2{font-size:13.5pt;margin:6mm 0 2.5mm;break-after:avoid-page;letter-spacing:-.01em;color:#04171B;break-after:avoid}
h3{font-size:11pt;margin:0 0 2mm}
p{margin:0 0 3mm}
a{color:#0F766E}
ul.bl{padding-left:5mm;margin:0 0 3mm}ul.bl li{margin-bottom:1.6mm}
ol.st{counter-reset:s;list-style:none;padding:0;margin:0 0 4mm}
ol.st li{counter-increment:s;position:relative;padding:0 0 2mm 9mm}
ol.st li:before{content:counter(s);position:absolute;left:0;top:.3mm;width:6mm;height:6mm;border-radius:50%;background:#0AA89A;color:#fff;font-size:8.5pt;font-weight:800;display:flex;align-items:center;justify-content:center}
table.tb{width:100%;border-collapse:collapse;margin:0 0 4mm;font-size:9.5pt}table.tb tr{break-inside:avoid}
.tb th{background:#EAF4F3;text-align:left;padding:2.2mm 3mm;font-size:9pt;color:#0F4F55}
.tb td{padding:2.2mm 3mm;border-bottom:.25mm solid #D9E7E7;vertical-align:top}
.tb td:first-child{font-weight:600;white-space:nowrap}
.tb.gl td:first-child,.tb.calc td:first-child{white-space:normal}
.tb.calc td:last-child,.tb.calc th:last-child{text-align:right;white-space:nowrap;font-weight:700}
.tb.calc .tot td{background:#04171B;color:#fff;border:0}
.tb.calc .tot:nth-last-child(n+2) td{background:#0F3E44}
.tb.st4 td:first-child{width:46mm}
.pill{display:inline-block;border-radius:99px;padding:.6mm 3mm;font-weight:700;font-size:9pt;border:.3mm solid}
.pill.loss{background:#FEE2E2;color:#991B1B;border-color:#FCA5A5}.pill.low{background:#FFEDD5;color:#9A3412;border-color:#FDBA74}
.pill.watch{background:#FEF3C7;color:#92400E;border-color:#FCD34D}.pill.ok{background:#DCFCE7;color:#166534;border-color:#86EFAC}
.eq{display:flex;align-items:stretch;gap:1.6mm;margin:3mm 0 4mm;break-inside:avoid}
.eq span{align-self:center;font-weight:800;color:#0F766E;font-size:12pt}
.eq .b{flex:1;background:#EAF4F3;border-radius:2.5mm;padding:3mm 1.5mm;text-align:center;font-weight:700;display:flex;align-items:center;justify-content:center}
.eq .b small{font-size:8pt;line-height:1.2}
.eq .res{background:#04171B;color:#75F8E8}
.eq.small{max-width:112mm}
.call{border-radius:3mm;padding:3mm 4mm;margin:2mm 0 4mm;font-size:9.5pt;break-inside:avoid;border-left:1.4mm solid}
.call>b:first-child{display:block;font-size:8.5pt;letter-spacing:.08em;text-transform:uppercase;margin-bottom:.6mm}
.call.tip{background:#E7F7F5;border-color:#0AA89A}.call.tip>b:first-child{color:#0F766E}
.call.warn{background:#FFF4E5;border-color:#F59E0B;color:#6B4200}.call.warn>b:first-child{color:#B45309}
.call.note{background:#EEF2FF;border-color:#6366F1}.call.note>b:first-child{color:#4338CA}
.call.small{font-size:8.8pt}
.figs{display:flex;gap:4mm;margin:3mm 0 5mm;align-items:flex-start;break-inside:avoid;justify-content:center}
.figs figure{margin:0;flex:1;min-width:0}
.figs.n1 figure{max-width:50mm;flex:none}
.figs.n2 figure{max-width:78mm}
.ph{border-radius:5mm;padding:1.1mm;background:linear-gradient(135deg,#D7DDE0,#8A9498 40%,#E9EEF0 70%,#7C868A);box-shadow:0 2mm 5mm rgba(4,23,27,.2)}
.ph img{display:block;width:100%;border-radius:4mm;border:.7mm solid #05090A}
.figs.n2 .ph{max-width:46mm;margin:0 auto}.figs.n3 .ph{max-width:100%}.figs.n3{gap:3mm}.figs.n3 figure{max-width:52mm}
figcaption{font-size:8pt;line-height:1.4;color:#33494B;margin-top:2mm}
.lg{list-style:none;padding:0;margin:1.4mm 0 0}
.lg li{display:flex;gap:1.6mm;margin-bottom:.8mm}
.lg i{flex:none;width:4mm;height:4mm;border-radius:50%;background:#FF5A36;color:#fff;font-style:normal;font-weight:800;font-size:6.5pt;display:flex;align-items:center;justify-content:center;margin-top:.2mm}
.inst{display:grid;grid-template-columns:1fr 1fr;gap:4mm;margin:3mm 0 4mm}
.inst .c{border:.3mm solid #D9E7E7;border-radius:3.5mm;padding:4mm;break-inside:avoid}
.inst .c.wide{grid-column:1/-1}
.mk{display:flex;gap:2.5mm;margin-bottom:3mm}
.mk svg{width:calc(50% - 1.25mm);height:auto;border-radius:2mm;border:.25mm solid #E1E4E8}
.mk.w{flex-direction:column}.mk.w svg{width:100%}
.inst .c.wide .mk.w{flex-direction:row}.inst .c.wide .mk.w svg{width:calc(50% - 1.25mm)}
[lang=en]{display:none}
dl.faq{margin:0}dl.faq dt{font-weight:700;margin-top:3mm;break-after:avoid}dl.faq dd{margin:.8mm 0 0;color:#33494B}
.end{margin-top:8mm;font-weight:700;color:#0F766E;text-align:center}
`;

const html = `<!doctype html><html lang="ms"><head><meta charset="utf-8"><title>UntungLab · Manual Pengguna</title><style>${css}</style></head><body>
<section class="cover"><img class="logo" src="data:image/png;base64,${logoB64}">
<h1>Manual<br><em>Pengguna</em></h1>
<p>Panduan lengkap untuk mengira kos sebenar, untung dan harga jual menu anda.</p>
<div class="ver">${VERSION} · untunglab.space</div>
<div class="phone"><div class="scr" style="background-image:url(data:image/jpeg;base64,${b64('30-dashboard.jpg')})"></div></div></section>
<section class="toc"><h1>Kandungan</h1><ol>${toc}</ol><p>Gambar skrin dalam manual ini diambil daripada UntungLab sebenar dengan contoh menu Standard Brownies. Nombor merah pada gambar sepadan dengan nombor dalam keterangan di bawahnya. Angka contoh anda akan berbeza, kerana ia dikira daripada harga dan kos anda sendiri.</p></section>
${body.join('\n')}
</body></html>`;

fs.writeFileSync(path.join(here, 'manual.html'), html);
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome' });
const page = await browser.newPage();
await page.setContent(html, { waitUntil: 'load' });
const out = path.join(root, 'public', 'manual', 'UntungLab-Manual.pdf');
fs.mkdirSync(path.dirname(out), { recursive: true });
await page.pdf({ path: out, format: 'A4', printBackground: true, preferCSSPageSize: true });
await browser.close();
console.log('wrote', out, (fs.statSync(out).size / 1e6).toFixed(2) + ' MB');
