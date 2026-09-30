import type { Mailer } from './ports';

export function createBrevoMailer(opts: { apiKey: string; senderEmail: string; senderName: string; appUrl: string; fetchImpl?: typeof fetch }): Mailer {
  const f = opts.fetchImpl ?? fetch;
  return {
    async sendCode(to, name, code) {
      const text = [
        `Hai ${name},`,
        '',
        'Terima kasih kerana membeli UntungLab. Ini kod lesen anda:',
        '',
        `    ${code}`,
        '',
        `Buka ${opts.appUrl}, pergi ke Lagi > Lesen, dan masukkan kod ini. Satu kod boleh digunakan pada 2 peranti.`,
        'Simpan emel ini. Anda perlukan internet hanya sekali semasa mengaktifkan kod.',
        '',
        'Bayaran balik: dalam 7 hari selepas pembelian, balas emel ini.',
      ].join('\n');
      const res = await f('https://api.brevo.com/v3/smtp/email', {
        method: 'POST',
        headers: { 'api-key': opts.apiKey, 'content-type': 'application/json', accept: 'application/json' },
        body: JSON.stringify({
          sender: { email: opts.senderEmail, name: opts.senderName },
          to: [{ email: to, name }],
          subject: 'Kod lesen UntungLab anda',
          textContent: text,
        }),
      });
      if (!res.ok) throw new Error(`Brevo responded ${res.status}`);
    },
  };
}
