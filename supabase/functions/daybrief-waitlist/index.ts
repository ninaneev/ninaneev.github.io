// POST /daybrief-waitlist  { email, website?, referrer?, company? (honeypot) }
// -> 200 { ok: true } | 400 { ok: false, error: invalid_body | invalid_email | invalid_website }
//    413 body_too_large | 429 rate_limited | 502 waitlist_failed | 503 not_configured
// Resend only (not Kit): contact + "website" property + waitlist segment, a confirmation email
// from nina@flowity.ai, and a notification to Nina.
import { handlePreflight, json, jsonError } from "../_shared/cors.ts";
import { parseWaitlistBody } from "../_shared/validate.ts";
import { clientIp, RateLimiter } from "../_shared/ratelimit.ts";
import { confirmationEmail, notificationEmail, sendEmail, upsertWaitlistContact } from "../_shared/resend.ts";

const MAX_BODY_BYTES = 2048;
const perIp = new RateLimiter(5, 10 * 60 * 1000);
const perEmail = new RateLimiter(2, 60 * 60 * 1000);

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonError(req, 405, "method_not_allowed");

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError(req, 413, "body_too_large");
  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    return jsonError(req, 400, "invalid_body");
  }

  const input = parseWaitlistBody(body);
  if (!input.ok) return jsonError(req, 400, input.error);
  if (input.honeypot) return json(req, 200, { ok: true });

  if (!perIp.allow(clientIp(req))) return jsonError(req, 429, "rate_limited");
  // Same address again within the hour: say ok without mailing it twice.
  if (!perEmail.allow(input.email)) return json(req, 200, { ok: true });

  if (!Deno.env.get("RESEND_API_KEY")?.trim()) {
    console.error("daybrief-waitlist: RESEND_API_KEY not set");
    return jsonError(req, 503, "not_configured");
  }
  const segmentId = Deno.env.get("RESEND_DAYBRIEF_SEGMENT_ID")?.trim() || undefined;
  if (!segmentId) console.warn("daybrief-waitlist: RESEND_DAYBRIEF_SEGMENT_ID not set, contact saved without segment");

  const { email, website, referrer } = input;

  let contact: "created" | "updated" | "failed";
  try {
    contact = await upsertWaitlistContact(email, website, segmentId);
  } catch (err) {
    contact = "failed";
    console.error("daybrief-waitlist contact:", err instanceof Error ? err.message : "unknown");
  }

  const [confirm, notify] = await Promise.allSettled([
    sendEmail(confirmationEmail(email)),
    sendEmail(notificationEmail({ email, website, referrer, contact, at: new Date().toISOString() })),
  ]);
  if (confirm.status === "rejected") console.error("daybrief-waitlist confirm:", String(confirm.reason));
  if (notify.status === "rejected") console.error("daybrief-waitlist notify:", String(notify.reason));

  // The signup is only lost if neither the contact nor Nina's notification went through.
  if (contact === "failed" && notify.status === "rejected") return jsonError(req, 502, "waitlist_failed");
  return json(req, 200, { ok: true });
});
