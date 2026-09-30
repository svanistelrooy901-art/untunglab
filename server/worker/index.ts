import { createHandler } from '../core/api';
import { createBrevoMailer } from '../core/brevo';
import { createToyyibClient } from '../core/toyyibpay';
import type { D1Database } from './d1';
import { D1Store } from './d1Store';

/** Bindings and settings; see wrangler.toml and README.md. Secrets are set with `wrangler secret put`, never committed. */
export interface Env {
  DB: D1Database;
  // plain variables (wrangler.toml)
  PRICE_SEN: string;
  TOYYIB_BASE_URL: string;
  TOYYIB_CATEGORY: string;
  PUBLIC_BASE_URL: string;
  APP_ORIGIN: string;
  APP_URL: string;
  BREVO_SENDER_EMAIL: string;
  BREVO_SENDER_NAME: string;
  // secrets
  TOYYIB_SECRET: string;
  LICENSE_PRIVATE_KEY: string;
  ADMIN_TOKEN: string;
  BREVO_API_KEY: string;
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    let privateKeyJwk: JsonWebKey;
    try {
      privateKeyJwk = JSON.parse(env.LICENSE_PRIVATE_KEY) as JsonWebKey;
    } catch {
      return new Response('Server is not configured: LICENSE_PRIVATE_KEY is missing or invalid.', { status: 500 });
    }
    const handler = createHandler({
      store: new D1Store(env.DB),
      toyyib: createToyyibClient({
        baseUrl: env.TOYYIB_BASE_URL,
        secretKey: env.TOYYIB_SECRET,
        categoryCode: env.TOYYIB_CATEGORY,
        productName: 'UntungLab',
      }),
      mailer: createBrevoMailer({
        apiKey: env.BREVO_API_KEY,
        senderEmail: env.BREVO_SENDER_EMAIL,
        senderName: env.BREVO_SENDER_NAME,
        appUrl: env.APP_URL,
      }),
      now: () => new Date(),
      randomBytes: (n) => crypto.getRandomValues(new Uint8Array(n)),
      config: {
        priceSen: Number(env.PRICE_SEN),
        toyyibSecret: env.TOYYIB_SECRET,
        adminToken: env.ADMIN_TOKEN,
        privateKeyJwk,
        appOrigin: env.APP_ORIGIN,
        publicBaseUrl: env.PUBLIC_BASE_URL.replace(/\/+$/, ''),
        maxDevices: 2,
        failureLimit: 10,
        failureWindowMinutes: 60,
      },
    });
    return handler(request);
  },
};
