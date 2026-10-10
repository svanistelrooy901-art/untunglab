import { describe, expect, it } from 'vitest';
import { renderBuyPage } from '../pages';
import { beaconTag, createCloudflareTraffic, type TrafficRaw, type TrafficSource } from '../traffic';
import { makeWorld } from './world';

const empty: TrafficRaw = { hourly: [], pages: [], referrers: [], devices: [], countries: [] };
const TOKEN = '0123456789abcdef0123456789abcdef';

describe('beacon tag (D-93)', () => {
  it('is added only for a plain token, with spa:false', () => {
    expect(beaconTag(TOKEN)).toContain(`data-cf-beacon='{"token":"${TOKEN}","spa":false}'`);
    expect(beaconTag(TOKEN)).toContain('src="https://static.cloudflareinsights.com/beacon.min.js"');
    for (const bad of [undefined, '', 'short', `${TOKEN}'><script>`, 'a b c d e f g h i j k l m n o p']) expect(beaconTag(bad)).toBe('');
  });
  it('the sales page carries it when configured and not otherwise', async () => {
    expect(renderBuyPage(4900, null, 4900, '', TOKEN)).toContain('beacon.min.js');
    expect(renderBuyPage(4900)).not.toContain('beacon.min.js');
    const on = await makeWorld({ cfBeaconToken: TOKEN });
    expect(await (await on.call('GET', '/beli')).text()).toContain(TOKEN);
    const off = await makeWorld();
    expect(await (await off.call('GET', '/beli')).text()).not.toContain('cloudflareinsights');
  });
  it('the admin page never loads it', async () => {
    const w = await makeWorld({ cfBeaconToken: TOKEN });
    expect(await (await w.call('GET', '/admin')).text()).not.toContain('cloudflareinsights');
  });
});

describe('POST /api/admin/traffic (D-93)', () => {
  it('needs the admin token', async () => {
    const w = await makeWorld({}, { traffic: { report: async () => empty } });
    expect((await w.call('POST', '/api/admin/traffic', {})).status).toBe(401);
  });
  it('says not configured when no source is connected', async () => {
    const w = await makeWorld();
    expect(await w.json(await w.admin('/api/admin/traffic', {}))).toEqual({ configured: false });
  });
  it('asks for 30 Malaysian days and buckets hours into Malaysian days, zero-filled', async () => {
    const asked: string[][] = [];
    const traffic: TrafficSource = {
      async report(from, to) {
        asked.push([from, to]);
        return {
          ...empty,
          hourly: [
            { hour: '2026-09-29T15:00:00Z', visits: 2, views: 3 }, // 23:00 MY, 29 Sep
            { hour: '2026-09-29T16:00:00Z', visits: 5, views: 7 }, // 00:00 MY, 30 Sep
            { hour: '2026-09-30T07:00:00Z', visits: 1, views: 1 }, // 15:00 MY, 30 Sep
            { hour: 'nonsense', visits: 99, views: 99 },
          ],
          pages: [{ host: 'beli.untunglab.space', path: '/beli', visits: 4, views: 5 }],
        };
      },
    };
    const w = await makeWorld({}, { traffic }); // clock: 2026-09-30T08:00Z = 16:00 MY on 30 Sep
    const body = await w.json(await w.admin('/api/admin/traffic', {}));
    expect(asked).toEqual([['2026-08-31T16:00:00.000Z', '2026-09-30T08:00:00.000Z']]);
    expect(body.configured).toBe(true);
    expect(body.daily).toHaveLength(30);
    expect(body.daily[0].day).toBe('2026-09-01');
    expect(body.daily[29]).toEqual({ day: '2026-09-30', visits: 6, views: 8 });
    expect(body.daily[28]).toEqual({ day: '2026-09-29', visits: 2, views: 3 });
    expect(body.daily[10]).toEqual({ day: '2026-09-11', visits: 0, views: 0 });
    expect(body.pages).toEqual([{ host: 'beli.untunglab.space', path: '/beli', visits: 4, views: 5 }]);
  });
  it('reports a Cloudflare failure as a message, not a server error', async () => {
    const w = await makeWorld({}, { traffic: { report: async () => { throw new Error('Cloudflare: bad token'); } } });
    const res = await w.admin('/api/admin/traffic', {});
    expect(res.status).toBe(200);
    expect(await w.json(res)).toEqual({ configured: true, error: 'Cloudflare: bad token' });
  });
});

describe('Cloudflare GraphQL client', () => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  const g = (count: number, visits: number, dims: Record<string, string>) => ({ count, sum: { visits }, dimensions: dims });

  it('sends one authorised query for the account and maps every group', async () => {
    const seen: { url: string; init: RequestInit }[] = [];
    const src = createCloudflareTraffic({
      accountId: 'acc1', apiToken: 'tok', hosts: ['untunglab.space', 'beli.untunglab.space'],
      fetchFn: async (url, init) => {
        seen.push({ url, init });
        return reply({ data: { viewer: { accounts: [{
          hourly: [g(3, 2, { datetimeHour: '2026-10-10T01:00:00Z' })],
          pages: [g(5, 4, { requestHost: 'beli.untunglab.space', requestPath: '/beli' })],
          referrers: [g(2, 2, { refererHost: 'l.facebook.com' }), g(1, 1, { refererHost: '' })],
          devices: [g(4, 3, { deviceType: 'mobile' })],
          countries: [g(4, 3, { countryName: 'MY' })],
        }] } }, errors: null });
      },
    });
    const r = await src.report('2026-09-11T16:00:00.000Z', '2026-10-10T02:00:00.000Z');
    expect(seen).toHaveLength(1);
    expect(seen[0]!.url).toBe('https://api.cloudflare.com/client/v4/graphql');
    expect((seen[0]!.init.headers as Record<string, string>).authorization).toBe('Bearer tok');
    const sent = JSON.parse(String(seen[0]!.init.body)) as { query: string; variables: Record<string, unknown> };
    expect(sent.variables).toEqual({ account: 'acc1', from: '2026-09-11T16:00:00.000Z', to: '2026-10-10T02:00:00.000Z', hosts: ['untunglab.space', 'beli.untunglab.space'] });
    expect(sent.query).toContain('rumPageloadEventsAdaptiveGroups');
    expect(sent.query).toContain('{bot:0}');
    expect(sent.query).toContain('{requestHost_in:$hosts}');
    expect(r.hourly).toEqual([{ hour: '2026-10-10T01:00:00Z', visits: 2, views: 3 }]);
    expect(r.pages).toEqual([{ host: 'beli.untunglab.space', path: '/beli', visits: 4, views: 5 }]);
    expect(r.referrers).toEqual([{ label: 'l.facebook.com', visits: 2, views: 2 }, { label: '', visits: 1, views: 1 }]);
    expect(r.devices[0]).toEqual({ label: 'mobile', visits: 3, views: 4 });
  });
  it('filters by site tag when one is given', async () => {
    let sent: { query: string; variables: Record<string, unknown> } | null = null;
    const src = createCloudflareTraffic({ accountId: 'a', apiToken: 't', siteTag: 'site9', hosts: ['x.y'], fetchFn: async (_u, init) => {
      sent = JSON.parse(String(init.body));
      return reply({ data: { viewer: { accounts: [{}] } } });
    } });
    const r = await src.report('a', 'b');
    expect(sent!.query).toContain('{siteTag:$site}');
    expect(sent!.variables.site).toBe('site9');
    expect(sent!.variables.hosts).toBeUndefined();
    expect(r).toEqual({ hourly: [], pages: [], referrers: [], devices: [], countries: [] });
  });
  it('turns GraphQL errors, HTTP errors and a missing account into readable errors', async () => {
    const mk = (res: () => Response) => createCloudflareTraffic({ accountId: 'a', apiToken: 't', hosts: [], fetchFn: async () => res() });
    await expect(mk(() => reply({ data: null, errors: [{ message: 'not authorized for that account' }] })).report('a', 'b')).rejects.toThrow('Cloudflare: not authorized for that account');
    await expect(mk(() => new Response('nope', { status: 502 })).report('a', 'b')).rejects.toThrow('Cloudflare: HTTP 502');
    await expect(mk(() => reply({ data: { viewer: { accounts: [] } } })).report('a', 'b')).rejects.toThrow('account not found');
  });
});

describe('account lookup when CF_ACCOUNT_ID is empty', () => {
  const reply = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
  it('finds the single account from the token once, then reuses it', async () => {
    const urls: string[] = [];
    const accounts: string[] = [];
    const src = createCloudflareTraffic({ apiToken: 't', hosts: ['x.y'], fetchFn: async (url, init) => {
      urls.push(url);
      if (url.endsWith('/accounts?per_page=5')) return reply({ success: true, result: [{ id: 'acc42' }] });
      accounts.push(JSON.parse(String(init.body)).variables.account);
      return reply({ data: { viewer: { accounts: [{}] } } });
    } });
    await src.report('a', 'b');
    await src.report('a', 'b');
    expect(accounts).toEqual(['acc42', 'acc42']);
    expect(urls.filter((u) => u.endsWith('/accounts?per_page=5'))).toHaveLength(1);
  });
  it('asks for CF_ACCOUNT_ID when the token sees several accounts or none, and names a bad token', async () => {
    const mk = (body: unknown, status = 200) => createCloudflareTraffic({ apiToken: 't', hosts: [], fetchFn: async () => reply(body, status) });
    await expect(mk({ success: true, result: [{ id: 'a' }, { id: 'b' }] }).report('a', 'b')).rejects.toThrow('set CF_ACCOUNT_ID');
    await expect(mk({ success: true, result: [] }).report('a', 'b')).rejects.toThrow('set CF_ACCOUNT_ID');
    await expect(mk({ success: false, errors: [{ message: 'Invalid API Token' }] }, 403).report('a', 'b')).rejects.toThrow('Invalid API Token');
  });
});
