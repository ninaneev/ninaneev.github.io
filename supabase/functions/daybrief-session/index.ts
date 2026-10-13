// GET /daybrief-session?session_id=cs_...  -> { paid, email?, download_url? }
import { handlePreflight, json, jsonError } from "../_shared/cors.ts";
import { isCheckoutSessionId } from "../_shared/validate.ts";
import { stripe } from "../_shared/stripe.ts";
import { tagSubscriber, upsertSubscriber } from "../_shared/kit.ts";

const BUCKET = "daybrief";
const OBJECT = "daybrief-v1.zip";
const SIGNED_TTL_SECONDS = 7 * 24 * 60 * 60;

/** Signed URL via Storage REST. Returns null if the object (or bucket) is missing. */
async function signedDownloadUrl(): Promise<string | null> {
  const base = Deno.env.get("SUPABASE_URL");
  const key = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!base || !key) {
    console.error("daybrief-session: storage env missing");
    return null;
  }
  const res = await fetch(`${base}/storage/v1/object/sign/${BUCKET}/${OBJECT}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, apikey: key, "Content-Type": "application/json" },
    body: JSON.stringify({ expiresIn: SIGNED_TTL_SECONDS }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) {
    await res.body?.cancel();
    console.error(`daybrief-session: sign failed ${res.status}`);
    return null;
  }
  const data = (await res.json()) as { signedURL?: string; signedUrl?: string };
  const path = data.signedURL ?? data.signedUrl;
  if (!path) return null;
  // signedURL is relative to /storage/v1 (e.g. "/object/sign/daybrief/daybrief-v1.zip?token=...").
  const url = new URL(`${base}/storage/v1${path}`);
  url.searchParams.set("download", OBJECT);
  return url.toString();
}

async function tagBuyer(email: string) {
  try {
    await upsertSubscriber(email, undefined, "active");
    await tagSubscriber(email, "daybrief-buyer");
  } catch (err) {
    console.error("daybrief-session: kit tag failed", err instanceof Error ? err.message : "unknown");
  }
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "GET") return jsonError(req, 405, "method_not_allowed");

  const sessionId = new URL(req.url).searchParams.get("session_id");
  if (!isCheckoutSessionId(sessionId)) return jsonError(req, 400, "invalid_session_id");

  let session;
  try {
    session = await stripe().checkout.sessions.retrieve(sessionId);
  } catch (err) {
    const e = err as { statusCode?: number; type?: string };
    if (e.statusCode === 404) return jsonError(req, 404, "session_not_found");
    console.error("daybrief-session: retrieve failed", e.type ?? "error");
    return jsonError(req, 502, "lookup_failed");
  }

  // Same Stripe account may hold other products: only Daybrief sessions unlock the download.
  if (session.metadata?.product !== "daybrief") return jsonError(req, 404, "session_not_found");

  const paid = session.payment_status === "paid";
  const email = session.customer_details?.email ?? session.customer_email ?? undefined;
  if (!paid) return json(req, 200, { paid: false });

  const [download_url] = await Promise.all([
    signedDownloadUrl(),
    email ? tagBuyer(email) : Promise.resolve(),
  ]);

  return json(req, 200, {
    paid: true,
    ...(email ? { email } : {}),
    ...(download_url ? { download_url } : {}),
  });
});
