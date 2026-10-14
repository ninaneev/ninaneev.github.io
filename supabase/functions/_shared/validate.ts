// Pure validation helpers (no network, no env) so they are unit-testable.

export const SOURCES = [
  "newsletter",
  "day-plan",
  "automation-ebook",
  "daybrief-waitlist",
  "unlocking-ebook",
  "sentiment-ebook",
  "ebooks-waitlist",
] as const;
export type Source = typeof SOURCES[number];

export const DOWNLOADS: Partial<Record<Source, string>> = {
  "day-plan": "/free/files/10-minute-day-plan.pdf",
  "automation-ebook": "/free/files/do-you-need-automation.pdf",
  "unlocking-ebook": "/free/files/unlocking-business-potential.pdf",
  "sentiment-ebook": "/free/files/sentiment-synthesis.pdf",
};

export const MAX_EMAIL_LEN = 254;
export const MAX_NAME_LEN = 80;

// Deliberately simple: one @, no spaces, a dot in the domain, sane label chars.
const EMAIL_RE = /^[^\s@<>()"',;:\\]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+$/;

export function normalizeEmail(raw: unknown): string | null {
  if (typeof raw !== "string") return null;
  const email = raw.trim().toLowerCase();
  if (email.length < 6 || email.length > MAX_EMAIL_LEN) return null;
  const local = email.split("@")[0];
  if (local.length > 64) return null;
  return EMAIL_RE.test(email) ? email : null;
}

export function isSource(raw: unknown): raw is Source {
  return typeof raw === "string" && (SOURCES as readonly string[]).includes(raw);
}

/** Trims, strips control chars, caps length. Returns undefined when empty or not a string. */
export function cleanFirstName(raw: unknown): string | undefined {
  if (typeof raw !== "string") return undefined;
  // deno-lint-ignore no-control-regex
  const name = raw.replace(/[\u0000-\u001f\u007f<>]/g, "").trim().slice(0, MAX_NAME_LEN);
  return name.length ? name : undefined;
}

export type SubscribeInput =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; email: string; source: Source; firstName?: string }
  | { ok: false; error: "invalid_body" | "invalid_email" | "invalid_source" };

export function parseSubscribeBody(body: unknown): SubscribeInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;
  // Honeypot: bots fill the hidden "company" field. Pretend success, do nothing.
  if (typeof b.company === "string" && b.company.trim() !== "") return { ok: true, honeypot: true };
  const email = normalizeEmail(b.email);
  if (!email) return { ok: false, error: "invalid_email" };
  if (!isSource(b.source)) return { ok: false, error: "invalid_source" };
  return { ok: true, honeypot: false, email, source: b.source, firstName: cleanFirstName(b.first_name) };
}

/** Kit tag names applied for a given source: everyone joins the letter + a source tag. */
export function tagsForSource(source: Source): string[] {
  return ["newsletter", `src-${source}`];
}

export const MAX_WEBSITE_LEN = 200;

/**
 * Website for the Daybrief waitlist. undefined = left empty (fine, it is optional),
 * null = filled but not a usable http(s) address. Adds https:// when the scheme is missing,
 * lowercases the host, drops credentials, query, hash and a trailing slash.
 */
export function normalizeWebsite(raw: unknown): string | null | undefined {
  if (raw == null) return undefined;
  if (typeof raw !== "string") return null;
  // deno-lint-ignore no-control-regex
  const value = raw.replace(/[\u0000-\u001f\u007f]/g, "").trim();
  if (!value) return undefined;
  if (value.length > MAX_WEBSITE_LEN || /\s/.test(value)) return null;
  const withScheme = /^[a-z][a-z0-9+.-]*:\/\//i.test(value) ? value : `https://${value}`;
  let url: URL;
  try {
    url = new URL(withScheme);
  } catch {
    return null;
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") return null;
  if (url.username || url.password) return null;
  const host = url.hostname;
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)*\.[a-z]{2,63}$/.test(host)) return null;
  const path = url.pathname.replace(/\/+$/, "");
  return `${url.protocol}//${url.host}${path}`;
}

export type WaitlistInput =
  | { ok: true; honeypot: true }
  | { ok: true; honeypot: false; email: string; website?: string; referrer?: string }
  | { ok: false; error: "invalid_body" | "invalid_email" | "invalid_website" };

export function parseWaitlistBody(body: unknown): WaitlistInput {
  if (!body || typeof body !== "object" || Array.isArray(body)) return { ok: false, error: "invalid_body" };
  const b = body as Record<string, unknown>;
  // Same honeypot as nina-subscribe: the hidden "company" field. Pretend success, do nothing.
  if (typeof b.company === "string" && b.company.trim() !== "") return { ok: true, honeypot: true };
  const email = normalizeEmail(b.email);
  if (!email) return { ok: false, error: "invalid_email" };
  const website = normalizeWebsite(b.website);
  if (website === null) return { ok: false, error: "invalid_website" };
  const referrer = typeof b.referrer === "string" && /^\/[\w./-]{0,100}$/.test(b.referrer) ? b.referrer : undefined;
  return { ok: true, honeypot: false, email, website, referrer };
}

const SESSION_ID_RE =/^cs_(test|live)_[A-Za-z0-9]{10,200}$/;
export function isCheckoutSessionId(raw: unknown): raw is string {
  return typeof raw === "string" && SESSION_ID_RE.test(raw);
}
