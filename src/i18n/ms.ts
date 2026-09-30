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
