// POST /nina-subscribe  { email, first_name?, source, company? (honeypot) }
// -> 200 { ok: true, download_url? } | 400 { ok: false, error } | 502 { ok: false, error: "subscribe_failed" }
//    503 { ok: false, error: "not_configured" }
// Resend only (Kit dropped 2026-10-15): every signup joins the newsletter segment
// (secret RESEND_NEWSLETTER_SEGMENT_ID). Free ebook sources still get their download link back.
import { handlePreflight, json, jsonError } from "../_shared/cors.ts";
import { DOWNLOADS, parseSubscribeBody } from "../_shared/validate.ts";
import { upsertNewsletterContact } from "../_shared/resend.ts";

const MAX_BODY_BYTES = 4096;

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

  const input = parseSubscribeBody(body);
  if (!input.ok) return jsonError(req, 400, input.error);
  if (input.honeypot) return json(req, 200, { ok: true });

  const segmentId = Deno.env.get("RESEND_NEWSLETTER_SEGMENT_ID")?.trim();
  if (!segmentId) {
    console.error("nina-subscribe: RESEND_NEWSLETTER_SEGMENT_ID not set");
    return jsonError(req, 503, "not_configured");
  }

  const { email, source, firstName } = input;
  try {
    await upsertNewsletterContact(email, firstName, segmentId);
  } catch (err) {
    console.error("nina-subscribe:", source, err instanceof Error ? err.message : "unknown");
    return jsonError(req, 502, "subscribe_failed");
  }

  const download_url = DOWNLOADS[source];
  return json(req, 200, download_url ? { ok: true, download_url } : { ok: true });
});
