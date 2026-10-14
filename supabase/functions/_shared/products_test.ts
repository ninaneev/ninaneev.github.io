// Run: deno test _shared/
import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import {
  buyerFields,
  buyerTag,
  fieldSlug,
  isProductOpen,
  isProductSlug,
  ourProduct,
  parseCheckoutBody,
  PRODUCTS,
  productObject,
  shouldFulfil,
} from "./products.ts";

Deno.test("catalog: lookup keys and pages", () => {
  assertEquals(PRODUCTS["daybrief"].lookupKey, "daybrief_eur_347");
  assertEquals(PRODUCTS["ai-edge"].lookupKey, "ai_edge_eur_27");
  assertEquals(PRODUCTS["package-it"].lookupKey, "package_it_eur_7");
  assertEquals(PRODUCTS["ai-edge"].page, "ai-edge.html");
  assert(isProductSlug("package-it"));
  assert(!isProductSlug("toString"));
  assert(!isProductSlug("Daybrief"));
  assert(!isProductSlug(null));
});

Deno.test("gates: daybrief on SALES_OPEN, ebooks on EBOOKS_OPEN, exact 'true' only", () => {
  const env = (vals: Record<string, string>) => (n: string) => vals[n];
  assert(isProductOpen("daybrief", env({ SALES_OPEN: "true" })));
  assert(!isProductOpen("daybrief", env({ SALES_OPEN: "TRUE", EBOOKS_OPEN: "true" })));
  assert(isProductOpen("ai-edge", env({ EBOOKS_OPEN: "true" })));
  assert(!isProductOpen("package-it", env({ SALES_OPEN: "true" })));
  assert(!isProductOpen("ai-edge", env({})));
});

Deno.test("checkout body: product whitelist, email, alias", () => {
  assertEquals(parseCheckoutBody('{"product":"ai-edge"}'), { ok: true, product: "ai-edge", email: null });
  assertEquals(parseCheckoutBody('{"product":"x"}'), { ok: false, error: "invalid_product" });
  assertEquals(parseCheckoutBody(""), { ok: false, error: "invalid_product" });
  assertEquals(parseCheckoutBody("{bad"), { ok: false, error: "invalid_body" });
  assertEquals(parseCheckoutBody("[1]"), { ok: false, error: "invalid_body" });
  assertEquals(parseCheckoutBody('{"product":"daybrief","email":"bad"}'), { ok: false, error: "invalid_email" });
  assertEquals(parseCheckoutBody('{"product":"daybrief","email":" A@B.co "}'), { ok: true, product: "daybrief", email: "a@b.co" });
  // legacy daybrief-checkout alias
  assertEquals(parseCheckoutBody("", "daybrief"), { ok: true, product: "daybrief", email: null });
  assertEquals(parseCheckoutBody('{"email":""}', "daybrief"), { ok: true, product: "daybrief", email: null });
  assertEquals(parseCheckoutBody('{"product":"ai-edge"}', "daybrief"), { ok: false, error: "invalid_product" });
});

Deno.test("ownership: only our products, seller must match when present", () => {
  assertEquals(ourProduct({ product: "daybrief" }), "daybrief");
  assertEquals(ourProduct({ product: "ai-edge", seller: "nina" }), "ai-edge");
  assertEquals(ourProduct({ product: "ai-edge", seller: "flowity" }), null);
  assertEquals(ourProduct({ organization_id: "org_1" }), null);
  assertEquals(ourProduct({}), null);
  assertEquals(ourProduct(null), null);
});

Deno.test("fulfil gating", () => {
  assert(shouldFulfil("checkout.session.completed", "paid"));
  assert(shouldFulfil("checkout.session.async_payment_succeeded", "paid"));
  assert(!shouldFulfil("checkout.session.completed", "unpaid"));
  assert(!shouldFulfil("checkout.session.async_payment_failed", "paid"));
  assert(!shouldFulfil("payment_intent.succeeded", "paid"));
});

Deno.test("storage path, tag and Kit fields", () => {
  assertEquals(productObject("daybrief"), "daybrief/daybrief-v1.zip");
  assertEquals(productObject("package-it"), "package-it/package-it-v1.zip");
  assertEquals(buyerTag("ai-edge"), "ai-edge-buyer");
  assertEquals(fieldSlug("package-it"), "package_it");
  const at = new Date("2026-11-16T09:30:00Z");
  assertEquals(buyerFields("ai-edge", at, "https://x/y"), { purchased_ai_edge_at: "2026-11-16", dl_ai_edge: "https://x/y" });
  assertEquals(buyerFields("daybrief", at, null), { purchased_daybrief_at: "2026-11-16" });
});
