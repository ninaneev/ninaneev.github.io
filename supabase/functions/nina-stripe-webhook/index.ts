// POST /nina-stripe-webhook  (Stripe -> us; signature verified with NINA_STRIPE_WEBHOOK_SECRET)
//
// Named nina-stripe-webhook, not stripe-webhook: the Flowity project already runs its own
// `stripe-webhook` function and `STRIPE_WEBHOOK_SECRET` secret for Flowity billing. Reusing
// either name would overwrite Flowity's live webhook.
//
// Fulfils checkout.session.completed / checkout.session.async_payment_succeeded for our
// products only (metadata.product in the catalog, metadata.seller "nina" or absent).
// For each paid session: sign a 30 day download URL, upsert the buyer in Kit, set custom
// fields purchased_<slug>_at + dl_<slug>, THEN tag "<slug>-buyer" (the tag triggers the Kit
// delivery automation, so the field must be set first). Every step is repeat safe, so Stripe
// retries are harmless. Logs carry event ids and slugs only, never emails or URLs.
import Stripe from "npm:stripe@22.6.0";
import { cryptoProvider, stripe } from "../_shared/stripe.ts";
import { buyerFields, buyerTag, EMAIL_LINK_TTL_SECONDS, ourProduct, type ProductSlug, shouldFulfil } from "../_shared/products.ts";
import { productDownloadUrl } from "../_shared/storage.ts";
import { setSubscriberFields, tagSubscriber, upsertSubscriber } from "../_shared/kit.ts";
import { normalizeEmail } from "../_shared/validate.ts";

const MAX_BODY_BYTES = 512 * 1024;

// Warm-instance dedupe of fulfilled event ids (best effort; Kit calls are idempotent anyway).
const done = new Set<string>();

function reply(status: number, body: Record<string, unknown> = { received: true }): Response {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

async function fulfil(slug: ProductSlug, email: string, purchasedAt: Date): Promise<void> {
  const dl = await productDownloadUrl(slug, EMAIL_LINK_TTL_SECONDS);
  if (!dl) console.error(`webhook: no download object for ${slug}; buyer tagged without dl field`);
  const subscriberId = await upsertSubscriber(email, undefined, "active");
  if (!subscriberId) throw new Error("kit_no_subscriber_id");
  await setSubscriberFields(subscriberId, buyerFields(slug, purchasedAt, dl));
  await tagSubscriber(email, buyerTag(slug));
}

Deno.serve(async (req) => {
  if (req.method !== "POST") return reply(405, { error: "method_not_allowed" });

  const secret = Deno.env.get("NINA_STRIPE_WEBHOOK_SECRET");
  if (!secret) {
    console.error("webhook: NINA_STRIPE_WEBHOOK_SECRET not set");
    return reply(500, { error: "not_configured" });
  }
  const signature = req.headers.get("stripe-signature");
  if (!signature) return reply(400, { error: "missing_signature" });

  const raw = await req.text(); // raw body, exactly as signed
  if (raw.length > MAX_BODY_BYTES) return reply(413, { error: "body_too_large" });

  let event: Stripe.Event;
  try {
    event = await stripe().webhooks.constructEventAsync(raw, signature, secret, undefined, cryptoProvider);
  } catch {
    console.error("webhook: signature verification failed");
    return reply(400, { error: "invalid_signature" });
  }

  if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
    return reply(200); // subscribed to more events than we need: acknowledge and ignore
  }
  const session = event.data.object as Stripe.Checkout.Session;
  const slug = ourProduct(session.metadata);
  if (!slug) return reply(200, { received: true, ignored: "not_ours" }); // Flowity sale or other
  if (!shouldFulfil(event.type, session.payment_status)) {
    // Async methods (e.g. SEPA) complete unpaid; async_payment_succeeded fulfils later.
    console.log(`webhook: ${event.id} ${slug} not paid yet`);
    return reply(200, { received: true, pending: true });
  }
  if (done.has(event.id)) return reply(200, { received: true, duplicate: true });

  const email = normalizeEmail(session.customer_details?.email ?? session.customer_email ?? "");
  if (!email) {
    console.error(`webhook: ${event.id} ${slug} paid session without usable email`);
    return reply(200, { received: true, ignored: "no_email" }); // retrying will not help
  }

  try {
    await fulfil(slug, email, new Date(session.created * 1000));
  } catch (err) {
    // 500 makes Stripe retry with backoff; every step above is safe to repeat.
    console.error(`webhook: ${event.id} ${slug} fulfil failed`, err instanceof Error ? err.message : "unknown");
    return reply(500, { error: "fulfil_failed" });
  }
  done.add(event.id);
  console.log(`webhook: ${event.id} ${slug} fulfilled`);
  return reply(200);
});
