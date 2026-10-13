// POST /nina-subscribe  { email, first_name?, source, company? (honeypot) }
// -> 200 { ok: true, download_url? } | 400 { ok: false, error } | 502 { ok: false, error: "subscribe_failed" }
import { handlePreflight, json, jsonError } from "../_shared/cors.ts";
import { DOWNLOADS, parseSubscribeBody, tagsForSource } from "../_shared/validate.ts";
import { addToForm, tagSubscriber, upsertSubscriber } from "../_shared/kit.ts";

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

  const { email, source, firstName } = input;
  // Optional double opt-in: if KIT_FORM_ID is set, the subscriber is created
  // "inactive" and added to that form; a form with double opt-in enabled then
  // sends Kit's confirmation email. Without it, subscribers are created active
  // (single opt-in, Kit's API default).
  const formId = Deno.env.get("KIT_FORM_ID")?.trim() || "";

  try {
    await upsertSubscriber(email, firstName, formId ? "inactive" : "active");
    if (formId) await addToForm(formId, email, req.headers.get("referer") ?? undefined);
    for (const tag of tagsForSource(source)) await tagSubscriber(email, tag);
  } catch (err) {
    console.error("nina-subscribe:", err instanceof Error ? err.message : "unknown");
    return jsonError(req, 502, "subscribe_failed");
  }

  const download_url = DOWNLOADS[source];
  return json(req, 200, download_url ? { ok: true, download_url } : { ok: true });
});
