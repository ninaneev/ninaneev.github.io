// Shared request handlers for nina-checkout / nina-session and their daybrief-* aliases.
import { handlePreflight, json, jsonError } from "./cors.ts";
import { isCheckoutSessionId } from "./validate.ts";
import {
  isProductOpen,
  ourProduct,
  parseCheckoutBody,
  PRODUCTS,
  type ProductSlug,
  SELLER,
  SESSION_LINK_TTL_SECONDS,
} from "./products.ts";
import { SITE, stripe } from "./stripe.ts";
import { productDownloadUrl } from "./storage.ts";

const MAX_BODY_BYTES = 2048;

// EU withdrawal waiver for immediately delivered digital content (Directive 2011/83/EU art. 16(m)).
// Stripe's consent_collection.terms_of_service needs an account level Terms URL, so the waiver
// is shown next to the pay button instead.
function waiverText(name: string): string {
  return `${name} is digital content delivered immediately after payment. By paying you ask for immediate access ` +
    "and acknowledge that you lose your 14 day right of withdrawal once the download is made available. " +
    "Questions: nina@flowity.ai";
}

// Warm-instance cache: lookup key -> price id.
const priceCache = new Map<string, string>();

async function priceId(lookupKey: string): Promise<string | null> {
  const cached = priceCache.get(lookupKey);
  if (cached) return cached;
  const prices = await stripe().prices.list({ lookup_keys: [lookupKey], active: true, limit: 1 });
  const id = prices.data[0]?.id ?? null;
  if (id) priceCache.set(lookupKey, id);
  return id;
}

/** POST { product, email? } -> 200 { url }. `alias` pins the product for legacy endpoints. */
export async function handleCheckout(req: Request, alias?: ProductSlug): Promise<Response> {
  const pre = handlePreflight(req);
  if (pre) return pre;
  if (req.method !== "POST") return jsonError(req, 405, "method_not_allowed");

  const raw = await req.text();
  if (raw.length > MAX_BODY_BYTES) return jsonError(req, 413, "body_too_large");
  const input = parseCheckoutBody(raw, alias);
  if (!input.ok) return jsonError(req, 400, input.error);

  const product = PRODUCTS[input.product];
  if (!isProductOpen(product.slug, (n) => Deno.env.get(n))) return jsonError(req, 403, "not_on_sale");

  try {
    const price = await priceId(product.lookupKey);
    if (!price) {
      console.error("checkout: no active price for lookup key", product.lookupKey);
      return jsonError(req, 503, "price_unavailable");
    }
    const metadata = { product: product.slug, seller: SELLER };
    const session = await stripe().checkout.sessions.create({
      mode: "payment",
      line_items: [{ price, quantity: 1 }],
      currency: "eur",
      success_url: `${SITE}/thanks.html?session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/${product.page}`,
      ...(input.email ? { customer_email: input.email } : {}),
      allow_promotion_codes: true,
      automatic_tax: { enabled: false },
      invoice_creation: { enabled: true, invoice_data: { metadata } },
      custom_text: { submit: { message: waiverText(product.name) } },
      metadata,
      payment_intent_data: { metadata },
    });
    if (!session.url) return jsonError(req, 502, "checkout_failed");
    return json(req, 200, { url: session.url });
  } catch (err) {
    // Stripe errors carry type/code; never echo the message (can include request details).
    const e = err as { type?: string; code?: string; message?: string };
    console.error("checkout:", e.type ?? "error", e.code ?? "", e.message === "stripe_not_configured" ? "missing key" : "");
    return jsonError(req, 502, "checkout_failed");
  }
}

/**
 * GET ?session_id=cs_... -> { paid, product, email?, download_url? } (7 day signed link).
 * Fulfilment emails come from the webhook + Kit; this only powers the thanks page.
 * `alias` restricts a legacy endpoint to one product.
 */
export async function handleSession(req: Request, alias?: ProductSlug): Promise<Response> {
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
    console.error("session: retrieve failed", e.type ?? "error");
    return jsonError(req, 502, "lookup_failed");
  }

  // Same Stripe account holds Flowity sales: only our product sessions unlock a download.
  const slug = ourProduct(session.metadata);
  if (!slug || (alias && slug !== alias)) return jsonError(req, 404, "session_not_found");

  if (session.payment_status !== "paid") return json(req, 200, { paid: false, product: slug });

  const email = session.customer_details?.email ?? session.customer_email ?? undefined;
  const download_url = await productDownloadUrl(slug, SESSION_LINK_TTL_SECONDS);
  return json(req, 200, {
    paid: true,
    product: slug,
    ...(email ? { email } : {}),
    ...(download_url ? { download_url } : {}),
  });
}
