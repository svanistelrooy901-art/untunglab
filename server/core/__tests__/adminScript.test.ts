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
