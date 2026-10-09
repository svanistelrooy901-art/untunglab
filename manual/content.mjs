/**
 * Manual content, bilingual. Every paragraph is a pair L(ms, en) so the two PDFs always have the same structure.
 * Screens (fig) are named identically in manual/shots (BM) and manual/shots-en (EN).
 */
export function makeBody(h) {
  const { L, fig, figs, tip, warn, note, steps, chapter, INSTALL_MOCKS } = h;
  const body = [];

  // ---------------------------------------------------------------- 1
  body.push(
    chapter(
      'kenal',
      L('Kenali UntungLab', 'Getting to know UntungLab'),
      L('Apa UntungLab buat, dan bagaimana ia mengira untung sebenar setiap menu anda.', 'What UntungLab does, and how it works out the real profit of each of your menu items.'),
      `
<p>${L(
        'UntungLab ialah app untuk peniaga makanan rumah. Anda masukkan harga bahan, pembungkusan, masa (atau gaji pekerja) dan kos bisnes seperti sewa dan api. UntungLab kira <b>kos sebenar</b> setiap menu, tunjuk <b>untung sebenar</b> dan <b>margin</b>, dan cadangkan harga jual mengikut margin yang anda mahu.',
        'UntungLab is an app for home food businesses. You enter the price of ingredients and packaging, your time (or your workers\' pay) and business costs such as rent and electricity. UntungLab works out the <b>real cost</b> of every menu item, shows the <b>real profit</b> and <b>margin</b>, and suggests a selling price for the margin you want.',
      )}</p>
<p>${L(
        'Ramai peniaga kira untung dengan menolak kos bahan sahaja daripada harga jual. Sewa, elektrik, gas, bungkusan dan masa sendiri terlepas pandang, jadi untung kelihatan besar tetapi sebenarnya kecil. UntungLab memasukkan semuanya.',
        'Many sellers work out profit by taking only the ingredient cost off the selling price. Rent, electricity, gas, packaging and their own time get missed, so profit looks big when it is really small. UntungLab counts everything.',
      )}</p>

<h2>${L('Bagaimana kos sebenar dikira', 'How the real cost is worked out')}</h2>
<div class="eq">
  <div class="b"><small>${L('Bahan', 'Ingredients')}</small></div><span>+</span>
  <div class="b"><small>${L('Pembungkusan', 'Packaging')}</small></div><span>+</span>
  <div class="b"><small>${L('Masa kerja', 'Work time')}</small></div><span>+</span>
  <div class="b"><small>${L('Utiliti pengeluaran', 'Production utilities')}</small></div><span>+</span>
  <div class="b"><small>${L('Kos operasi bersama', 'Shared operating costs')}</small></div><span>=</span>
  <div class="b res"><small>${L('Kos Sebenar', 'Real Cost')}</small></div>
</div>
<table class="tb">
<tr><th>${L('Bahagian', 'Part')}</th><th>${L('Apa maksudnya', 'What it means')}</th></tr>
<tr><td>${L('Bahan', 'Ingredients')}</td><td>${L('Kos bahan yang guna dalam satu unit jualan, daripada harga pek yang anda masukkan.', 'The cost of the ingredients used in one unit sold, worked out from the pack prices you entered.')}</td></tr>
<tr><td>${L('Pembungkusan', 'Packaging')}</td><td>${L('Kotak, plastik, sticker dan sebagainya untuk satu unit.', 'Boxes, bags, stickers and so on for one unit.')}</td></tr>
<tr><td>${L('Masa kerja', 'Work time')}</td><td>${L('Masa menyediakan satu unit. Jika anda kerja sendiri, ia dinilai dengan Nilai Masa anda (RM sejam). Jika ada pekerja, ia dinilai dengan kadar sejam purata pasukan, daripada gaji mereka.', 'The time to prepare one unit. If you work alone it is valued at your Time Value (RM per hour). If you have workers it is valued at the team\'s average hourly rate, worked out from their pay.')}</td></tr>
<tr><td>${L('Utiliti pengeluaran', 'Production utilities')}</td><td>${L('Elektrik peralatan seperti oven, ikut watt dan masa guna.', 'Electricity used by equipment such as the oven, from its watts and time in use.')}</td></tr>
<tr><td>${L('Kos operasi bersama', 'Shared operating costs')}</td><td>${L('Sewa, elektrik am, air, internet, gas dan kos lain bisnes, diagihkan secara adil kepada setiap menu.', 'Rent, general electricity, water, internet, gas and other business costs, spread fairly across every menu item.')}</td></tr>
</table>
<div class="eq small">
  <div class="b"><small>${L('Harga Jual', 'Selling Price')}</small></div><span>−</span><div class="b"><small>${L('Kos Sebenar', 'Real Cost')}</small></div><span>=</span><div class="b res"><small>${L('Anggaran Untung', 'Estimated Profit')}</small></div>
</div>
<p>${L(
        '<b>Margin</b> ialah Anggaran Untung dibahagi Harga Jual, dalam peratus. Contoh: untung RM1.25 daripada harga jual RM6.00 ialah margin 20.9%.',
        '<b>Margin</b> is Estimated Profit divided by Selling Price, as a percentage. Example: RM1.25 profit on a RM6.00 selling price is a 20.9% margin.',
      )}</p>

<h2>${L('Status margin', 'Margin status')}</h2>
<p>${L('Setiap menu diberi satu status supaya anda terus nampak mana yang perlu dibetulkan.', 'Every menu item gets one status so you can see straight away which ones need fixing.')}</p>
<table class="tb st4">
<tr><td><span class="pill loss">▼ ${L('Menu Ini Rugi', 'This Menu Is Losing Money')}</span></td><td>${L('Untung kurang daripada RM0. Kos sebenar lebih tinggi daripada harga jual.', 'Profit is below RM0. The real cost is higher than the selling price.')}</td></tr>
<tr><td><span class="pill low">▼ ${L('Margin Rendah', 'Low Margin')}</span></td><td>${L('Margin di bawah 25%.', 'Margin below 25%.')}</td></tr>
<tr><td><span class="pill watch">! ${L('Perlu Perhatian', 'Needs Attention')}</span></td><td>${L('Margin 25% hingga bawah 40%.', 'Margin from 25% up to below 40%.')}</td></tr>
<tr><td><span class="pill ok">✓ ${L('Margin Sihat', 'Healthy Margin')}</span></td><td>${L('Margin 40% ke atas.', 'Margin of 40% or more.')}</td></tr>
</table>
${note(L('Peringkat 25% dan 40% ialah panduan UntungLab, bukan piawaian industri. Anda yang tentukan harga akhir. Jenis perniagaan dan kos tetap anda mungkin memerlukan margin yang lebih tinggi atau lebih rendah.', 'The 25% and 40% levels are UntungLab guidelines, not an industry standard. You decide the final price. Your type of business and fixed costs may call for a higher or lower margin.'))}

<h2>${L('Data anda dan internet', 'Your data and the internet')}</h2>
<ul class="bl">
<li>${L('Semua data (bahan, menu, kos, sejarah harga) disimpan <b>dalam peranti anda</b>. Tiada akaun, tiada log masuk, dan data tidak dihantar ke mana-mana.', 'All your data (ingredients, menus, costs, price history) is stored <b>on your device</b>. No account, no login, and nothing is sent anywhere.')}</li>
<li>${L('UntungLab boleh digunakan <b>tanpa internet</b> selepas dipasang. Internet hanya diperlukan sekali untuk mengaktifkan kod lesen.', 'UntungLab works <b>without internet</b> once installed. Internet is only needed once, to activate the licence code.')}</li>
<li>${L('Kerana data hanya ada pada peranti anda, <b>simpan Backup</b> secara berkala (Bab Backup).', 'Because your data exists only on your device, <b>save a Backup</b> regularly (see the Backup chapter).')}</li>
<li>${L('App ada dalam <b>Bahasa Melayu</b> dan <b>English</b>. Tukar di Tetapan (Bab Tetapan, bahasa dan manual).', 'The app is available in <b>Bahasa Melayu</b> and <b>English</b>. Change it in Settings (see the Settings, language and manual chapter).')}</li>
</ul>

<h2>${L('Versi Percuma dan Versi Penuh', 'Free version and Full version')}</h2>
<table class="tb">
<tr><th></th><th>${L('Versi Percuma', 'Free version')}</th><th>${L('UntungLab Penuh', 'UntungLab Full')}</th></tr>
<tr><td>${L('Menu', 'Menus')}</td><td>2</td><td>${L('Tanpa had', 'No limit')}</td></tr>
<tr><td>${L('Bahan', 'Ingredients')}</td><td>10</td><td>${L('Tanpa had', 'No limit')}</td></tr>
<tr><td>${L('Pembungkusan', 'Packaging')}</td><td>2</td><td>${L('Tanpa had', 'No limit')}</td></tr>
<tr><td>${L('Kos Lain (dalam Kos Operasi)', 'Other costs (in Operating Costs)')}</td><td>3</td><td>${L('Tanpa had', 'No limit')}</td></tr>
<tr><td>${L('Variasi menu', 'Menu variations')}</td><td>${L('Tiada', 'Not included')}</td><td>${L('Ya', 'Yes')}</td></tr>
<tr><td>${L('Import bahan daripada Excel', 'Import ingredients from Excel')}</td><td>${L('Tiada', 'Not included')}</td><td>${L('Ya', 'Yes')}</td></tr>
<tr><td>${L('Fungsi lain', 'Everything else')}</td><td colspan="2">${L('Sama dalam kedua-duanya', 'The same in both')}</td></tr>
<tr><td>${L('Bayaran', 'Payment')}</td><td>${L('Percuma', 'Free')}</td><td>${L('Sekali bayar, guna selamanya, 2 peranti', 'One payment, use it for good, 2 devices')}</td></tr>
</table>
`,
    ),
  );

  // ---------------------------------------------------------------- 2
  body.push(
    chapter(
      'pasang',
      L('Pasang dan mula guna', 'Install and get started'),
      L('Tambah UntungLab ke skrin utama, aktifkan kod lesen dan ikut senarai Mula di sini.', 'Add UntungLab to your home screen, activate your licence code and follow the Start here list.'),
      `
<h2>${L('1. Pasang di skrin utama', '1. Add it to your home screen')}</h2>
<p>${L(
        'UntungLab ialah app web, jadi tiada Play Store atau App Store. Anda tambah ia ke skrin utama sekali sahaja dan ia berfungsi seperti app biasa. <b>Pasang dan buka sekali semasa ada internet</b> supaya ia boleh dipakai tanpa internet selepas itu.',
        'UntungLab is a web app, so there is no Play Store or App Store. You add it to your home screen once and it behaves like a normal app. <b>Install and open it once while you have internet</b> so it works offline afterwards.',
      )}</p>
<div class="inst">
 <div class="c"><h3>${L('iPhone / iPad (Safari)', 'iPhone / iPad (Safari)')}</h3><div class="mk">${INSTALL_MOCKS.iosA}${INSTALL_MOCKS.iosB}</div>
  ${steps(L('Buka UntungLab di <b>Safari</b>.', 'Open UntungLab in <b>Safari</b>.'), L('Tekan butang <b>Kongsi</b> (kotak dengan anak panah ke atas) di bawah skrin.', 'Tap the <b>Share</b> button (a box with an arrow pointing up) at the bottom of the screen.'), L('Tatal dan pilih <b>Tambah ke Skrin Utama</b>.', 'Scroll and tap <b>Add to Home Screen</b>.'), L('Tekan <b>Tambah</b>. Ikon UntungLab muncul di skrin anda.', 'Tap <b>Add</b>. The UntungLab icon appears on your screen.'))}</div>
 <div class="c"><h3>${L('Android (Chrome)', 'Android (Chrome)')}</h3><div class="mk">${INSTALL_MOCKS.andA}${INSTALL_MOCKS.andB}</div>
  ${steps(L('Buka UntungLab di <b>Chrome</b>.', 'Open UntungLab in <b>Chrome</b>.'), L('Tekan menu <b>⋮</b> (tiga titik) di penjuru atas.', 'Tap the <b>⋮</b> menu (three dots) at the top corner.'), L('Pilih <b>Pasang app</b> atau <b>Tambah ke skrin utama</b>.', 'Choose <b>Install app</b> or <b>Add to Home screen</b>.'), L('Tekan <b>Pasang</b>. Ikon UntungLab muncul di skrin anda.', 'Tap <b>Install</b>. The UntungLab icon appears on your screen.'))}
  <div class="call warn small"><b>${L('Amaran "app tidak selamat"?', 'An "unsafe app" warning?')}</b> ${L('Itu amaran biasa Android atau Google Play Protect untuk app yang dipasang dari web. UntungLab tidak mengambil data anda. Tekan <b>Lagi butiran</b>, kemudian <b>Pasang juga</b>. Jika tidak pasti, guna UntungLab terus di Chrome tanpa memasangnya.', 'This is a normal Android or Google Play Protect warning for apps installed from the web. UntungLab does not collect your data. Tap <b>More details</b>, then <b>Install anyway</b>. If you are unsure, just use UntungLab in Chrome without installing it.')}</div></div>
 <div class="c wide"><h3>${L('Komputer (Chrome atau Edge)', 'Computer (Chrome or Edge)')}</h3><div class="mk w">${INSTALL_MOCKS.deskA}${INSTALL_MOCKS.deskB}</div>
  ${steps(L('Buka UntungLab di Chrome atau Edge.', 'Open UntungLab in Chrome or Edge.'), L('Cari ikon <b>Pasang</b> di hujung bar alamat (atas, sebelah kanan), atau tekan menu <b>⋮</b> dan pilih <b>Pasang UntungLab</b>.', 'Look for the <b>Install</b> icon at the end of the address bar (top right), or open the <b>⋮</b> menu and choose <b>Install UntungLab</b>.'), L('Tekan <b>Pasang</b>. UntungLab dibuka dalam tetingkapnya sendiri.', 'Click <b>Install</b>. UntungLab opens in its own window.'))}</div>
</div>
${note(L('Pasang di telefon yang anda guna untuk berniaga. Data disimpan pada peranti itu sahaja. Telefon lain yang memasang UntungLab ada data kosong sendiri, kecuali anda pulihkan Backup.', 'Install it on the phone you use for your business. Data is stored on that device only. Another phone with UntungLab installed starts empty, unless you restore a Backup.'))}

<h2>${L('2. Aktifkan kod lesen', '2. Activate your licence code')}</h2>
<p>${L(
        'Selepas bayar, anda dapat kod lesen berbentuk <b>UL-XXXX-XXXX-XXXX</b> di skrin bayaran dan melalui emel. Jika emel tiada dalam Inbox, semak <b>Spam</b>, <b>Promotions</b> atau <b>Important</b>.',
        'After paying, you receive a licence code that looks like <b>UL-XXXX-XXXX-XXXX</b> on the payment screen and by email. If the email is not in your Inbox, check <b>Spam</b>, <b>Promotions</b> or <b>Important</b>.',
      )}</p>
${steps(
        L('Tekan butang <b>Buka UntungLab &amp; aktifkan</b> di skrin bayaran. Kod terisi sendiri. Atau buka <b>Lesen</b> dalam app dan taip atau tampal kod.', 'Tap <b>Open UntungLab &amp; activate</b> on the payment screen. The code fills in by itself. Or open <b>Licence</b> in the app and type or paste the code.'),
        L('Tekan <b>Aktifkan</b>. Anda perlu internet untuk langkah ini sahaja.', 'Tap <b>Activate</b>. You need internet for this step only.'),
        L('Skrin Lesen bertukar kepada <b>UntungLab Penuh</b> dan semua had dibuka.', 'The Licence screen changes to <b>UntungLab Full</b> and all limits are lifted.'),
      )}
${figs(fig('03-lesen-percuma', L('Skrin Lesen (Versi Percuma).', 'The Licence screen (Free version).'), [L('Ruang kod lesen.', 'Licence code field.'), L('Butang Aktifkan.', 'The Activate button.')]), fig('04-lesen-pro', L('Selepas aktif: UntungLab Penuh.', 'After activating: UntungLab Full.')))}

<h2>${L('3. Ikut senarai Mula di sini', '3. Follow the Start here list')}</h2>
<p>${L(
        'Bila anda belum ada menu, Dashboard menunjukkan senarai tujuh langkah. Siapkan langkah 1 hingga 4 dahulu, kemudian cipta menu pertama. Bahagian ini tersusun supaya kos operasi sudah ada sebelum menu dikira.',
        'While you have no menu yet, the Dashboard shows a list of seven steps. Finish steps 1 to 4 first, then create your first menu. The order makes sure your operating costs are in place before a menu is calculated.',
      )}</p>
<table class="tb">
<tr><td>1</td><td>${L('Nyatakan <b>kerja sendiri atau ada pekerja</b>, dan kos masa anda (Kos Operasi)', 'Say whether you <b>work alone or have workers</b>, and set your time cost (Operating Costs)')}</td></tr>
<tr><td>2</td><td>${L('Isi semua <b>6 kategori Kos Operasi</b>. RM0 jika tiada kos itu', 'Fill in all <b>6 Operating Cost categories</b>. RM0 if you have no such cost')}</td></tr>
<tr><td>3</td><td>${L('Isi <b>Anggaran Jualan Bulanan</b>', 'Fill in <b>Estimated Monthly Sales</b>')}</td></tr>
<tr><td>4</td><td>${L('Tambah <b>bahan</b> pertama anda', 'Add your first <b>ingredient</b>')}</td></tr>
<tr><td>5</td><td>${L('Tambah <b>pembungkusan</b> <i>(pilihan)</i>', 'Add <b>packaging</b> <i>(optional)</i>')}</td></tr>
<tr><td>6</td><td>${L('Tambah <b>peralatan</b> <i>(pilihan)</i>', 'Add <b>equipment</b> <i>(optional)</i>')}</td></tr>
<tr><td>7</td><td>${L('Cipta <b>menu</b> pertama', 'Create your first <b>menu</b>')}</td></tr>
</table>

<h2>${L('4. Bergerak dalam app', '4. Moving around the app')}</h2>
<p>${L(
        'Di telefon, bar bawah ada empat pilihan utama: Dashboard, Menu, Bahan dan Kesan Harga. Pilihan lain (Pembungkusan, Peralatan Saya, Jejak Harga, Kos Operasi, Laporan, Backup, Lesen, Tetapan, Manual) ada di bawah <b>Lagi</b>. Di skrin besar, semua pilihan ada di menu sisi.',
        'On a phone, the bottom bar has four main choices: Dashboard, Menu, Ingredients and Price Impact. Everything else (Packaging, My Equipment, Price Tracker, Operating Costs, Report, Backup, Licence, Settings, Manual) is under <b>More</b>. On a large screen, all choices are in the side menu.',
      )}</p>
${figs(fig('01-mula', L('Dashboard bila belum ada menu: senarai Mula di sini.', 'The Dashboard before you have a menu: the Start here list.'), [L('Senarai langkah dan kemajuan.', 'The list of steps and your progress.'), L('Langkah pertama.', 'The first step.')]), fig('02-lagi', L('Menu Lagi di telefon.', 'The More menu on a phone.')))}
`,
    ),
  );

  // ---------------------------------------------------------------- 3
  body.push(
    chapter(
      'operasi',
      L('Kos Operasi', 'Operating Costs'),
      L('Kos bisnes yang dikongsi semua menu: sewa, elektrik, air, internet, gas dan kos lain, serta siapa yang buat kerja.', 'The business costs every menu item shares: rent, electricity, water, internet, gas and other costs, plus who does the work.'),
      `
<p>${L(
        'Isi bahagian ini <b>sekali sahaja</b>. UntungLab membahagikan kos itu kepada setiap menu mengikut jualan, jadi anda tak perlu isi semula dalam setiap menu. Semua <b>6 baris wajib diisi</b>. Kalau anda tiada kos itu, tekan <b>Tiada kos ini (RM0)</b> supaya UntungLab tahu ia bukan terlupa. Untuk kebanyakan baris, anda cuma perlu <b>bil bulanan</b> dan <b>peratus yang digunakan untuk bisnes</b>.',
        'Fill this in <b>once</b>. UntungLab spreads these costs across every menu item according to sales, so you do not repeat them in each menu. All <b>6 rows are required</b>. If you have no such cost, tap <b>No such cost (RM0)</b> so UntungLab knows it was not forgotten. For most rows you only need the <b>monthly bill</b> and the <b>percentage used for the business</b>.',
      )}</p>

<h2>${L('Siapa buat kerja?', 'Who does the work?')}</h2>
<p>${L('Kos masa dalam setiap menu bergantung pada siapa yang menyediakannya. Pilih satu:', 'The time cost in every menu depends on who prepares it. Choose one:')}</p>
<ul class="bl">
<li><b>${L('Kerja sendiri', 'Working alone')}</b>: ${L('isi <b>Nilai Masa (RM sejam)</b>, iaitu berapa nilai satu jam kerja anda. Contoh: RM15 sejam, jadi 30 minit menyediakan menu dikira RM7.50.', 'fill in your <b>Time Value (RM per hour)</b>, which is what one hour of your work is worth. Example: RM15 an hour, so 30 minutes of preparation counts as RM7.50.')}</li>
<li><b>${L('Ada pekerja', 'I have workers')}</b>: ${L('tambah setiap pekerja dengan <b>gaji sebulan</b>, <b>hari sebulan</b> (chip 26 atau 22) dan <b>jam sehari</b> (biasanya 8). UntungLab kira <b>kadar sejam pasukan</b> = jumlah gaji ÷ jumlah jam kerja, dan guna kadar itu menggantikan Nilai Masa. Anda boleh masukkan diri sendiri sebagai pekerja.', 'add each worker with <b>monthly pay</b>, <b>days per month</b> (chips 26 or 22) and <b>hours per day</b> (usually 8). UntungLab works out the <b>team hourly rate</b> = total pay ÷ total working hours, and uses it in place of Time Value. You can list yourself as a worker.')}</li>
</ul>
${figs(fig('05a-kos-operasi-atas', L('Pilihan kerja sendiri atau ada pekerja.', 'Choosing between working alone and having workers.'), [L('Kad Siapa buat kerja?', 'The Who does the work? card.'), L('Pilih Kerja sendiri atau Ada pekerja.', 'Choose Working alone or I have workers.')]), fig('05c-pekerja-borang', L('Menambah seorang pekerja.', 'Adding a worker.'), [L('Nama pekerja.', 'Worker name.'), L('Gaji sebulan.', 'Monthly pay.'), L('Chip hari sebulan: 26 (6 hari seminggu) atau 22 (5 hari seminggu).', 'Days-per-month chips: 26 (6-day week) or 22 (5-day week).'), L('Jam sehari.', 'Hours per day.')]), fig('05d-pekerja-senarai', L('Senarai pekerja dan kadar sejam pasukan.', 'The workers list and the team hourly rate.'), [L('Mod Ada pekerja dipilih.', 'I have workers is selected.'), L('Setiap pekerja dengan kadar sejamnya.', 'Each worker with their hourly rate.'), L('Kadar sejam pasukan yang digunakan dalam semua menu.', 'The team hourly rate used in every menu.')]))}
${note(L('Gaji pekerja <b>sudah masuk dalam kos masa</b> setiap menu, jadi jangan masukkan lagi dalam Kos Operasi. Kos pekerja dikira daripada gaji sahaja; caruman majikan seperti KWSP dan PERKESO tidak ditambah secara automatik. Menukar antara Kerja sendiri dan Ada pekerja tidak memadam apa-apa data.', 'Workers\' pay is <b>already part of the time cost</b> of every menu item, so do not enter it again in Operating Costs. Worker cost comes from pay only; employer contributions such as EPF and SOCSO are not added automatically. Switching between Working alone and I have workers does not delete any data.'))}

<h2>${L('Tetapan bisnes dan ringkasan', 'Business settings and summary')}</h2>
<ul class="bl">
<li><b>${L('Nama dan jenis bisnes', 'Business name and type')}</b> ${L('(pilihan).', '(optional).')}</li>
<li><b>${L('Anggaran Jualan Bulanan (RM)', 'Estimated Monthly Sales (RM)')}</b>: ${L('jumlah jualan yang anda jangka dalam sebulan. Ia digunakan untuk mengagihkan kos operasi. Tanpa nombor ini, kadar kos operasi tidak dapat dikira.', 'the sales you expect in a month. It is used to spread operating costs. Without this number the operating cost rate cannot be worked out.')}</li>
</ul>
${figs(fig('05b-kos-operasi-senarai', L('Ringkasan dan enam kategori.', 'The summary and the six categories.'), [L('Jumlah kos operasi bersama sebulan.', 'Total shared operating costs per month.'), L('Kadar Kos Operasi.', 'The Operating Cost Rate.'), L('Tekan satu baris untuk isi atau sunting.', 'Tap a row to fill it in or edit it.')]), fig('08-kos-operasi-siap', L('Semua kategori diisi.', 'All categories filled in.'), [L('Jumlah RM340.00 sebulan dan kadar 14.2%.', 'RM340.00 per month in total and a 14.2% rate.')]))}
<p>${L(
        '<b>Kadar Kos Operasi</b> ialah jumlah kos sebulan dibahagi Anggaran Jualan Bulanan. Dalam contoh di atas, RM340.00 dibahagi RM2,400 ialah 14.2%. Maknanya setiap RM1 jualan menanggung RM0.142 kos operasi.',
        'The <b>Operating Cost Rate</b> is the total monthly cost divided by Estimated Monthly Sales. In the example above, RM340.00 divided by RM2,400 is 14.2%. That means every RM1 of sales carries RM0.142 of operating cost.',
      )}</p>

<h2>${L('Elektrik, Air, Internet / Telefon dan Gas: bil × peratus', 'Electricity, Water, Internet / Phone and Gas: bill × percentage')}</h2>
<p>${L('Empat baris ini diisi dengan cara yang sama. Pilih <b>Kira dari bil</b>:', 'These four rows work the same way. Choose <b>Calculate from bill</b>:')}</p>
${steps(
        L('Isi <b>Bil sebulan (RM)</b>, contoh bil elektrik RM200.', 'Enter the <b>Monthly bill (RM)</b>, for example an electricity bill of RM200.'),
        L('Pilih <b>% digunakan untuk bisnes</b> dengan chip <b>3%, 5%, 10%, 15%, 20%</b>, atau tekan <b>Lain-lain</b> dan taip sendiri. Anggaran kasar sudah memadai.', 'Pick the <b>% used for the business</b> with the chips <b>3%, 5%, 10%, 15%, 20%</b>, or tap <b>Other</b> and type your own. A rough estimate is enough.'),
        L('Semak <b>Hasil pengiraan</b>. Contoh: RM200 × 5% = RM10.00 sebulan. Tekan <b>Simpan</b>.', 'Check the <b>Calculated result</b>. Example: RM200 × 5% = RM10.00 per month. Tap <b>Save</b>.'),
      )}
<p>${L('Kalau anda sudah tahu jumlah bulanan yang tepat, pilih <b>Jumlah terus</b> dan taip jumlah RM sebulan. Jumlah terus yang anda isi sebelum ini masih dikira seperti biasa.', 'If you already know the exact monthly amount, choose <b>Direct amount</b> and type the RM per month. A direct amount you entered earlier is still counted as usual.')}</p>
${figs(fig('07-elektrik', L('Elektrik: bil sebulan × peratus bisnes.', 'Electricity: monthly bill × business percentage.'), [L('Bil sebulan.', 'Monthly bill.'), L('Chip peratus untuk bisnes.', 'Business percentage chips.'), L('Hasil pengiraan.', 'The calculated result.')]), fig('07b-elektrik-kadar', L('Kadar elektrik dengan chip panduan.', 'The electricity rate with guide chips.'), [L('Kadar elektrik (RM sekilowatt jam).', 'Electricity rate (RM per kilowatt hour).'), L('Chip panduan RM0.25, RM0.35 dan RM0.45.', 'Guide chips RM0.25, RM0.35 and RM0.45.'), L('Simpan kadar.', 'Save rate.')]))}
${warn(L('<b>Peratus Elektrik ialah untuk elektrik am sahaja</b> (lampu, peti sejuk, penghawa dingin). Elektrik oven, mixer atau peralatan pengeluaran dikira dalam setiap menu daripada Peralatan Saya. Kalau dimasukkan di sini juga, ia dikira dua kali.', '<b>The Electricity percentage is for general electricity only</b> (lights, fridge, air conditioning). Electricity used by the oven, mixer or other production equipment is counted in each menu from My Equipment. If you include it here too, it is counted twice.'))}
<h3 style="margin-top:3mm">${L('Kadar elektrik untuk peralatan', 'The electricity rate for equipment')}</h3>
<p>${L('Untuk kos elektrik peralatan dikira dalam setiap menu, isi Elektrik dengan <b>Kira dari bil</b> dan simpan <b>Kadar elektrik (RM sekilowatt jam)</b>. Chip RM0.25, RM0.35 dan RM0.45 ialah anggaran panduan sahaja; semak bil TNB anda untuk angka tepat. Kalau Elektrik diisi sebagai <b>Jumlah terus</b>, bil penuh sudah ada dalam Kos Operasi, jadi peralatan tidak dikira lagi supaya tiada kiraan dua kali.', 'For equipment electricity to be counted in each menu, fill in Electricity with <b>Calculate from bill</b> and save the <b>Electricity rate (RM per kilowatt hour)</b>. The RM0.25, RM0.35 and RM0.45 chips are rough guides only; check your TNB bill for the exact figure. If Electricity is entered as a <b>Direct amount</b>, the full bill is already in Operating Costs, so equipment is not counted again and nothing is counted twice.')}</p>

<h2>${L('Ruang Kerja', 'Workspace')}</h2>
<p>${L('Ruang Kerja ada dua cara: <b>Mudah</b> (taip jumlah RM sebulan) atau <b>Kira Lebih Tepat</b>: kos rumah atau sewa × peratus ruang yang digunakan (<b>Isi peratus</b>), atau ikut keluasan rumah dan keluasan bisnes (<b>Kira ikut keluasan</b>). Kembali ke Mudah tidak memadam butiran Lebih Tepat anda.', 'Workspace has two ways: <b>Simple</b> (type the RM per month) or <b>More Accurate calculation</b>: home cost or rent × the percentage of space used (<b>Enter a percentage</b>), or from the house area and business area (<b>Calculate by area</b>). Going back to Simple does not delete your More Accurate details.')}</p>
${figs(fig('06-ruang-kerja', L('Ruang Kerja dalam mod Kira Lebih Tepat.', 'Workspace in More Accurate calculation mode.'), [L('Pilih Mudah atau Kira Lebih Tepat.', 'Choose Simple or More Accurate calculation.'), L('Mod Kira Lebih Tepat dipilih.', 'More Accurate calculation is selected.'), L('Kos rumah atau sewa sebulan.', 'Home cost or rent per month.'), L('Peratus ruang digunakan.', 'Percentage of space used.')]))}

<h2>${L('Kos Lain: senarai', 'Other Costs: a list')}</h2>
<p>${L('Kos Lain ialah senarai. Tambah setiap kos bulanan satu demi satu: tekan cadangan (Penghantaran, Telefon dan internet, Pengangkutan, Iklan, Yuran platform) atau taip nama sendiri, isi jumlah sebulan, dan tekan <b>Tambah kos lain</b>. Jumlah semua item ialah kos Kos Lain anda. Versi Percuma boleh simpan 3 item.', 'Other Costs is a list. Add each monthly cost one by one: tap a suggestion (Delivery, Phone and internet, Transport, Ads, Platform fees) or type your own name, enter the amount per month, and tap <b>Add other cost</b>. The total of all items is your Other Costs figure. The Free version can store 3 items.')}</p>
${figs(fig('07c-kos-lain', L('Menambah satu kos lain.', 'Adding one other cost.'), [L('Cadangan nama kos.', 'Suggested cost names.'), L('Jumlah sebulan.', 'Amount per month.'), L('Tambah kos lain.', 'Add other cost.')]))}
${tip(L('Tiada kos lain? Tekan <b>Tiada kos ini (RM0)</b>. Dalam senarai Kos Operasi, baris yang sudah diisi tunjuk jumlahnya, mod (contoh Mudah atau Lebih Tepat) dan butang <b>Sunting</b>.', 'No other costs? Tap <b>No such cost (RM0)</b>. In the Operating Costs list, a row that is filled in shows its amount, its mode (for example Simple or More Accurate) and an <b>Edit</b> button.'))}
`,
    ),
  );

  // ---------------------------------------------------------------- 4
  body.push(
    chapter(
      'bahan',
      L('Bahan', 'Ingredients'),
      L('Masukkan harga beli dan saiz pek. UntungLab kira kos seunit dan jejak setiap perubahan harga.', 'Enter the purchase price and pack size. UntungLab works out the unit cost and tracks every price change.'),
      `
${steps(L('Buka <b>Bahan</b> dan tekan <b>Tambah bahan</b>.', 'Open <b>Ingredients</b> and tap <b>Add ingredient</b>.'), L('Isi <b>Nama</b>, <b>Harga beli (RM)</b>, <b>Kuantiti dalam pek</b> dan <b>Unit pek</b> (contoh kg, g, l, ml, biji, pek, kotak).', 'Fill in <b>Name</b>, <b>Purchase price (RM)</b>, <b>Quantity in pack</b> and <b>Pack unit</b> (for example kg, g, l, ml, pcs, pack, box).'), L('Semak <b>Kos seunit</b> yang dikira sendiri, kemudian tekan <b>Simpan</b>.', 'Check the <b>Unit cost</b> that is worked out for you, then tap <b>Save</b>.'))}
<p>${L('Contoh: butter 250 g berharga RM12 menjadi <b>RM48.00 sekilogram</b>. Kos seunit inilah yang digunakan dalam resipi menu anda.', 'Example: 250 g of butter at RM12 becomes <b>RM48.00 per kilogram</b>. This unit cost is what your menu recipes use.')}</p>
${figs(fig('09-bahan-tambah', L('Menambah bahan.', 'Adding an ingredient.'), [L('Nama bahan.', 'Ingredient name.'), L('Harga beli satu pek.', 'Purchase price of one pack.'), L('Kuantiti dalam pek.', 'Quantity in the pack.'), L('Unit pek.', 'Pack unit.'), L('Kos seunit dikira sendiri.', 'Unit cost worked out for you.')]), fig('10-bahan-senarai', L('Senarai bahan.', 'The ingredients list.'), [L('Tambah bahan.', 'Add ingredient.'), L('Satu bahan: nama, harga pek dan kos seunit. Tekan untuk sunting.', 'One ingredient: name, pack price and unit cost. Tap to edit.')]))}

<h2>${L('Import daripada Excel (Versi Penuh)', 'Import from Excel (Full version)')}</h2>
<p>${L('Ada banyak bahan? Masukkan sekaligus dengan fail Excel atau Google Sheets. Ia berfungsi tanpa internet.', 'Have many ingredients? Add them in one go with an Excel or Google Sheets file. It works without internet.')}</p>
${steps(
        L('Tekan <b>Import Excel</b>, kemudian <b>Muat turun templat</b>. Templat sudah ada 14 bahan biasa (nama dan unit sahaja).', 'Tap <b>Import Excel</b>, then <b>Download template</b>. The template already lists 14 common ingredients (name and unit only).'),
        L('Buka di Excel atau Google Sheets. Isi <b>harga beli</b> dan <b>kuantiti dalam pek</b>, dan tambah baris sendiri. Lajur unit ada senarai pilihan. Simpan sebagai .xlsx atau .csv.', 'Open it in Excel or Google Sheets. Fill in the <b>purchase price</b> and <b>quantity in pack</b>, and add your own rows. The unit column has a drop-down list. Save as .xlsx or .csv.'),
        L('Tekan <b>Pilih fail</b>. UntungLab menunjukkan <b>pratonton</b>: bahan baharu, harga dikemas kini, tiada perubahan, baris kosong dilangkau, dan <b>baris bermasalah</b> dengan nombor baris serta sebabnya. Belum ada apa disimpan.', 'Tap <b>Choose file</b>. UntungLab shows a <b>preview</b>: new ingredients, price updates, no change, blank rows skipped, and <b>problem rows</b> with the row number and the reason. Nothing is saved yet.'),
        L('Tekan <b>Import</b> untuk menyimpan baris yang betul.', 'Tap <b>Import</b> to save the rows that are fine.'),
      )}
${figs(fig('09c-bahan-import', L('Import bahan: templat, fail dan pratonton.', 'Importing ingredients: template, file and preview.'), [L('Muat turun templat.', 'Download the template.'), L('Pilih fail yang sudah diisi.', 'Choose the filled-in file.'), L('Pratonton: tiada apa disimpan lagi.', 'Preview: nothing is saved yet.'), L('Baris bermasalah tidak diimport; yang betul masih boleh.', 'Problem rows are not imported; the good rows still can be.')]))}
${note(L('Bahan dengan <b>nama yang sama</b> (huruf besar atau kecil tidak penting) <b>dikemas kini harganya</b>, bukan ditambah dua kali, dan perubahan direkod dalam Jejak Harga. Baris yang cuma ada nama tanpa harga dan kuantiti dilangkau. Versi Percuma boleh isi bahan satu demi satu.', 'An ingredient with the <b>same name</b> (upper or lower case does not matter) has its <b>price updated</b> instead of being added twice, and the change is recorded in the Price Tracker. A row with only a name and no price or quantity is skipped. The Free version adds ingredients one by one.'))}

<h2>${L('Mapping pek (pilihan)', 'Pack mapping (optional)')}</h2>
<p>${L('Pakai bila anda beli dalam satu unit tetapi guna dalam unit lain. Contoh: telur dibeli dalam pek, tetapi resipi guna biji. Tekan <b>Mapping pek</b> dan nyatakan berapa. Contoh: 1 pek = 12 biji.', 'Use it when you buy in one unit but use another. Example: eggs are bought by the pack but the recipe uses pieces. Open <b>Pack mapping</b> and say how many. Example: 1 pack = 12 pieces.')}</p>
${figs(fig('09b-bahan-pemetaan', L('Mapping pek, tarikh beli dan pembekal.', 'Pack mapping, purchase date and supplier.')))}
<h2>${L('Harga naik atau turun', 'When a price goes up or down')}</h2>
<p>${L('Bila harga bahan berubah, edit bahan itu dan tukar harga atau saiz pek. Perubahan direkod dalam <b>Jejak Harga</b>, dan semua menu terus menggunakan harga baharu. Mahu cuba dahulu tanpa mengubah apa-apa? Guna <b>Kesan Harga</b>.', 'When an ingredient\'s price changes, edit it and change the price or pack size. The change is recorded in the <b>Price Tracker</b>, and every menu uses the new price straight away. Want to try it first without changing anything? Use <b>Price Impact</b>.')}</p>
<h2>${L('Arkib', 'Archive')}</h2>
<p>${L('Bahan yang tidak lagi digunakan boleh diarkibkan (butang <b>Arkib</b> dalam skrin sunting). Ia hilang daripada senarai tetapi menu lama tidak rosak. Tekan <b>Tunjuk yang diarkib</b> untuk melihatnya dan <b>Pulihkan</b> bila perlu.', 'An ingredient you no longer use can be archived (the <b>Archive</b> button on the edit screen). It disappears from the list but old menus are not broken. Tap <b>Show archived</b> to see it and <b>Restore</b> when needed.')}</p>
${note(L('Versi Percuma: sehingga 10 bahan. Data sedia ada tetap boleh disunting bila had dicapai.', 'Free version: up to 10 ingredients. Existing data can still be edited once the limit is reached.'))}
`,
    ),
  );

  // ---------------------------------------------------------------- 5
  body.push(
    chapter(
      'pembungkusan',
      L('Pembungkusan', 'Packaging'),
      L('Kotak, plastik, cawan, sticker dan apa sahaja yang pergi bersama setiap jualan.', 'Boxes, bags, cups, stickers and anything else that goes out with each sale.'),
      `
${steps(L('Buka <b>Pembungkusan</b> (di bawah <b>Lagi</b> pada telefon) dan tekan <b>Tambah pembungkusan</b>.', 'Open <b>Packaging</b> (under <b>More</b> on a phone) and tap <b>Add packaging</b>.'), L('Isi <b>Nama</b>, <b>Harga beli (RM)</b> dan <b>Bilangan dalam satu beli</b>, contoh 50 keping.', 'Fill in <b>Name</b>, <b>Purchase price (RM)</b> and <b>Number in one purchase</b>, for example 50 pieces.'), L('Semak <b>Kos seunit</b>, kemudian <b>Simpan</b>.', 'Check the <b>Unit cost</b>, then <b>Save</b>.'))}
<p>${L('Contoh: kotak kek RM30 untuk 50 keping ialah <b>RM0.60 sekeping</b>.', 'Example: cake boxes at RM30 for 50 pieces come to <b>RM0.60 each</b>.')}</p>
${figs(fig('11-pembungkusan-tambah', L('Menambah pembungkusan.', 'Adding packaging.'), [L('Nama.', 'Name.'), L('Harga beli.', 'Purchase price.'), L('Bilangan dalam satu beli.', 'Number in one purchase.'), L('Kos seunit.', 'Unit cost.')]), fig('12-pembungkusan-senarai', L('Senarai pembungkusan.', 'The packaging list.'), [L('Tambah pembungkusan.', 'Add packaging.')]))}
${tip(L('Dalam menu, anda pilih sama ada kuantiti pembungkusan itu <b>setiap unit dijual</b> (contoh: 1 kotak setiap brownies) atau <b>setiap batch</b> (contoh: 1 beg besar untuk keseluruhan batch).', 'In a menu you choose whether the packaging quantity is <b>each unit sold</b> (for example 1 box per brownie) or <b>each batch</b> (for example 1 large bag for the whole batch).'))}
${note(L('Versi Percuma: sehingga 2 pembungkusan.', 'Free version: up to 2 packaging items.'))}
`,
    ),
  );

  // ---------------------------------------------------------------- 6
  body.push(
    chapter(
      'peralatan',
      L('Peralatan Saya', 'My Equipment'),
      L('Oven, mixer dan peralatan lain. Watt digunakan untuk mengira kos elektrik setiap batch.', 'Oven, mixer and other equipment. Watts are used to work out the electricity cost of each batch.'),
      `
${steps(L('Buka <b>Peralatan Saya</b> dan tekan <b>Tambah peralatan</b>.', 'Open <b>My Equipment</b> and tap <b>Add equipment</b>.'), L('Cari dalam senarai (contoh Oven, Air fryer, Blender), atau pilih <b>Peralatan sendiri</b> dan taip namanya.', 'Search the list (for example Oven, Air fryer, Blender), or choose <b>My own equipment</b> and type its name.'), L('Semak <b>Watt (W)</b>. Nilai yang dicadangkan ialah anggaran, jadi semak label pada peralatan anda dan ubah jika berbeza.', 'Check the <b>Watts (W)</b>. The suggested value is an estimate, so check the label on your equipment and change it if it differs.'), L('Tekan <b>Simpan</b>.', 'Tap <b>Save</b>.'))}
${figs(fig('13-peralatan-pilih', L('Pilih peralatan.', 'Choosing equipment.'), [L('Cari peralatan.', 'Search for equipment.'), L('Pilih daripada senarai.', 'Pick from the list.'), L('Atau tambah peralatan sendiri.', 'Or add your own equipment.')]), fig('14-peralatan-watt', L('Nama dan watt.', 'Name and watts.'), [L('Nama peralatan.', 'Equipment name.'), L('Watt (W). Ada pada label peralatan.', 'Watts (W). Found on the equipment label.')]), fig('15-peralatan-senarai', L('Peralatan dengan tanda anggaran. Tekan <b>Guna nilai ini</b> untuk mengesahkan nilai watt.', 'Equipment with an estimate badge. Tap <b>Use this value</b> to confirm the watts.')))}
<p>${L('Kos elektrik dikira dalam <b>setiap menu</b>: watt ÷ 1000 × jam guna × kadar elektrik. Untuk ini berfungsi, kadar elektrik mesti disimpan dalam <b>Kos Operasi</b> (Elektrik, Kira dari bil). Kalau Elektrik diisi sebagai Jumlah terus, peralatan tidak dikira dalam menu.', 'Electricity cost is worked out in <b>each menu</b>: watts ÷ 1000 × hours used × electricity rate. For this to work, the electricity rate must be saved in <b>Operating Costs</b> (Electricity, Calculate from bill). If Electricity is entered as a Direct amount, equipment is not counted in menus.')}</p>
`,
    ),
  );

  // ---------------------------------------------------------------- 7
  body.push(
    chapter(
      'menu',
      L('Menu', 'Menu'),
      L('Cipta menu, lihat kos sebenar, untung dan margin, kumpulkan dalam kategori, buat variasi, dan dapatkan cadangan harga.', 'Create menu items, see the real cost, profit and margin, group them in categories, make variations, and get a price suggestion.'),
      `
<h2>${L('Cipta menu', 'Create a menu item')}</h2>
${steps(L('Buka <b>Menu</b> dan tekan <b>Tambah menu</b>.', 'Open <b>Menu</b> and tap <b>Add menu</b>.'), L('Isi maklumat asas (lihat di bawah).', 'Fill in the basics (see below).'), L('Tambah <b>bahan</b>, <b>pembungkusan</b> dan <b>peralatan</b> yang digunakan.', 'Add the <b>ingredients</b>, <b>packaging</b> and <b>equipment</b> used.'), L('Lihat <b>Ringkasan langsung</b> di bahagian atas yang berubah semasa anda mengisi, kemudian tekan <b>Simpan menu</b>.', 'Watch the <b>Live summary</b> at the top change as you fill in, then tap <b>Save menu</b>.'))}
<table class="tb">
<tr><th>${L('Ruang', 'Field')}</th><th>${L('Isi apa', 'What to enter')}</th></tr>
<tr><td>${L('Nama menu', 'Menu name')}</td><td>${L('Contoh: Standard Brownies.', 'Example: Standard Brownies.')}</td></tr>
<tr><td>${L('Kategori (pilihan)', 'Category (optional)')}</td><td>${L('Contoh: Kek, Kuih, Nasi. Menu dalam kategori yang sama dikumpulkan dalam senarai.', 'Example: Cakes, Kuih, Rice. Menus in the same category are grouped in the list.')}</td></tr>
<tr><td>${L('Hasil setiap batch', 'Yield per batch')}</td><td>${L('Berapa unit siap dijual daripada satu kali masak. Contoh: 1 batch = 20 keping.', 'How many units are ready to sell from one cook. Example: 1 batch = 20 pieces.')}</td></tr>
<tr><td>${L('Masa penyediaan setiap batch (minit)', 'Preparation time per batch (minutes)')}</td><td>${L('Jumlah masa kerja untuk satu batch.', 'The total working time for one batch.')}</td></tr>
<tr><td>${L('Harga Jual seunit (RM)', 'Selling Price per unit (RM)')}</td><td>${L('Harga anda jual satu unit. Kos hanya dikira bila harga lebih daripada RM0.', 'The price you sell one unit for. Costs are only worked out when the price is above RM0.')}</td></tr>
</table>
${figs(fig('20-menu-asas', L('Maklumat asas menu.', 'The basics of a menu item.'), [L('Nama menu.', 'Menu name.'), L('Hasil setiap batch.', 'Yield per batch.'), L('Masa penyediaan.', 'Preparation time.'), L('Harga Jual seunit.', 'Selling Price per unit.')]), fig('21-menu-bahan', L('Bahan dalam menu.', 'Ingredients in a menu item.'), [L('Pilih bahan.', 'Choose an ingredient.'), L('Kuantiti guna dan unit.', 'Quantity used and unit.'), L('Tambah bahan lagi.', 'Add another ingredient.')]))}
<h2>${L('Pembungkusan dan peralatan', 'Packaging and equipment')}</h2>
<p>${L('Tambah pembungkusan, pilih kuantiti, dan tentukan sama ada ia <b>setiap unit dijual</b> atau <b>setiap batch</b>. Tambah peralatan dan masa guna dalam minit, contoh oven 45 minit. Bahagian Peralatan hanya muncul bila Elektrik dalam Kos Operasi diisi dengan Kira dari bil.', 'Add packaging, choose the quantity, and decide whether it is <b>each unit sold</b> or <b>each batch</b>. Add equipment and the time used in minutes, for example the oven for 45 minutes. The Equipment section only appears when Electricity in Operating Costs is filled in with Calculate from bill.')}</p>
${figs(fig('22-menu-pembungkusan', L('Pembungkusan dalam menu.', 'Packaging in a menu item.'), [L('Pilih pembungkusan.', 'Choose packaging.'), L('Tambah pembungkusan lagi.', 'Add more packaging.')]), fig('23-menu-peralatan', L('Peralatan dalam menu.', 'Equipment in a menu item.'), [L('Pilih peralatan.', 'Choose equipment.'), L('Masa guna (minit).', 'Time used (minutes).')]))}
<p>${L('Bar di bahagian atas skrin sentiasa menunjukkan <b>Kos Sebenar</b>, <b>Anggaran Untung</b>, margin dan status, yang berubah semasa anda mengisi.', 'The bar at the top of the screen always shows the <b>Real Cost</b>, <b>Estimated Profit</b>, margin and status, changing as you fill in.')}</p>

<h2>${L('Senarai menu dan kategori', 'The menu list and categories')}</h2>
<p>${L('Bila ada menu yang diberi kategori, senarai menu bertukar kepada bahagian yang boleh dibuka dan ditutup, satu bahagian setiap kategori, ditambah <b>Tanpa kategori</b>. Jika tiada menu berkategori, senarai kekal biasa. Kategori boleh digunakan dalam Versi Percuma juga.', 'Once any menu has a category, the menu list becomes sections you can open and close, one per category, plus <b>No category</b>. If no menu has a category, the list stays flat. Categories also work in the Free version.')}</p>
${figs(fig('24-menu-senarai', L('Senarai menu mengikut kategori.', 'The menu list grouped by category.'), [L('Satu kategori: tekan untuk buka atau tutup.', 'One category: tap to open or close.'), L('Satu menu: harga, kos sebenar, untung, margin dan status.', 'One menu item: price, real cost, profit, margin and status.'), L('Tambah menu.', 'Add menu.')]), fig('26-menu-hasil', L('Hasil pengiraan.', 'The calculated result.'), [L('Kos Sebenar.', 'Real Cost.'), L('Anggaran Untung.', 'Estimated Profit.')]), fig('27-menu-pecahan', L('Pecahan kos seunit.', 'The unit cost breakdown.')))}
<p>${L('<b>Pecahan kos seunit</b> menunjukkan dari mana kos datang. Tekan satu baris untuk melihat butirannya dan rumusnya. Menu yang <b>belum lengkap</b> menyenaraikan apa yang kurang, dengan butang <b>Pergi</b> terus ke tempat yang perlu diisi.', 'The <b>unit cost breakdown</b> shows where the cost comes from. Tap a row to see its details and formula. A menu item that is <b>incomplete</b> lists what is missing, with a <b>Go</b> button straight to where it needs filling in.')}</p>
${note(L('Versi Percuma: sehingga 2 menu.', 'Free version: up to 2 menu items.'))}

<h2>${L('Variasi menu (Versi Penuh)', 'Menu variations (Full version)')}</h2>
<p>${L('Ada satu resipi asas dengan beberapa versi, contohnya Brownies biasa dan Brownies Walnut? Buat <b>variasi</b> daripada menu asas.', 'Have one base recipe with a few versions, such as plain Brownies and Walnut Brownies? Make a <b>variation</b> of the base menu item.')}</p>
${steps(L('Buka menu asas dan tekan <b>Tambah variasi</b>.', 'Open the base menu item and tap <b>Add variation</b>.'), L('Beri <b>Nama menu</b> dan <b>Harga Jual</b> sendiri. Hasil, masa dan semua bahan serta pembungkusan asas ditunjukkan sebagai bacaan sahaja.', 'Give it its own <b>Menu name</b> and <b>Selling Price</b>. The yield, time and all base ingredients and packaging are shown read-only.'), L('Tambah hanya <b>bahan atau pembungkusan tambahan</b> (contoh walnut), kemudian <b>Simpan menu</b>.', 'Add only the <b>extra ingredients or packaging</b> (for example walnuts), then <b>Save menu</b>.'))}
${figs(fig('29a-variasi-tambah', L('Butang Tambah variasi pada menu asas.', 'The Add variation button on the base menu.'), [L('Tambah variasi.', 'Add variation.')]), fig('29b-variasi-borang', L('Borang variasi.', 'The variation form.'), [L('Variasi daripada menu asas.', 'A variation of the base menu.'), L('Bahan dan pembungkusan asas, bacaan sahaja.', 'Base ingredients and packaging, read-only.'), L('Harga Jual variasi sendiri.', 'The variation\'s own Selling Price.')]), fig('29c-menu-variasi-senarai', L('Variasi dalam senarai, di bawah menu asas.', 'The variation in the list, under its base menu.'), [L('Kategori menu asas.', 'The base menu\'s category.'), L('Variasi ditunjukkan dengan tanda ↳.', 'The variation, marked with ↳.')]))}
<ul class="bl">
<li>${L('Variasi <b>mengikut menu asas secara langsung</b>: bila bahan atau resipi asas berubah (atau harga bahan berubah), variasi turut berubah.', 'A variation <b>follows the base menu live</b>: when the base recipe changes (or an ingredient price changes), the variation changes too.')}</li>
<li>${L('Variasi ada untung, margin dan status sendiri. Ia dikira sebagai satu menu.', 'A variation has its own profit, margin and status. It counts as one menu item.')}</li>
<li>${L('Untuk mengubah bahan asas, ubah menu asas, atau padam variasi dan buat menu baharu. Variasi tidak boleh menambah peralatan dan tidak boleh ada variasi sendiri.', 'To change the base ingredients, edit the base menu, or delete the variation and create a new menu. A variation cannot add equipment and cannot have variations of its own.')}</li>
<li>${L('Jika menu asas dipadam, variasinya <b>tidak terpadam</b>. Setiap satu mengambil salinan bahan dan resipi asas dan menjadi menu biasa.', 'If the base menu is deleted, its variations are <b>not deleted</b>. Each takes a copy of the base ingredients and recipe and becomes an ordinary menu item.')}</li>
</ul>

<h2>${L('Cadangan Harga', 'Price Suggestion')}</h2>
<p>${L('Pilih margin sasaran (20%, 30%, 40% atau 50%). UntungLab kira harga jual yang perlu, <b>termasuk kos operasi</b>. Tekan <b>Guna harga ini</b> untuk memasukkan harga itu ke ruang Harga Jual, kemudian tekan <b>Simpan menu</b>.', 'Choose a target margin (20%, 30%, 40% or 50%). UntungLab works out the selling price needed, <b>including operating costs</b>. Tap <b>Use this price</b> to put that price in the Selling Price field, then tap <b>Save menu</b>.')}</p>
${figs(fig('28-cadangan', L('Cadangan Harga.', 'The Price Suggestion.'), [L('Pilih margin sasaran.', 'Choose the target margin.'), L('Guna harga ini.', 'Use this price.')]))}
<p>${L('Jika margin sasaran tak boleh dicapai kerana kos operasi sudah mengambil terlalu banyak daripada harga, UntungLab beritahu anda. Cuba margin lebih rendah, atau semak Kos Operasi.', 'If the target margin cannot be reached because operating costs already take too much of the price, UntungLab tells you. Try a lower margin, or check Operating Costs.')}</p>
${tip(L('Harga dicadangkan dikira supaya margin sebenar tepat pada sasaran. Anda yang tentukan harga akhir; bundarkan kepada harga yang sesuai dengan pelanggan anda.', 'The suggested price is worked out so the real margin matches the target exactly. You decide the final price; round it to a price that suits your customers.'))}
`,
    ),
  );

  // ---------------------------------------------------------------- 8
  body.push(
    chapter(
      'dashboard',
      L('Dashboard', 'Dashboard'),
      L('Apa yang perlu anda tahu hari ini, dalam satu skrin.', 'What you need to know today, on one screen.'),
      `
<ul class="bl">
<li>${L('<b>Purata margin semua menu</b>: purata biasa bagi menu yang lengkap. Menu yang belum lengkap tidak dimasukkan.', '<b>Average margin of all menus</b>: a plain average over the menus that are complete. Incomplete menus are left out.')}</li>
<li>${L('<b>Untung, Rugi, Belum lengkap</b>: bilangan menu dalam setiap kumpulan.', '<b>Profit, Loss, Incomplete</b>: the number of menu items in each group.')}</li>
<li>${L('<b>Perlu perhatian</b>: menu yang rugi, menu yang belum lengkap, dan perubahan harga bahan yang menjejaskan menu anda.', '<b>Needs attention</b>: menus losing money, incomplete menus, and ingredient price changes that affect your menu.')}</li>
<li>${L('<b>Kedudukan margin</b>: menu disusun dari margin tertinggi ke terendah, dengan bar berwarna ikut status.', '<b>Margin ranking</b>: menu items sorted from the highest margin to the lowest, with bars coloured by status.')}</li>
</ul>
${figs(fig('30-dashboard', L('Dashboard.', 'The Dashboard.'), [L('Purata margin semua menu.', 'Average margin of all menus.')]), fig('31-dashboard-bawah', L('Kad bilangan dan kedudukan margin.', 'The count cards and the margin ranking.')), fig('43-dashboard-amaran', L('Amaran perubahan harga selepas harga butter dinaikkan.', 'Price change warnings after the butter price was raised.')))}
<p>${L('Setiap amaran boleh ditutup dengan <b>×</b>. Tekan <b>Lihat menu</b> atau <b>Lihat kesan harga</b> pada amaran untuk terus ke butirannya. Jika anda belum menyimpan Backup, Dashboard juga mengingatkan anda.', 'Each warning can be dismissed with <b>×</b>. Tap <b>View menu</b> or <b>View price impact</b> on a warning to go straight to the details. If you have not saved a Backup, the Dashboard reminds you too.')}</p>
`,
    ),
  );

  // ---------------------------------------------------------------- 9
  body.push(
    chapter(
      'kesan',
      L('Kesan Harga', 'Price Impact'),
      L('Cuba naikkan atau turunkan harga satu bahan dan lihat kesannya pada untung setiap menu, sebelum anda ubah apa-apa.', 'Try raising or lowering the price of one ingredient and see the effect on every menu item\'s profit, before you change anything.'),
      `
${steps(L('Buka <b>Kesan Harga</b> dan pilih <b>bahan</b>.', 'Open <b>Price Impact</b> and choose an <b>ingredient</b>.'), L('Pilih chip <b>+5%</b>, <b>+10%</b>, <b>+20%</b> atau <b>+30%</b>, atau tekan <b>Lain-lain</b> dan isi peratusan (guna − jika harga turun) atau harga pek baharu.', 'Pick a chip <b>+5%</b>, <b>+10%</b>, <b>+20%</b> or <b>+30%</b>, or tap <b>Other</b> and enter a percentage (use − if the price goes down) or a new pack price.'), L('Lihat <b>Kesan pada kos</b>: setiap menu yang terjejas, kos dan untung sebelum dan selepas, dan jika statusnya bertukar.', 'See the <b>Effect on cost</b>: every affected menu item, its cost and profit before and after, and whether its status changes.'), L('Mahu guna harga itu? Tekan <b>Guna harga ini</b> dan sahkan. Jika tidak, tekan <b>Set semula</b>.', 'Want to use that price? Tap <b>Use this price</b> and confirm. If not, tap <b>Reset</b>.'))}
${figs(fig('33-kesan-pilih', L('Pilih bahan dan chip peratus.', 'Choose an ingredient and a percentage chip.'), [L('Pilih bahan.', 'Choose the ingredient.'), L('Pilih peratus kenaikan.', 'Choose the percentage increase.')]), fig('34-kesan-hasil', L('Hasil simulasi.', 'The simulation result.'), [L('Kesan pada kos bahan.', 'Effect on ingredient cost.'), L('Setiap menu: sebelum dan selepas.', 'Each menu item: before and after.'), L('Guna harga ini.', 'Use this price.')]))}
${figs(fig('35-kesan-sahkan', L('Pengesahan sebelum harga ditukar.', 'Confirmation before the price changes.'), [L('Ya, guna harga ini.', 'Yes, use this price.')]), fig('36-kesan-berjaya', L('Harga dikemas kini dan direkod dalam Jejak Harga.', 'The price is updated and recorded in the Price Tracker.')))}
${note(L('Ia <b>simulasi sahaja</b>. Tiada data berubah sehingga anda tekan <b>Guna harga ini</b> dan sahkan. Selepas itu semua menu guna harga baharu dan perubahan direkod dalam Jejak Harga.', 'It is a <b>simulation only</b>. Nothing changes until you tap <b>Use this price</b> and confirm. After that every menu item uses the new price and the change is recorded in the Price Tracker.'))}
`,
    ),
  );

  // ---------------------------------------------------------------- 10
  body.push(
    chapter(
      'jejak',
      L('Jejak Harga', 'Price Tracker'),
      L('Rekod setiap perubahan harga beli dan saiz pek, dibandingkan pada kos seunit.', 'A record of every change to purchase price and pack size, compared on unit cost.'),
      `
<p>${L('Setiap kali anda mengubah harga atau saiz pek sesuatu bahan, UntungLab merekodnya. Perbandingan dibuat pada <b>kos seunit</b>, bukan harga pek sahaja, jadi menukar saiz pek tidak mengelirukan. Jika unit berbeza daripada rekod sebelumnya, UntungLab beritahu bahawa ia tidak boleh dibandingkan.', 'Every time you change an ingredient\'s price or pack size, UntungLab records it. Comparisons are made on <b>unit cost</b>, not just pack price, so changing the pack size is not misleading. If the unit differs from the previous record, UntungLab tells you it cannot be compared.')}</p>
${figs(fig('37-jejak-senarai', L('Senarai bahan dengan perubahan terkini.', 'Ingredients with their latest change.'), [L('Harga pek, kos seunit dan perubahan.', 'Pack price, unit cost and change.')]), fig('38-jejak-butiran', L('Perubahan, menu yang terjejas dan trend.', 'The change, affected menus and trend.')), fig('39-jejak-trend', L('Graf trend kos seunit dan sejarah rekod.', 'The unit cost trend chart and the record history.')))}
<ul class="bl">
<li>${L('<b>Menu terjejas</b>: berapa menu menggunakan bahan itu. Tekan <b>Lihat kesan harga</b> untuk simulasi.', '<b>Menus affected</b>: how many menu items use the ingredient. Tap <b>View price impact</b> for a simulation.')}</li>
<li>${L('<b>Trend kos seunit</b>: graf kos seunit dari rekod pertama hingga terkini. Sentuh satu titik untuk melihat harga pada tarikh itu.', '<b>Unit cost trend</b>: a chart of unit cost from the first record to the latest. Touch a point to see the price on that date.')}</li>
<li>${L('<b>Sejarah</b>: senarai rekod harga bahan itu. Setiap perubahan boleh disemak kesannya pada menu anda melalui <b>Lihat kesan pada menu</b> (paparan baca sahaja, dikira dengan menu anda sekarang).', '<b>History</b>: the list of that ingredient\'s price records. Each change can be checked against your menu through <b>See the effect on menus</b> (read-only, worked out with your menu as it is now).')}</li>
</ul>
`,
    ),
  );

  // ---------------------------------------------------------------- 11
  body.push(
    chapter(
      'laporan',
      L('Laporan', 'Report'),
      L('Ringkasan kos dan untung setiap menu, boleh dieksport ke Excel atau Google Sheets.', 'A summary of the cost and profit of every menu item, which you can export to Excel or Google Sheets.'),
      `
<p>${L('Laporan menunjukkan setiap menu dengan harga jual, kos sebenar, anggaran untung, margin dan status. Semua angka sama dengan skrin Menu dan Dashboard.', 'The report shows every menu item with its selling price, real cost, estimated profit, margin and status. All figures match the Menu and Dashboard screens.')}</p>
${steps(L('Buka <b>Laporan</b> (di bawah <b>Lagi</b> pada telefon).', 'Open <b>Report</b> (under <b>More</b> on a phone).'), L('Tekan <b>Eksport CSV</b>. Fail CSV disimpan dan boleh dibuka dalam Excel atau Google Sheets.', 'Tap <b>Export CSV</b>. The CSV file is saved and opens in Excel or Google Sheets.'))}
${figs(fig('40-laporan', L('Laporan menu.', 'The menu report.'), [L('Eksport CSV.', 'Export CSV.')]))}
${note(L('Tiada jumlah untung keseluruhan kerana UntungLab tidak menyimpan isi padu jualan setiap menu. Angka dalam laporan ialah untung seunit, bukan jumlah sebulan.', 'There is no overall profit total because UntungLab does not store how many of each menu item you sell. The figures in the report are profit per unit, not a monthly total.'))}
`,
    ),
  );

  // ---------------------------------------------------------------- 12
  body.push(
    chapter(
      'sandaran',
      L('Backup', 'Backup'),
      L('Lindungi data anda. Ia hanya ada dalam peranti anda, jadi Backup ialah satu-satunya salinan lain.', 'Protect your data. It exists only on your device, so a Backup is the only other copy.'),
      `
<p>${L('Jika telefon rosak, hilang atau ditukar, data yang tiada Backup tidak boleh dikembalikan. Simpan Backup secara berkala, terutama selepas anda menambah banyak bahan atau menu.', 'If your phone breaks, is lost or is replaced, data without a Backup cannot be recovered. Save a Backup regularly, especially after adding many ingredients or menu items.')}</p>
<h2>${L('Simpan Backup', 'Save a Backup')}</h2>
${steps(L('Buka <b>Backup</b> dan tekan <b>Simpan backup</b>.', 'Open <b>Backup</b> and tap <b>Save backup</b>.'), L('Simpan fail itu di tempat selamat: aplikasi Fail, Google Drive, atau hantar kepada diri sendiri melalui emel atau WhatsApp.', 'Keep the file somewhere safe: the Files app, Google Drive, or send it to yourself by email or WhatsApp.'))}
<p>${L('Satu fail mengandungi semua bahan, menu (termasuk kategori dan variasi), kos, pekerja dan sejarah harga anda. UntungLab menunjukkan tarikh Backup terakhir dan mengingatkan anda bila ia sudah lama.', 'One file holds all your ingredients, menu items (including categories and variations), costs, workers and price history. UntungLab shows the date of your last Backup and reminds you when it is getting old.')}</p>
<h2>${L('Pulihkan daripada Backup', 'Restore from a Backup')}</h2>
${steps(L('Buka <b>Backup</b> dan tekan <b>Pilih fail backup</b>.', 'Open <b>Backup</b> and tap <b>Choose backup file</b>.'), L('UntungLab memeriksa fail dahulu dan menunjukkan ringkasannya. <b>Tiada apa berubah</b> sehingga anda sahkan.', 'UntungLab checks the file first and shows a summary. <b>Nothing changes</b> until you confirm.'), L('Disyorkan: tekan <b>Simpan backup semasa dahulu</b>, kemudian <b>Ganti data dalam peranti</b>.', 'Recommended: tap <b>Save the current backup first</b>, then <b>Replace data on this device</b>.'))}
${figs(fig('41-sandaran', L('Skrin Backup.', 'The Backup screen.'), [L('Simpan backup.', 'Save backup.')]), fig('42-sandaran-pulih', L('Pulihkan daripada fail.', 'Restoring from a file.'), [L('Pilih fail backup.', 'Choose backup file.')]))}
${warn(L('Memulihkan Backup <b>menggantikan semua data</b> dalam peranti itu. Ia tak boleh diundur melainkan anda ada Backup semasa.', 'Restoring a Backup <b>replaces all data</b> on that device. It cannot be undone unless you have a current Backup.'))}
<h2>${L('Perlindungan storan', 'Storage protection')}</h2>
<p>${L('Pelayar boleh memadam data jika ruang telefon penuh. Tekan <b>Minta perlindungan storan</b> dalam skrin Backup. Jika pelayar anda tidak menyokongnya, simpan Backup lebih kerap.', 'A browser can delete data if the phone runs out of space. Tap <b>Request storage protection</b> on the Backup screen. If your browser does not support it, save Backups more often.')}</p>
${note(L('Lesen dan ID peranti <b>tidak</b> termasuk dalam Backup. Di telefon baharu, anda masukkan semula kod lesen anda selepas memulihkan data. Pilihan bahasa juga tidak termasuk; pilih semula di Tetapan.', 'The licence and device ID are <b>not</b> part of a Backup. On a new phone you enter your licence code again after restoring your data. The language choice is not included either; choose it again in Settings.'))}
`,
    ),
  );

  // ---------------------------------------------------------------- 13 settings
  body.push(
    chapter(
      'tetapan',
      L('Tetapan, bahasa dan manual', 'Settings, language and manual'),
      L('Tukar bahasa app dan buka manual ini bila-bila masa.', 'Change the app language and open this manual any time.'),
      `
<h2>${L('Bahasa', 'Language')}</h2>
<p>${L('Kali pertama anda buka app, ia bertanya bahasa yang anda mahu: <b>Bahasa Melayu</b> atau <b>English</b>. Anda boleh menukarnya bila-bila masa di <b>Lagi › Tetapan</b>. Semua skrin, mesej dan manual mengikut bahasa yang dipilih. Istilah teknikal seperti Backup kekal dalam English dalam versi Bahasa Melayu.', 'The first time you open the app it asks which language you want: <b>Bahasa Melayu</b> or <b>English</b>. You can change it any time under <b>More › Settings</b>. Every screen, message and the manual follow the chosen language. Technical terms such as Backup stay in English in the Bahasa Melayu version.')}</p>
${figs(fig('50-bahasa-popup', L('Pilihan bahasa kali pertama.', 'The language choice on first open.')), fig('51-tetapan', L('Tetapan.', 'Settings.'), [L('Bahagian Bahasa.', 'The Language section.'), L('Pilih Bahasa Melayu atau English.', 'Choose Bahasa Melayu or English.')]), fig('52-manual', L('Skrin Manual dalam app.', 'The Manual screen in the app.')))}
<h2>${L('Manual', 'Manual')}</h2>
<p>${L('Buka <b>Lagi › Manual</b> untuk membuka manual PDF ini. Manual dalam Bahasa Melayu atau English mengikut bahasa app anda. Ia boleh dibuka tanpa internet selepas app dipasang.', 'Open <b>More › Manual</b> to open this PDF manual. It is in Bahasa Melayu or English to match your app language. It can be opened without internet once the app is installed.')}</p>
${note(L('Emel kod lesen dan skrin bayaran sentiasa dalam Bahasa Melayu.', 'The licence code email and the payment screen are always in Bahasa Melayu.'))}
`,
    ),
  );

  // ---------------------------------------------------------------- 14
  body.push(
    chapter(
      'lesen',
      L('Lesen dan tukar telefon', 'Licence and changing phones'),
      L('Satu kod lesen boleh digunakan pada dua peranti.', 'One licence code can be used on two devices.'),
      `
<ul class="bl">
<li>${L('Kod lesen berbentuk <b>UL-XXXX-XXXX-XXXX</b>. Simpan emel yang mengandunginya.', 'The licence code looks like <b>UL-XXXX-XXXX-XXXX</b>. Keep the email that contains it.')}</li>
<li>${L('Satu kod boleh digunakan pada <b>2 peranti</b>, contohnya telefon dan tablet anda.', 'One code works on <b>2 devices</b>, for example your phone and your tablet.')}</li>
<li>${L('Aktivasi perlu internet <b>sekali</b>. Selepas itu UntungLab berfungsi tanpa internet.', 'Activation needs internet <b>once</b>. After that UntungLab works without internet.')}</li>
<li>${L('Skrin Lesen menunjukkan empat digit terakhir kod anda sebagai rujukan.', 'The Licence screen shows the last four characters of your code for reference.')}</li>
</ul>
<h2>${L('Tukar telefon', 'Changing phones')}</h2>
${steps(L('Di telefon lama: simpan <b>Backup</b> (Bab Backup) dan hantar fail itu kepada diri sendiri.', 'On the old phone: save a <b>Backup</b> (see the Backup chapter) and send the file to yourself.'), L('Di telefon lama: buka <b>Lesen</b> dan tekan <b>Lepaskan peranti ini</b>. Ini membebaskan satu tempat. Perlu internet.', 'On the old phone: open <b>Licence</b> and tap <b>Release this device</b>. This frees up one place. Needs internet.'), L('Di telefon baharu: pasang UntungLab, <b>pulihkan Backup</b>, kemudian buka <b>Lesen</b> dan masukkan kod yang sama.', 'On the new phone: install UntungLab, <b>restore the Backup</b>, then open <b>Licence</b> and enter the same code.'))}
${tip(L('Sudah hilang telefon lama dan tak sempat lepaskan? Hubungi penjual melalui emel pembelian anda. Jangan tunggu sehingga kod penuh.', 'Lost the old phone before you could release it? Contact the seller through your purchase email. Do not wait until the code is full.'))}
<h2>${L('Mesej yang mungkin anda nampak', 'Messages you may see')}</h2>
<table class="tb">
<tr><th>${L('Mesej', 'Message')}</th><th>${L('Apa nak buat', 'What to do')}</th></tr>
<tr><td>${L('Kod ini tidak dijumpai', 'This code was not found')}</td><td>${L('Semak ejaan. Huruf besar atau kecil dan tanda sengkang tidak penting. Kod tidak pernah mengandungi huruf O, I, L, U atau angka 0 dan 1, jadi jika anda terbaca aksara itu, semak semula.', 'Check the spelling. Upper or lower case and dashes do not matter. A code never contains the letters O, I, L, U or the digits 0 and 1, so if you read one of those, look again.')}</td></tr>
<tr><td>${L('Kod ini sudah digunakan pada 2 peranti', 'This code is already used on 2 devices')}</td><td>${L('Buka Lesen pada peranti lama dan tekan Lepaskan, atau hubungi penjual.', 'Open Licence on the old device and tap Release, or contact the seller.')}</td></tr>
<tr><td>${L('Tiada sambungan internet', 'No internet connection')}</td><td>${L('Sambung internet dan cuba lagi. Hanya aktivasi dan pelepasan peranti perlukan internet.', 'Connect to the internet and try again. Only activation and releasing a device need internet.')}</td></tr>
<tr><td>${L('Terlalu banyak percubaan', 'Too many attempts')}</td><td>${L('Tunggu sejam dan cuba lagi.', 'Wait an hour and try again.')}</td></tr>
<tr><td>${L('Kod ini telah dibatalkan', 'This code has been cancelled')}</td><td>${L('Hubungi penjual.', 'Contact the seller.')}</td></tr>
</table>
`,
    ),
  );

  // ---------------------------------------------------------------- 15
  body.push(
    chapter(
      'faq',
      L('Soalan lazim dan masalah biasa', 'FAQ and common problems'),
      L('Jawapan pantas kepada perkara yang selalu ditanya.', 'Quick answers to what people often ask.'),
      `
<h2>${L('Soalan lazim', 'Frequently asked questions')}</h2>
<dl class="faq">
<dt>${L('Menu saya tunjuk "Belum lengkap". Kenapa?', 'My menu item says "Incomplete". Why?')}</dt><dd>${L('Ada maklumat yang belum diisi. Buka menu itu dan lihat senarai <b>Perlu dilengkapkan</b>. Selalunya: Anggaran Jualan Bulanan, Nilai Masa (atau senarai pekerja), atau salah satu daripada 6 kategori Kos Operasi belum diisi, atau kadar elektrik belum disimpan bila menu guna peralatan.', 'Some information is missing. Open the menu item and look at the <b>Needs completing</b> list. Usually: Estimated Monthly Sales, Time Value (or the workers list), or one of the 6 Operating Cost categories is not filled in, or the electricity rate is not saved when the menu uses equipment.')}</dd>
<dt>${L('Kenapa margin saya rendah walaupun untung nampak banyak?', 'Why is my margin low when the profit looks big?')}</dt><dd>${L('Kerana UntungLab mengira semua kos, termasuk masa anda dan kos operasi. Anggaran lama yang hanya menolak kos bahan akan sentiasa lebih tinggi.', 'Because UntungLab counts every cost, including your time and operating costs. An old estimate that only takes off the ingredient cost will always be higher.')}</dd>
<dt>${L('Perlukah saya masukkan gaji sendiri?', 'Do I need to include my own pay?')}</dt><dd>${L('Itulah fungsi <b>Nilai Masa</b>. Anda tetapkan berapa nilai sejam masa anda, dan UntungLab masukkannya dalam kos setiap menu. Jika ada pekerja, pilih <b>Ada pekerja</b> dan masukkan gaji mereka (termasuk gaji anda jika mahu).', 'That is what <b>Time Value</b> is for. You set what an hour of your time is worth, and UntungLab includes it in the cost of every menu item. If you have workers, choose <b>I have workers</b> and enter their pay (and your own if you wish).')}</dd>
<dt>${L('Kos elektrik oven saya tidak dikira. Kenapa?', 'The oven\'s electricity is not counted. Why?')}</dt><dd>${L('Elektrik dalam Kos Operasi mesti diisi dengan <b>Kira dari bil</b> dan <b>kadar elektrik</b> mesti disimpan. Jika Elektrik diisi sebagai Jumlah terus, bil penuh sudah dikira dan peralatan tidak ditambah lagi.', 'Electricity in Operating Costs must be filled in with <b>Calculate from bill</b> and the <b>electricity rate</b> must be saved. If Electricity is a Direct amount, the full bill is already counted and equipment is not added again.')}</dd>
<dt>${L('Menu rugi selepas saya ubah harga bahan. Apa nak buat?', 'A menu item is losing money after I changed an ingredient price. What now?')}</dt><dd>${L('Buka menu itu, pilih margin sasaran dalam <b>Cadangan Harga</b> dan lihat harga yang perlu. Anda juga boleh cuba bahan lain atau kurangkan kuantiti.', 'Open the menu item, pick a target margin in <b>Price Suggestion</b> and see the price you need. You can also try another ingredient or use less.')}</dd>
<dt>${L('Boleh guna di dua telefon?', 'Can I use it on two phones?')}</dt><dd>${L('Boleh, sehingga 2 peranti. Setiap peranti ada data sendiri, jadi pindahkan data melalui Backup.', 'Yes, up to 2 devices. Each device has its own data, so move data with a Backup.')}</dd>
<dt>${L('Data saya hilang selepas muat semula atau tukar pelayar?', 'My data disappeared after a reload or changing browser?')}</dt><dd>${L('Data disimpan dalam pelayar yang anda gunakan. Buka UntungLab dari ikon yang sama dan pelayar yang sama. Memasang UntungLab dari alamat berbeza memberi data kosong yang berbeza. Pulihkan daripada Backup jika ada.', 'Data is stored in the browser you use. Open UntungLab from the same icon and the same browser. Installing UntungLab from a different address gives a different, empty set of data. Restore from a Backup if you have one.')}</dd>
<dt>${L('Bagaimana dengan bayaran balik?', 'What about refunds?')}</dt><dd>${L('Dalam 7 hari selepas pembelian, balas emel kod lesen anda.', 'Within 7 days of purchase, reply to your licence code email.')}</dd>
</dl>

<h2>${L('Masalah biasa', 'Common problems')}</h2>
<table class="tb">
<tr><th>${L('Masalah', 'Problem')}</th><th>${L('Penyelesaian', 'Fix')}</th></tr>
<tr><td>${L('App tidak boleh dipasang atau tiada butang Pasang', 'The app cannot be installed or there is no Install button')}</td><td>${L('Guna Safari (iPhone) atau Chrome (Android). Pastikan alamat bermula dengan <b>https://</b>. Cuba tutup dan buka semula halaman.', 'Use Safari (iPhone) or Chrome (Android). Make sure the address starts with <b>https://</b>. Try closing and reopening the page.')}</td></tr>
<tr><td>${L('Amaran "app tidak selamat" semasa pasang di Android', 'An "unsafe app" warning when installing on Android')}</td><td>${L('Tekan <b>Lagi butiran</b>, kemudian <b>Pasang juga</b>.', 'Tap <b>More details</b>, then <b>Install anyway</b>.')}</td></tr>
<tr><td>${L('Data dalam peranti tak dapat dibuka', 'The data on the device cannot be opened')}</td><td>${L('Tutup tab lain yang membuka UntungLab, kemudian muat semula.', 'Close other tabs that have UntungLab open, then reload.')}</td></tr>
<tr><td>${L('Versi baharu tidak muncul', 'The new version does not show')}</td><td>${L('Tutup app sepenuhnya dan buka semula bila ada internet. Versi baharu dimuat turun di belakang tabir.', 'Close the app completely and reopen it while online. The new version downloads in the background.')}</td></tr>
<tr><td>${L('Elektrik peralatan tidak dikira dalam menu', 'Equipment electricity is not counted in menus')}</td><td>${L('Pastikan Elektrik dalam Kos Operasi diisi dengan <b>Kira dari bil</b> dan <b>kadar elektrik</b> sudah disimpan.', 'Make sure Electricity in Operating Costs is filled in with <b>Calculate from bill</b> and the <b>electricity rate</b> is saved.')}</td></tr>
<tr><td>${L('Tak dapat tambah bahan, menu, pembungkusan atau kos lain', 'Cannot add an ingredient, menu item, packaging or other cost')}</td><td>${L('Versi Percuma ada had (10 bahan, 2 menu, 2 pembungkusan, 3 kos lain). Aktifkan kod lesen untuk membuka had.', 'The Free version has limits (10 ingredients, 2 menu items, 2 packaging items, 3 other costs). Activate your licence code to lift them.')}</td></tr>
<tr><td>${L('Import Excel menunjukkan baris bermasalah', 'The Excel import shows problem rows')}</td><td>${L('Baca sebab pada setiap baris (contoh harga tak sah atau unit tiada dalam senarai), betulkan di fail dan pilih semula. Baris yang betul masih boleh diimport.', 'Read the reason on each row (for example an invalid price or a unit not in the list), fix the file and choose it again. The good rows can still be imported.')}</td></tr>
<tr><td>${L('Emel kod lesen tiada', 'The licence code email did not arrive')}</td><td>${L('Semak Spam, Promotions dan Important. Kod juga dipaparkan di skrin selepas bayar.', 'Check Spam, Promotions and Important. The code is also shown on screen after payment.')}</td></tr>
</table>
`,
    ),
  );

  // ---------------------------------------------------------------- 16
  body.push(
    chapter(
      'lampiran',
      L('Glosari dan contoh pengiraan', 'Glossary and worked example'),
      L('Istilah dalam app, dan satu menu dikira langkah demi langkah.', 'The terms used in the app, and one menu item worked out step by step.'),
      `
<h2>${L('Glosari', 'Glossary')}</h2>
<table class="tb gl">
<tr><td>${L('Kos Sebenar', 'Real Cost')}</td><td>${L('Jumlah semua kos satu unit jualan: bahan, pembungkusan, masa, utiliti pengeluaran dan kos operasi bersama.', 'The total of every cost of one unit sold: ingredients, packaging, time, production utilities and shared operating costs.')}</td></tr>
<tr><td>${L('Harga Jual', 'Selling Price')}</td><td>${L('Harga anda jual satu unit.', 'The price you sell one unit for.')}</td></tr>
<tr><td>${L('Anggaran Untung', 'Estimated Profit')}</td><td>${L('Harga Jual tolak Kos Sebenar.', 'Selling Price minus Real Cost.')}</td></tr>
<tr><td>${L('Margin', 'Margin')}</td><td>${L('Anggaran Untung dibahagi Harga Jual, dalam peratus.', 'Estimated Profit divided by Selling Price, as a percentage.')}</td></tr>
<tr><td>${L('Nilai Masa', 'Time Value')}</td><td>${L('Berapa nilai sejam masa anda bekerja (RM sejam). Digantikan oleh kadar sejam pasukan jika ada pekerja.', 'What an hour of your working time is worth (RM per hour). Replaced by the team hourly rate if you have workers.')}</td></tr>
<tr><td>${L('Kadar sejam pasukan', 'Team hourly rate')}</td><td>${L('Jumlah gaji semua pekerja dibahagi jumlah jam kerja mereka sebulan.', 'The total pay of all workers divided by their total working hours in a month.')}</td></tr>
<tr><td>${L('Utiliti Pengeluaran', 'Production Utilities')}</td><td>${L('Kos elektrik peralatan dalam menu.', 'The electricity cost of equipment in a menu item.')}</td></tr>
<tr><td>${L('Kos Operasi Bersama', 'Shared Operating Costs')}</td><td>${L('Bahagian kos bisnes (sewa, air dan lain-lain) yang ditanggung satu unit jualan.', 'The share of business costs (rent, water and so on) carried by one unit sold.')}</td></tr>
<tr><td>${L('Kadar Kos Operasi', 'Operating Cost Rate')}</td><td>${L('Jumlah kos operasi sebulan dibahagi Anggaran Jualan Bulanan.', 'Total monthly operating costs divided by Estimated Monthly Sales.')}</td></tr>
<tr><td>${L('Batch', 'Batch')}</td><td>${L('Satu kali masak atau satu kali penyediaan, yang menghasilkan beberapa unit jualan.', 'One cook or one preparation, which produces several units to sell.')}</td></tr>
<tr><td>${L('Kos seunit', 'Unit cost')}</td><td>${L('Harga beli dibahagi kuantiti dalam pek.', 'Purchase price divided by the quantity in the pack.')}</td></tr>
<tr><td>${L('Mapping pek', 'Pack mapping')}</td><td>${L('Penerangan berapa unit guna dalam satu pek, contoh 1 pek = 12 biji.', 'A description of how many units of use are in one pack, for example 1 pack = 12 pieces.')}</td></tr>
<tr><td>${L('Variasi', 'Variation')}</td><td>${L('Menu yang dibuat daripada menu asas dan mengikutnya secara langsung, dengan bahan tambahan dan harga sendiri.', 'A menu item made from a base menu item that follows it live, with its own extra ingredients and price.')}</td></tr>
<tr><td>${L('Arkib', 'Archive')}</td><td>${L('Sembunyikan item yang tidak digunakan tanpa memadamnya.', 'Hide an item you no longer use without deleting it.')}</td></tr>
</table>

<h2>${L('Contoh: Standard Brownies', 'Example: Standard Brownies')}</h2>
<p>${L('Angka di bawah sama dengan skrin dalam manual ini. Satu batch menghasilkan 20 keping, mengambil 120 minit, dan dijual RM6.00 sekeping. Nilai Masa RM15 sejam, kos operasi bulanan RM340.00 dan jualan bulanan RM2,400 (kadar 14.2%), kadar elektrik RM0.50 sekilowatt jam.', 'The figures below match the screens in this manual. One batch makes 20 pieces, takes 120 minutes, and sells at RM6.00 each. Time Value RM15 an hour, monthly operating costs RM340.00 and monthly sales RM2,400 (a 14.2% rate), electricity rate RM0.50 per kilowatt hour.')}</p>
<table class="tb calc">
<tr><th>${L('Bahagian', 'Part')}</th><th>${L('Pengiraan', 'Working')}</th><th>${L('Seunit', 'Per unit')}</th></tr>
<tr><td>${L('Bahan', 'Ingredients')}</td><td>${L('(150 g butter × RM0.048) + (200 g coklat × RM0.040) + (4 telur × RM0.50) + (120 g tepung × RM0.004) + (180 g gula × RM0.003) = RM18.22 sebatch, ÷ 20', '(150 g butter × RM0.048) + (200 g chocolate × RM0.040) + (4 eggs × RM0.50) + (120 g flour × RM0.004) + (180 g sugar × RM0.003) = RM18.22 per batch, ÷ 20')}</td><td>RM0.91</td></tr>
<tr><td>${L('Pembungkusan', 'Packaging')}</td><td>${L('Kotak RM1.00 + kertas baking RM0.15 + sticker RM0.10 + beg RM0.20', 'Box RM1.00 + baking paper RM0.15 + sticker RM0.10 + bag RM0.20')}</td><td>RM1.45</td></tr>
<tr><td>${L('Masa', 'Time')}</td><td>${L('120 minit ÷ 20 = 6 minit; 6 ÷ 60 × RM15', '120 minutes ÷ 20 = 6 minutes; 6 ÷ 60 × RM15')}</td><td>RM1.50</td></tr>
<tr><td>${L('Utiliti pengeluaran', 'Production utilities')}</td><td>${L('Oven 2,000 W × 0.75 jam × RM0.50 = RM0.75 sebatch, ÷ 20', 'Oven 2,000 W × 0.75 hour × RM0.50 = RM0.75 per batch, ÷ 20')}</td><td>RM0.04</td></tr>
<tr><td>${L('Kos operasi bersama', 'Shared operating costs')}</td><td>${L('14.2% × RM6.00 (harga jual)', '14.2% × RM6.00 (selling price)')}</td><td>RM0.85</td></tr>
<tr class="tot"><td colspan="2">${L('Kos Sebenar', 'Real Cost')}</td><td>RM4.75</td></tr>
<tr class="tot"><td colspan="2">${L('Anggaran Untung (RM6.00 − RM4.75)', 'Estimated Profit (RM6.00 − RM4.75)')}</td><td>RM1.25</td></tr>
<tr class="tot"><td colspan="2">${L('Margin (RM1.25 ÷ RM6.00)', 'Margin (RM1.25 ÷ RM6.00)')}</td><td>20.9%</td></tr>
</table>
<p>${L('<b>Cadangan harga 30%:</b> kos langsung (tanpa kos operasi) ialah RM0.91 + RM1.45 + RM1.50 + RM0.04 = RM3.90. Harga yang perlu = RM3.90 ÷ (1 − 0.30 − 0.142) = <b>RM6.98</b>. Pada harga itu, kos operasi turut naik kerana ia ikut harga jual, dan margin sebenar tepat 30%.', '<b>Price suggestion at 30%:</b> the direct cost (without operating costs) is RM0.91 + RM1.45 + RM1.50 + RM0.04 = RM3.90. Price needed = RM3.90 ÷ (1 − 0.30 − 0.142) = <b>RM6.98</b>. At that price the operating cost also rises because it follows the selling price, and the real margin is exactly 30%.')}</p>
<p class="end">${L('Terima kasih kerana menggunakan UntungLab. Kira dengan bijak, untung dengan yakin.', 'Thank you for using UntungLab. Count it right, profit with confidence.')}</p>
<p class="end">${L('Ada soalan atau masalah? Hubungi kami di <b>admin@digitalsambal.space</b>', 'Questions or problems? Contact us at <b>admin@digitalsambal.space</b>')}</p>
`,
    ),
  );

  return body;
}
