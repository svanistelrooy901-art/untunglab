// Generates the licence signing key pair. Run once:  node server/scripts/gen-keys.mjs
// - The PRIVATE key goes only into Cloudflare:   wrangler secret put LICENSE_PRIVATE_KEY
// - The PUBLIC key goes into the app build:      VITE_LICENSE_PUBLIC_KEY
// Keep a safe copy of the private key. If it is lost, every issued licence must be re-issued.
import { webcrypto } from 'node:crypto';

const pair = await webcrypto.subtle.generateKey({ name: 'ECDSA', namedCurve: 'P-256' }, true, ['sign', 'verify']);
const pub = await webcrypto.subtle.exportKey('jwk', pair.publicKey);
const priv = await webcrypto.subtle.exportKey('jwk', pair.privateKey);

if (process.argv.includes('--json')) {
  console.log(JSON.stringify({ publicJwk: pub, privateJwk: priv }));
  process.exit(0);
}

console.log('PUBLIC KEY  (VITE_LICENSE_PUBLIC_KEY, safe to publish):\n' + JSON.stringify(pub) + '\n');
console.log('PRIVATE KEY (LICENSE_PRIVATE_KEY secret, NEVER share or commit):\n' + JSON.stringify(priv) + '\n');
