/**
 * Visitor numbers from Cloudflare Web Analytics (D-93), read through the GraphQL Analytics API so they show on /admin.
 * The browser beacon only runs on the sales page and on app open (no screen tracking, no business data). The API token
 * (Account Analytics: Read) is a Worker secret and never leaves the server.
 */

export interface TrafficCount {
  /** Distinct visits (a session that came from outside the site). */
  visits: number;
  /** Page loads. */
  views: number;
}
export interface TrafficHour extends TrafficCount {
  /** Start of the hour, ISO (UTC). */
  hour: string;
}
export interface TrafficPage extends TrafficCount {
  host: string;
  path: string;
}
export interface TrafficLabel extends TrafficCount {
  label: string;
}
export interface TrafficRaw {
  hourly: TrafficHour[];
  pages: TrafficPage[];
  referrers: TrafficLabel[];
  devices: TrafficLabel[];
  countries: TrafficLabel[];
}

/** Port: where visitor numbers come from. The Worker uses Cloudflare; tests use a fake. */
export interface TrafficSource {
  report(fromIso: string, toIso: string): Promise<TrafficRaw>;
}

/** The public site token of the beacon snippet: letters and digits only, so it can be placed in HTML safely. */
export const BEACON_TOKEN = /^[A-Za-z0-9]{16,64}$/;

/** The Web Analytics beacon tag, or '' when no valid token is set. `spa:false` = count page loads only, never route changes. */
export function beaconTag(token: string | undefined): string {
  if (!token || !BEACON_TOKEN.test(token)) return '';
  return `<script type="module" src="https://static.cloudflareinsights.com/beacon.min.js" data-cf-beacon='{"token":"${token}","spa":false}'></script>`;
}

type Fetch = (input: string, init: RequestInit) => Promise<Response>;

interface Group {
  count?: number;
  sum?: { visits?: number };
  dimensions?: Record<string, string | null | undefined>;
}

export function createCloudflareTraffic(opts: { accountId: string; apiToken: string; siteTag?: string; hosts: string[]; fetchFn?: Fetch; endpoint?: string }): TrafficSource {
  const doFetch: Fetch = opts.fetchFn ?? ((i, r) => fetch(i, r));
  const site = opts.siteTag ? '{siteTag:$site}' : '{requestHost_in:$hosts}';
  const where = `filter:{AND:[{datetime_geq:$from},{datetime_leq:$to},{bot:0},${site}]}`;
  const group = (alias: string, dims: string, limit: number, order: string) =>
    `${alias}:rumPageloadEventsAdaptiveGroups(limit:${limit},${where},orderBy:[${order}]){count sum{visits} dimensions{${dims}}}`;
  const query = `query UntungLabTraffic($account:string!,$from:Time!,$to:Time!,${opts.siteTag ? '$site:string!' : '$hosts:[string!]!'}){viewer{accounts(filter:{accountTag:$account}){${[
    group('hourly', 'datetimeHour', 1000, 'datetimeHour_ASC'),
    group('pages', 'requestHost requestPath', 15, 'count_DESC'),
    group('referrers', 'refererHost', 10, 'count_DESC'),
    group('devices', 'deviceType', 5, 'count_DESC'),
    group('countries', 'countryName', 8, 'count_DESC'),
  ].join(' ')}}}}`;

  return {
    async report(fromIso, toIso) {
      const variables: Record<string, unknown> = { account: opts.accountId, from: fromIso, to: toIso };
      if (opts.siteTag) variables.site = opts.siteTag;
      else variables.hosts = opts.hosts;
      const res = await doFetch(opts.endpoint ?? 'https://api.cloudflare.com/client/v4/graphql', {
        method: 'POST',
        headers: { 'content-type': 'application/json', authorization: `Bearer ${opts.apiToken}` },
        body: JSON.stringify({ query, variables }),
      });
      let body: { data?: { viewer?: { accounts?: Record<string, Group[] | undefined>[] } }; errors?: { message?: string }[] | null } = {};
      try {
        body = (await res.json()) as typeof body;
      } catch {
        // handled below
      }
      if (body.errors?.length) throw new Error(`Cloudflare: ${body.errors.map((e) => e.message ?? '?').join('; ').slice(0, 300)}`);
      if (!res.ok) throw new Error(`Cloudflare: HTTP ${res.status}`);
      const acc = body.data?.viewer?.accounts?.[0];
      if (!acc) throw new Error('Cloudflare: account not found (check CF_ACCOUNT_ID and the token permission)');
      const n = (g: Group): TrafficCount => ({ visits: Number(g.sum?.visits ?? 0), views: Number(g.count ?? 0) });
      const rows = (k: string) => acc[k] ?? [];
      const label = (k: string, dim: string) => rows(k).map((g) => ({ label: String(g.dimensions?.[dim] ?? ''), ...n(g) }));
      return {
        hourly: rows('hourly').map((g) => ({ hour: String(g.dimensions?.datetimeHour ?? ''), ...n(g) })),
        pages: rows('pages').map((g) => ({ host: String(g.dimensions?.requestHost ?? ''), path: String(g.dimensions?.requestPath ?? ''), ...n(g) })),
        referrers: label('referrers', 'refererHost'),
        devices: label('devices', 'deviceType'),
        countries: label('countries', 'countryName'),
      };
    },
  };
}
