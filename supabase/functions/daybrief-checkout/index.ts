// POST /daybrief-checkout  { email? }  -> 200 { url } | 403 { ok:false, error:"not_on_sale" }
import { handlePreflight, json, jsonError } from "../_shared/cors.ts";
import { normalizeEmail } from "../_shared/validate.ts";
import { DAYBRIEF_LOOKUP_KEY, SITE, stripe } from "../_shared/stripe.ts";

// EU withdrawal waiver for immediately delivered digital content (Directive 2011/83/EU art. 16(m)).
// Shown next to the pay button. Stripe's consent_collection.terms_of_service needs an
// account-level Terms URL set in the Dashboard, so the waiver lives here instead.
const WAIVER_TEXT =
  "Daybrief is digital content delivered immediately after payment. By paying you ask for immediate access " +
  "and acknowledge that you lose your 14 day right of withdrawal once the download is made available. " +
  "Questions: nina@flowity.ai";

let cachedPriceId: string | null = null;

async function daybriefPriceId(): Promise<string | null> {
  if (cachedPriceId) return cachedPriceId;
  const prices = await stripe().prices.list({ lookup_keys: [DAYBRIEF_LOOKUP_KEY], active: true, limit: 1 });
  cachedPriceId = prices.data[0]?.id ?? null;
  return cachedPriceId;
}

Deno.serve(async (req) => {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonError(req, 405, "method_not_allowed");
  if (Deno.env.get("SALES_OPEN") !== "true") return jsonError(req, 403, "not_on_sale");

  let email: string | null = null;
  const raw = await req.text();
  if (raw.length > 2048) return jsonError(req, 413, "body_too_large");
  if (raw.trim()) {
    try {
      const body = JSON.parse(raw) as Record<string, unknown>;
      if (body && body.email !== undefined && body.email !== null && body.email !== "") {
        email = normalizeEmail(body.email);
        if (!email) return jsonError(req, 400, "invalid_email");
      }
    } catch {
      return jsonError(req, 400, "invalid_body");
    }
  }

  try {
    const price = await daybriefPriceId();
    if (!price) {
      console.error("daybrief-checkout: no active price with lookup_key", DAYBRIEF_LOOKUP_KEY);
      return jsonError(req, 503, "price_unavailable");
    }
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      currency: "eur",
      success_url: `${SITE}/daybrief-thanks.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/daybrief.html`,
      ...(email ? { customer_email: email } : {}),
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
      invoice_creation: { enabled: true, invoice_data: { metadata: { product: "daybrief" } } },
      custom_text: { submit: { message: WAIVER_TEXT } },
      metadata: { product: "daybrief" },
      payment_intent_data: { metadata: { product: "daybrief" } },
    });
    if (!session.url) return jsonError(req, 502, "checkout_failed");
    return json(req, 200, { url: session.url });
  } catch (err) {
    // Stripe errors carry type/code; never echo the message (can include request details).
    const e = err as { type?: string; code?: string; message?: string };
    console.error("daybrief-checkout:", e.type ?? "error", e.code ?? "", e.message === "stripe_not_configured" ? "missing key" : "");
    return jsonError(req, 502, "checkout_failed");
  }
});
