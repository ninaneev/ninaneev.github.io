// Resend helpers for the Daybrief waitlist. Secrets are read per call (never at import) so the
// pure builders below stay testable without env access.
// API: https://resend.com/docs/api-reference (contacts with properties + segments, emails).

const API = "https://api.resend.com";

export const FROM = "Nina Niamh <nina@flowity.ai>";
export const NINA_INBOX = "nina@flowity.ai";
export const WEBSITE_PROPERTY = "website";

function apiKey(): string {
  const key = Deno.env.get("RESEND_API_KEY")?.trim();
  if (!key) throw new Error("RESEND_API_KEY not set");
  return key;
}

async function call(method: string, path: string, body?: unknown): Promise<Response> {
  return await fetch(API + path, {
    method,
    headers: { Authorization: `Bearer ${apiKey()}`, "Content-Type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

/** Status + a short upstream message for logs only (never returned to the browser). */
async function failure(step: string, res: Response): Promise<Error> {
  const text = (await res.text().catch(() => "")).slice(0, 300);
  return new Error(`${step} ${res.status} ${text}`);
}

export function contactPayload(email: string, website: string | undefined, segmentId: string | undefined) {
  return {
    email,
    unsubscribed: false,
    ...(website ? { properties: { [WEBSITE_PROPERTY]: website } } : {}),
    ...(segmentId ? { segments: [{ id: segmentId }] } : {}),
  };
}

/**
 * Create the contact (with the website property and the waitlist segment). If it already
 * exists, update the property and add it to the segment instead. Throws on failure.
 */
export async function upsertWaitlistContact(email: string, website: string | undefined, segmentId: string | undefined) {
  const created = await call("POST", "/contacts", contactPayload(email, website, segmentId));
  if (created.ok) return "created" as const;
  const createErr = await failure("create_contact", created);

  const key = encodeURIComponent(email);
  if (website) {
    const updated = await call("PATCH", `/contacts/${key}`, { properties: { [WEBSITE_PROPERTY]: website } });
    if (!updated.ok) throw new Error(`${createErr.message} | ${(await failure("update_contact", updated)).message}`);
  }
  if (segmentId) {
    const added = await call("POST", `/contacts/${key}/segments/${encodeURIComponent(segmentId)}`);
    if (!added.ok) throw new Error(`${createErr.message} | ${(await failure("add_segment", added)).message}`);
  }
  if (!website && !segmentId) {
    // Nothing to update: the create failed for a reason other than "already exists" is possible,
    // so check the contact really exists before calling it a success.
    const got = await call("GET", `/contacts/${key}`);
    if (!got.ok) throw createErr;
  }
  return "updated" as const;
}

export type Email = { to: string; subject: string; text: string; html: string; reply_to?: string };

export async function sendEmail(mail: Email): Promise<void> {
  const res = await call("POST", "/emails", { from: FROM, ...mail, to: [mail.to] });
  if (!res.ok) throw await failure("send_email", res);
}

// ---------- Pure builders ----------

export function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]!));
}

const PARAGRAPHS = [
  "Hi,",
  "Thanks for asking about Daybrief.",
  "It's in testing right now because I'm using it myself first. When it's ready for you, I'll write.",
  "If you feel like it, reply to this email and tell me what your mornings look like. I read every reply.",
  "Nina",
];

export function confirmationEmail(email: string): Email {
  const html = `<div style="font-family:Inter,Arial,sans-serif;font-size:15px;line-height:1.6;color:#1E1E23;max-width:520px">${
    PARAGRAPHS.map((p) => `<p style="margin:0 0 14px">${escapeHtml(p)}</p>`).join("")
  }</div>`;
  return {
    to: email,
    subject: "About Daybrief",
    text: PARAGRAPHS.join("\n\n") + "\n",
    html,
    reply_to: NINA_INBOX,
  };
}

export function notificationEmail(
  args: { email: string; website?: string; referrer?: string; contact: "created" | "updated" | "failed"; at: string },
): Email {
  const rows: [string, string][] = [
    ["Email", args.email],
    ["Website", args.website ?? "(none)"],
    ["Page", args.referrer ?? "/daybrief.html"],
    ["Resend contact", args.contact === "failed" ? "FAILED, add by hand (see function logs)" : args.contact],
    ["When", args.at],
  ];
  return {
    to: NINA_INBOX,
    subject: `[Site · Daybrief] waitlist: ${args.email}`,
    text: rows.map(([k, v]) => `${k}: ${v}`).join("\n") + "\n",
    html: `<table style="font-family:Arial,sans-serif;font-size:14px;border-collapse:collapse">${
      rows.map(([k, v]) =>
        `<tr><td style="padding:4px 12px 4px 0;color:#6E6C74">${escapeHtml(k)}</td><td style="padding:4px 0">${
          escapeHtml(v)
        }</td></tr>`
      ).join("")
    }</table>`,
    reply_to: args.email,
  };
}
