// POST /hire-request  { name?, email, website?, service, other?, message, referrer?, company? (honeypot) }
// -> 200 { ok: true } | 400 { ok: false, error: invalid_body | invalid_email | invalid_website |
//    invalid_service | invalid_other | invalid_message }
//    413 body_too_large | 429 rate_limited | 502 send_failed | 503 not_configured
// Resend only: the message goes to Nina (reply_to = the sender) and a short confirmation goes
// back to the sender. No contact or segment is created.
import { handlePreflight, json, jsonError } from "../_shared/cors.ts";
import { parseHireBody, SERVICES } from "../_shared/validate.ts";
import { clientIp, RateLimiter } from "../_shared/ratelimit.ts";
import { hireConfirmationEmail, hireNotificationEmail, sendEmail } from "../_shared/resend.ts";

const MAX_BODY_BYTES = 8192;
const perIp = new RateLimiter(5, 10 * 60 * 1000);
const perEmail = new RateLimiter(3, 60 * 60 * 1000);

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

  const input = parseHireBody(body);
  if (!input.ok) return jsonError(req, 400, input.error);
  if (input.honeypot) return json(req, 200, { ok: true });

  if (!perIp.allow(clientIp(req))) return jsonError(req, 429, "rate_limited");
  if (!perEmail.allow(input.email)) return jsonError(req, 429, "rate_limited");

  if (!Deno.env.get("RESEND_API_KEY")?.trim()) {
    console.error("hire-request: RESEND_API_KEY not set");
    return jsonError(req, 503, "not_configured");
  }

  const { name, email, website, service, other, message, referrer } = input;

  // Nina's copy is the one that matters: if it fails, the page offers a mailto instead.
  try {
    await sendEmail(hireNotificationEmail({
      name,
      email,
      website,
      serviceLabel: SERVICES[service],
      other,
      message,
      referrer,
      at: new Date().toISOString(),
    }));
  } catch (err) {
    console.error("hire-request notify:", err instanceof Error ? err.message : "unknown");
    return jsonError(req, 502, "send_failed");
  }

  try {
    await sendEmail(hireConfirmationEmail(email, name));
  } catch (err) {
    console.error("hire-request confirm:", err instanceof Error ? err.message : "unknown");
  }

  return json(req, 200, { ok: true });
});
