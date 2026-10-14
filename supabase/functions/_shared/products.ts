// Product catalog + pure helpers for the checkout / session / webhook functions.
// No network, no env reads (env is passed in) so everything here is unit-testable.

import { normalizeEmail } from "./validate.ts";

export const SELLER = "nina";

export type ProductSlug = "daybrief" | "ai-edge" | "package-it";

export type Product = {
  slug: ProductSlug;
  name: string;
  /** Stripe Price lookup key (one-time EUR price, live in Stripe). */
  lookupKey: string;
  /** Site page the buyer returns to on cancel. */
  page: string;
  /** Env var that must equal "true" for checkout to open. */
  gate: "SALES_OPEN" | "EBOOKS_OPEN";
};

export const PRODUCTS: Readonly<Record<ProductSlug, Product>> = {
  "daybrief": { slug: "daybrief", name: "Daybrief", lookupKey: "daybrief_eur_347", page: "daybrief.html", gate: "SALES_OPEN" },
  "ai-edge": { slug: "ai-edge", name: "AI Edge", lookupKey: "ai_edge_eur_27", page: "ai-edge.html", gate: "EBOOKS_OPEN" },
  "package-it": { slug: "package-it", name: "Package It", lookupKey: "package_it_eur_7", page: "package-it.html", gate: "EBOOKS_OPEN" },
};

export function isProductSlug(raw: unknown): raw is ProductSlug {
  return typeof raw === "string" && Object.prototype.hasOwnProperty.call(PRODUCTS, raw);
}

/** Checkout is open for a product only when its gate env var is exactly "true". */
export function isProductOpen(slug: ProductSlug, env: (name: string) => string | undefined): boolean {
  return env(PRODUCTS[slug].gate) === "true";
}

/** Private Storage layout: bucket "products", object "<slug>/<slug>-v1.zip". */
export const PRODUCTS_BUCKET = "products";
export function productObject(slug: ProductSlug): string {
  return `${slug}/${slug}-v1.zip`;
}
export function downloadName(slug: ProductSlug): string {
  return `${slug}-v1.zip`;
}

export const SESSION_LINK_TTL_SECONDS = 7 * 24 * 60 * 60; // shown on the thanks page
export const EMAIL_LINK_TTL_SECONDS = 30 * 24 * 60 * 60; // stored in Kit for the delivery email

export type CheckoutInput =
  | { ok: true; product: ProductSlug; email: string | null }
  | { ok: false; error: "invalid_body" | "invalid_email" | "invalid_product" };

/**
 * Parses the POST body of nina-checkout. `fallbackProduct` lets the legacy
 * daybrief-checkout alias accept `{ email? }` or an empty body.
 */
export function parseCheckoutBody(raw: string, fallbackProduct?: ProductSlug): CheckoutInput {
  let body: Record<string, unknown> = {};
  if (raw.trim()) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      return { ok: false, error: "invalid_body" };
    }
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return { ok: false, error: "invalid_body" };
    body = parsed as Record<string, unknown>;
  }
  const product = body.product ?? fallbackProduct;
  if (!isProductSlug(product)) return { ok: false, error: "invalid_product" };
  if (fallbackProduct && product !== fallbackProduct) return { ok: false, error: "invalid_product" };
  let email: string | null = null;
  if (body.email !== undefined && body.email !== null && body.email !== "") {
    email = normalizeEmail(body.email);
    if (!email) return { ok: false, error: "invalid_email" };
  }
  return { ok: true, product, email };
}

/**
 * Returns our product slug for a Checkout Session's metadata, or null when the
 * session belongs to something else on the same Stripe account (Flowity sales).
 * Sessions created before `seller` existed carry only `product`, so seller is
 * optional, but if present it must be ours.
 */
export function ourProduct(metadata: Record<string, string> | null | undefined): ProductSlug | null {
  if (!metadata) return null;
  if (metadata.seller !== undefined && metadata.seller !== SELLER) return null;
  return isProductSlug(metadata.product) ? metadata.product : null;
}

export const FULFIL_EVENTS = ["checkout.session.completed", "checkout.session.async_payment_succeeded"] as const;

/** Fulfil only on the two checkout events, and only once money is actually in (async methods complete unpaid first). */
export function shouldFulfil(eventType: string, paymentStatus: string | null | undefined): boolean {
  return (FULFIL_EVENTS as readonly string[]).includes(eventType) && paymentStatus === "paid";
}

/** Kit tag applied to buyers. A Kit automation on this tag sends the delivery email. */
export function buyerTag(slug: ProductSlug): string {
  return `${slug}-buyer`;
}

/** Kit custom field keys must be snake case; "ai-edge" -> "ai_edge". */
export function fieldSlug(slug: ProductSlug): string {
  return slug.replace(/-/g, "_");
}

/** Custom field values set on the buyer before tagging: purchased_<slug>_at and dl_<slug>. */
export function buyerFields(slug: ProductSlug, purchasedAt: Date, downloadUrl: string | null): Record<string, string> {
  const s = fieldSlug(slug);
  const fields: Record<string, string> = { [`purchased_${s}_at`]: purchasedAt.toISOString().slice(0, 10) };
  if (downloadUrl) fields[`dl_${s}`] = downloadUrl;
  return fields;
}
