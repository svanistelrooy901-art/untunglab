// Lets one capture script, written with Bahasa Melayu labels, drive the app in either language.
// Strings and regular expressions given to getByRole/getByText/getByLabel/getByPlaceholder are translated through the
// app's own dictionaries (ms -> en). Data typed with fill() is never translated.
import { ms } from '../../src/i18n/ms.ts';
import { en } from '../../src/i18n/en.ts';

function flat(o, out = []) {
  for (const v of Object.values(o)) typeof v === 'string' ? out.push(v) : flat(v, out);
  return out;
}
const pairs = new Map();
{
  const a = flat(ms);
  const b = flat(en);
  a.forEach((v, i) => {
    if (v !== b[i] && !pairs.has(v)) pairs.set(v, b[i]);
  });
}
const phrases = [...pairs.keys()].filter((p) => p.length >= 4 && /^[\p{L}\p{N} :,.'’-]+$/u.test(p)).sort((x, y) => y.length - x.length);
const reEsc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

export function tr(x, lang) {
  if (lang !== 'en') return x;
  if (typeof x === 'string') {
    if (pairs.has(x)) return pairs.get(x);
    let s = x;
    for (const p of phrases) if (s.includes(p)) s = s.split(p).join(pairs.get(p));
    return s;
  }
  if (x instanceof RegExp) {
    let src = x.source;
    for (const p of phrases) {
      const e = reEsc(p);
      if (src.includes(p)) src = src.split(p).join(pairs.get(p));
      else if (src.includes(e)) src = src.split(e).join(reEsc(pairs.get(p)));
    }
    return new RegExp(src, x.flags);
  }
  return x;
}

export function patch(page, lang) {
  if (lang !== 'en') return;
  const protos = [Object.getPrototypeOf(page), Object.getPrototypeOf(page.locator('body'))];
  for (const proto of protos) {
    for (const m of ['getByRole', 'getByText', 'getByLabel', 'getByPlaceholder']) {
      const orig = proto[m];
      if (!orig || orig.__tr) continue;
      const wrapped = function (a, opts) {
        if (m === 'getByRole') return orig.call(this, a, opts && opts.name !== undefined ? { ...opts, name: tr(opts.name, lang) } : opts);
        return orig.call(this, tr(a, lang), opts);
      };
      wrapped.__tr = true;
      proto[m] = wrapped;
    }
  }
}
