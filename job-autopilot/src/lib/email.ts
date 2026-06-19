import { ImapFlow } from "imapflow";

export interface EmailScanConfig {
  host: string;
  port: number;
  user: string;
  password: string;
}

export interface ScannedEmail {
  fromAddr: string;
  fromName: string;
  subject: string;
  receivedAt: Date;
}

export function emailConfigFromEnv(): EmailScanConfig | null {
  const host = process.env.IMAP_HOST;
  const user = process.env.IMAP_USER;
  const password = process.env.IMAP_PASSWORD;
  if (!host || !user || !password) return null;
  return { host, port: Number(process.env.IMAP_PORT || 993), user, password };
}

export type Classification = "response" | "interview" | "offer" | "rejection" | "other";

export function classify(subject: string): Classification {
  const s = subject.toLowerCase();
  if (/(unfortunately|not moving forward|won'?t be moving|decided not to|other candidates|regret to|not selected|position (has been )?filled|no longer)/.test(s))
    return "rejection";
  if (/(pleased to offer|extend(ing)? an offer|offer letter|job offer)/.test(s)) return "offer";
  if (/(interview|schedule a (call|time|chat|conversation)|availability|next steps|technical screen|phone screen|meet with|hiring team would like)/.test(s))
    return "interview";
  if (/(application|thanks for applying|received your|your candidacy|update on your)/.test(s)) return "response";
  return "other";
}

// Pull recent inbox messages (envelope only — fast, no body download).
export async function scanInbox(cfg: EmailScanConfig, sinceDays = 45): Promise<ScannedEmail[]> {
  const client = new ImapFlow({
    host: cfg.host,
    port: cfg.port,
    secure: true,
    auth: { user: cfg.user, pass: cfg.password },
    logger: false,
  });

  const out: ScannedEmail[] = [];
  await client.connect();
  const lock = await client.getMailboxLock("INBOX");
  try {
    const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
    for await (const msg of client.fetch({ since }, { envelope: true })) {
      const env = msg.envelope;
      if (!env) continue;
      const from = env.from?.[0];
      out.push({
        fromAddr: from?.address || "",
        fromName: from?.name || "",
        subject: env.subject || "",
        receivedAt: env.date || new Date(),
      });
    }
  } finally {
    lock.release();
    await client.logout().catch(() => {});
  }
  return out;
}

// Does an email plausibly belong to a given company?
export function matchesCompany(email: ScannedEmail, company: string): boolean {
  if (!company) return false;
  const c = company.toLowerCase();
  const firstWord = c.split(/[\s,]/)[0];
  const hay = `${email.fromAddr} ${email.fromName} ${email.subject}`.toLowerCase();
  return hay.includes(c) || (firstWord.length >= 3 && hay.includes(firstWord));
}
