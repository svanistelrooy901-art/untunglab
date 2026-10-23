import { expect, it } from 'vitest';
import { renderAdminPage } from '../adminPage';

const html = renderAdminPage();

it('the admin script parses', () => {
  const m = /<script>([\s\S]*)<\/script>/.exec(html)!;
  expect(() => new Function(m[1]!)).not.toThrow();
});

it('every element the script looks up by id exists in the page', () => {
  const script = /<script>([\s\S]*)<\/script>/.exec(html)![1]!;
  const used = new Set([...script.matchAll(/\$\('([A-Za-z]+)'\)/g)].map((m) => m[1]!));
  const markup = html.slice(0, html.indexOf('<script>'));
  const missing = [...used].filter((id) => !markup.includes(`id="${id}"`));
  expect(missing).toEqual([]);
});

it('has a tab for each product, each with its own panel', () => {
  const tabs = [...html.matchAll(/data-tab="([a-z]+)"/g)].map((m) => m[1]);
  expect(tabs).toEqual(['ul', 'sme', 'jl', 'kl', 'pl']);
  for (const k of tabs) expect(html).toContain(`id="p-${k}"`);
});

it('may call only the other products\' own addresses, and nothing else', async () => {
  const { ADMIN_CSP, PRODUCT_APIS } = await import('../adminPage');
  expect(ADMIN_CSP).toContain(`connect-src 'self' ${PRODUCT_APIS.sme} ${PRODUCT_APIS.jl};`);
  expect(ADMIN_CSP).toContain("default-src 'none'");
  // The addresses in the script are the same ones the CSP allows.
  const script = /<script>([\s\S]*)<\/script>/.exec(html)![1]!;
  expect([...script.matchAll(/https:\/\/[a-z.]+/g)].map((m) => m[0]).sort()).toEqual([PRODUCT_APIS.jl, PRODUCT_APIS.sme].sort());
});

it('writes nothing from another product into the page as HTML', () => {
  const script = /<script>([\s\S]*)<\/script>/.exec(html)![1]!;
  expect(script).not.toMatch(/innerHTML|insertAdjacentHTML|document\.write/);
});
