import type { IconName } from './components/Icon';
import type { MsKey } from '../i18n/ms';

export interface NavRoute {
  path: string;
  label: MsKey;
  icon: IconName;
  /** Shown in the mobile bottom bar. The rest live under "Lagi". */
  primary: boolean;
}

/** Desktop order from Doc 02 §1. Mobile shows the four primary items plus Lagi. */
export const ROUTES: NavRoute[] = [
  { path: '/', label: 'nav.dashboard', icon: 'dashboard', primary: true },
  { path: '/menu', label: 'nav.menu', icon: 'menu', primary: true },
  { path: '/bahan', label: 'nav.bahan', icon: 'bahan', primary: true },
  { path: '/pembungkusan', label: 'nav.pembungkusan', icon: 'pembungkusan', primary: false },
  { path: '/peralatan', label: 'nav.peralatan', icon: 'peralatan', primary: false },
  { path: '/kesan-harga', label: 'nav.kesanHarga', icon: 'kesanHarga', primary: true },
  { path: '/jejak-harga', label: 'nav.jejakHarga', icon: 'jejakHarga', primary: false },
  { path: '/kos-operasi', label: 'nav.kosOperasi', icon: 'kosOperasi', primary: false },
  { path: '/laporan', label: 'nav.laporan', icon: 'laporan', primary: false },
  { path: '/sandaran', label: 'nav.sandaran', icon: 'sandaran', primary: false },
  { path: '/manual', label: 'nav.manual', icon: 'manual', primary: false },
  { path: '/lesen', label: 'nav.lesen', icon: 'lesen', primary: false },
];
