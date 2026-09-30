/**
 * Bahasa Melayu is the default product language (Doc 00 §3).
 * All user-facing copy lives here so nothing English-only leaks into the core BM journey.
 * Terminology follows Doc 01 §6.
 */
export const ms = {
  app: {
    name: 'UntungLab',
    tagline: 'Tahu kos sebenar menu anda.',
  },
  nav: {
    dashboard: 'Dashboard',
    menu: 'Menu',
    bahan: 'Bahan',
    pembungkusan: 'Pembungkusan',
    peralatan: 'Peralatan Saya',
    kesanHarga: 'Kesan Harga',
    jejakHarga: 'Jejak Harga',
    kosOperasi: 'Kos Operasi',
    laporan: 'Laporan',
    lagi: 'Lagi',
    utama: 'Navigasi utama',
  },
  status: {
    loss: 'Menu Ini Rugi',
    low: 'Margin Rendah',
    watch: 'Perlu Perhatian',
    healthy: 'Margin Sihat',
  },
  terms: {
    kosSebenar: 'Kos Sebenar',
    hargaJual: 'Harga Jual',
    anggaranUntung: 'Anggaran Untung',
    margin: 'Margin',
    nilaiMasa: 'Nilai Masa',
    ruangKerja: 'Ruang Kerja',
    utilitiPengeluaran: 'Utiliti Pengeluaran',
    kosOperasiBersama: 'Kos Operasi Bersama',
  },
  modes: {
    mudah: 'Mudah',
    lebihTepat: 'Kira Lebih Tepat',
  },
  common: {
    tambah: 'Tambah',
    simpan: 'Simpan',
    batal: 'Batal',
    edit: 'Edit',
    tutup: 'Tutup',
    arkib: 'Arkibkan',
    pulihkan: 'Pulihkan',
    tunjukArkib: 'Tunjuk yang diarkib',
    diarkib: 'Diarkib',
    memuatkan: 'Memuatkan…',
    gagalSimpan: 'Tak dapat simpan. Cuba lagi.',
    gagalMuat: 'Data dalam peranti tak dapat dibuka. Tutup tab lain UntungLab, kemudian muat semula.',
    maklumat: 'Maklumat',
  },
  form: {
    errName: 'Isi nama.',
    errPrice: 'Isi harga beli (RM0 atau lebih).',
    errQuantity: 'Isi kuantiti lebih daripada 0.',
    errUnit: 'Pilih atau taip unit.',
    errWatts: 'Isi watt lebih daripada 0.',
    errMapping: 'Lengkapkan setiap baris pemetaan dengan nombor lebih daripada 0, atau kosongkan baris itu.',
    namaLabel: 'Nama',
    hargaBeliLabel: 'Harga beli (RM)',
    kuantitiLabel: 'Kuantiti dalam pek',
    unitLabel: 'Unit pek',
    unitHint: 'Contoh: kg, g, l, ml, biji, pek, kotak',
  },
  bahan: {
    title: 'Bahan',
    tambah: 'Tambah bahan',
    tajukBaru: 'Bahan baru',
    tajukEdit: 'Edit bahan',
    kosongTajuk: 'Tambah bahan pertama anda',
    kosongIsi: 'Masukkan harga beli dan saiz pek. UntungLab kira kos seunit dan jejak setiap perubahan harga.',
    kosSeunit: 'Kos seunit',
    hargaPek: 'Harga pek',
    pemetaanTajuk: 'Pemetaan pek (pilihan)',
    pemetaanIsi: 'Kalau anda beli mengikut pek tetapi guna mengikut biji, nyatakan berapa. Contoh: 1 pek = 12 biji.',
    pemetaanPek: 'Pek',
    pemetaanUnit: 'Unit guna',
    pemetaanBilangan: 'Bilangan',
    pemetaanTambah: 'Tambah baris',
    tarikhLabel: 'Tarikh beli',
    pembekalLabel: 'Pembekal (pilihan)',
    catatanLabel: 'Catatan (pilihan)',
    perubahanMerekod: 'Perubahan harga atau saiz pek akan direkod dalam Jejak Harga.',
    sejarahTajuk: 'Sejarah harga',
    sejarahAsas: 'Rekod asal',
    sejarahPemetaan: 'Pemetaan pek diubah',
    sejarahTakBoleh: 'Unit berbeza, tak boleh dibandingkan',
    naik: 'naik',
    turun: 'turun',
    takBerubah: 'kos seunit sama',
  },
  pack: {
    title: 'Pembungkusan',
    tambah: 'Tambah pembungkusan',
    tajukBaru: 'Pembungkusan baru',
    tajukEdit: 'Edit pembungkusan',
    kosongTajuk: 'Tambah pembungkusan pertama anda',
    kosongIsi: 'Kotak, plastik, cawan dan sebagainya. Masukkan harga beli dan berapa keping dalam satu beli.',
    kuantitiLabel: 'Bilangan dalam satu beli',
    unitLabel: 'Unit',
    unitHint: 'Contoh: pcs, keping, kotak',
    kosSeunit: 'Kos seunit',
  },
  alat: {
    title: 'Peralatan Saya',
    tambah: 'Tambah peralatan',
    tajukBaru: 'Tambah peralatan',
    tajukEdit: 'Edit peralatan',
    kosongTajuk: 'Tambah peralatan pertama anda',
    kosongIsi: 'Pilih daripada senarai atau masukkan sendiri. Watt digunakan untuk kira kos elektrik setiap batch.',
    cari: 'Cari peralatan',
    custom: 'Peralatan sendiri',
    namaLabel: 'Nama peralatan',
    wattLabel: 'Watt (W)',
    anggaran: 'Anggaran UntungLab',
    anggaranNota: 'Ini anggaran. Semak label pada peralatan anda untuk lebih tepat, kemudian ubah nilai ini.',
    disahkan: 'Disahkan oleh anda',
    sahkan: 'Guna nilai ini',
    tiadaPadanan: 'Tiada padanan. Guna “Peralatan sendiri”.',
  },
  tip: {
    watt: 'Biasanya tertera pada label peralatan. Tak pasti? Guna anggaran UntungLab dahulu dan ubah kemudian.',
    kosSeunit: 'Harga beli dibahagi kuantiti dalam pek. Ini kos yang dipakai dalam resipi anda.',
    pemetaan: 'Hanya perlu kalau anda beli dalam satu unit (contoh pek) tetapi guna dalam unit lain (contoh biji).',
  },
  ops: {
    title: 'Kos Operasi',
    errJumlah: 'Isi jumlah RM sebulan (RM0 atau lebih).',
    errPeratus: 'Isi peratus antara 0 dan 100.',
    errKeluasan: 'Isi keluasan rumah dan keluasan bisnes. Keluasan bisnes tak boleh lebih besar daripada rumah.',
    errNilaiMasa: 'Isi Nilai Masa (RM sejam, RM0 atau lebih).',
    errJualan: 'Isi Anggaran Jualan Bulanan lebih daripada RM0.',
    errTarif: 'Isi kadar RM sekilowatt jam lebih daripada 0.',
  },
  placeholder: {
    title: 'Sedang dibina',
    body: 'Bahagian ini akan siap dalam fasa pembangunan seterusnya.',
  },
  offline: {
    ready: 'Sedia luar talian',
  },
} as const;

type Paths<T, P extends string = ''> = {
  [K in keyof T & string]: T[K] extends string ? `${P}${K}` : Paths<T[K], `${P}${K}.`>;
}[keyof T & string];

export type MsKey = Paths<typeof ms>;

export function t(key: MsKey): string {
  let node: unknown = ms;
  for (const part of key.split('.')) {
    node = (node as Record<string, unknown>)[part];
  }
  return node as string;
}
