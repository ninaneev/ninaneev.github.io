// Run: deno test supabase/functions/_shared/helpers_test.ts
import { assert, assertEquals } from "jsr:@std/assert@1.0.13";
import { corsHeaders, isAllowedOrigin } from "./cors.ts";
import {
  cleanFirstName,
  DOWNLOADS,
  isSource,
  isCheckoutSessionId,
  normalizeEmail,
  parseSubscribeBody,
  tagsForSource,
} from "./validate.ts";

Deno.test("cors: allows prod and local origins only", () => {
  assert(isAllowedOrigin("https://ninaneev.github.io"));
  assert(isAllowedOrigin("http://localhost:5173"));
  assert(isAllowedOrigin("http://localhost"));
  assert(isAllowedOrigin("http://127.0.0.1:8080"));
  assert(!isAllowedOrigin("https://ninaneev.github.io.evil.com"));
  assert(!isAllowedOrigin("http://localhost.evil.com"));
  assert(!isAllowedOrigin("https://localhost:3000"));
  assert(!isAllowedOrigin("http://ninaneev.github.io"));
  assert(!isAllowedOrigin(null));
});

Deno.test("cors: header only echoed for allowed origin", () => {
  assertEquals(corsHeaders("http://localhost:3000")["Access-Control-Allow-Origin"], "http://localhost:3000");
  assertEquals(corsHeaders("https://evil.com")["Access-Control-Allow-Origin"], undefined);
});

Deno.test("email: normalizes and rejects junk", () => {
  assertEquals(normalizeEmail("  Nina@Example.COM "), "nina@example.com");
  assertEquals(normalizeEmail("a.b+tag@sub.example.co"), "a.b+tag@sub.example.co");
  assertEquals(normalizeEmail("no-at-sign.com"), null);
  assertEquals(normalizeEmail("a@b"), null);
  assertEquals(normalizeEmail("a b@example.com"), null);
  assertEquals(normalizeEmail("x@" + "a".repeat(250) + ".com"), null);
  assertEquals(normalizeEmail(42), null);
});

Deno.test("first name: cleaned and capped", () => {
  assertEquals(cleanFirstName("  Ana <b> "), "Ana b");
  assertEquals(cleanFirstName("x".repeat(200))?.length, 80);
  assertEquals(cleanFirstName("   "), undefined);
  assertEquals(cleanFirstName(null), undefined);
});

Deno.test("subscribe body: honeypot, validation, happy path", () => {
  assertEquals(parseSubscribeBody({ email: "x", source: "nope", company: "Acme" }), { ok: true, honeypot: true });
  assertEquals(parseSubscribeBody(null), { ok: false, error: "invalid_body" });
  assertEquals(parseSubscribeBody([]), { ok: false, error: "invalid_body" });
  assertEquals(parseSubscribeBody({ email: "bad", source: "newsletter" }), { ok: false, error: "invalid_email" });
  assertEquals(parseSubscribeBody({ email: "a@b.co", source: "ebook" }), { ok: false, error: "invalid_source" });
  assertEquals(parseSubscribeBody({ email: "A@B.co", source: "day-plan", first_name: "Ana", company: "" }), {
    ok: true,
    honeypot: false,
    email: "a@b.co",
    source: "day-plan",
    firstName: "Ana",
  });
});

Deno.test("tags: newsletter plus source tag", () => {
  assertEquals(tagsForSource("day-plan"), ["newsletter", "src-day-plan"]);
  assertEquals(tagsForSource("newsletter"), ["newsletter", "src-newsletter"]);
});

Deno.test("checkout session id format", () => {
  assert(isCheckoutSessionId("cs_test_a1B2c3D4e5F6g7H8"));
  assert(isCheckoutSessionId("cs_live_a1B2c3D4e5F6g7H8"));
  assert(!isCheckoutSessionId("cs_test_short"));
  assert(!isCheckoutSessionId("pi_test_a1B2c3D4e5F6g7H8"));
  assert(!isCheckoutSessionId("cs_test_a1B2c3D4e5F6g7H8/../x"));
  assert(!isCheckoutSessionId(null));
});

Deno.test("new ebook sources: accepted, downloads, tags", () => {
  for (const s of ["unlocking-ebook", "sentiment-ebook", "ebooks-waitlist"]) assert(isSource(s));
  assertEquals(DOWNLOADS["unlocking-ebook"], "/free/files/unlocking-business-potential.pdf");
  assertEquals(DOWNLOADS["sentiment-ebook"], "/free/files/sentiment-synthesis.pdf");
  assertEquals(DOWNLOADS["ebooks-waitlist"], undefined);
  assertEquals(tagsForSource("ebooks-waitlist"), ["newsletter", "src-ebooks-waitlist"]);
});
