// Run: deno test supabase/functions/_shared/waitlist_test.ts
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.13";
import { normalizeWebsite, parseWaitlistBody } from "./validate.ts";
import { RateLimiter } from "./ratelimit.ts";
import { confirmationEmail, contactPayload, escapeHtml, notificationEmail } from "./resend.ts";

Deno.test("website: normalised, optional, junk rejected", () => {
  assertEquals(normalizeWebsite("acme.com"), "https://acme.com");
  assertEquals(normalizeWebsite("  https://WWW.Acme.com/ "), "https://www.acme.com");
  assertEquals(normalizeWebsite("http://acme.co.uk/about/?utm=x#top"), "http://acme.co.uk/about");
  assertEquals(normalizeWebsite("linkedin.com/in/ninaneev"), "https://linkedin.com/in/ninaneev");
  assertEquals(normalizeWebsite(""), undefined);
  assertEquals(normalizeWebsite("   "), undefined);
  assertEquals(normalizeWebsite(undefined), undefined);
  assertEquals(normalizeWebsite(null), undefined);
  assertEquals(normalizeWebsite("not a site"), null);
  assertEquals(normalizeWebsite("localhost"), null);
  assertEquals(normalizeWebsite("javascript:alert(1)"), null);
  assertEquals(normalizeWebsite("ftp://acme.com"), null);
  assertEquals(normalizeWebsite("https://user:pw@acme.com"), null);
  assertEquals(normalizeWebsite("http://127.0.0.1"), null);
  assertEquals(normalizeWebsite("a".repeat(200) + ".com"), null);
  assertEquals(normalizeWebsite(42), null);
});

Deno.test("waitlist body: honeypot, validation, happy path", () => {
  assertEquals(parseWaitlistBody({ email: "x", company: "Acme" }), { ok: true, honeypot: true });
  assertEquals(parseWaitlistBody(null), { ok: false, error: "invalid_body" });
  assertEquals(parseWaitlistBody("a@b.co"), { ok: false, error: "invalid_body" });
  assertEquals(parseWaitlistBody({ email: "bad" }), { ok: false, error: "invalid_email" });
  assertEquals(parseWaitlistBody({ email: "a@b.co", website: "nope nope" }), { ok: false, error: "invalid_website" });
  assertEquals(parseWaitlistBody({ email: " A@B.co ", website: "acme.com", referrer: "/daybrief.html", company: "" }), {
    ok: true,
    honeypot: false,
    email: "a@b.co",
    website: "https://acme.com",
    referrer: "/daybrief.html",
  });
  const noSite = parseWaitlistBody({ email: "a@b.co", website: "", referrer: "https://evil.com" });
  assertEquals(noSite, { ok: true, honeypot: false, email: "a@b.co", website: undefined, referrer: undefined });
});

Deno.test("rate limiter: fixed window per key", () => {
  const rl = new RateLimiter(2, 1000);
  assert(rl.allow("ip", 0));
  assert(rl.allow("ip", 10));
  assert(!rl.allow("ip", 20));
  assert(rl.allow("other", 20));
  assert(rl.allow("ip", 1000));
});

Deno.test("resend contact payload: property and segment only when present", () => {
  assertEquals(contactPayload("a@b.co", "https://acme.com", "seg_1"), {
    email: "a@b.co",
    unsubscribed: false,
    properties: { website: "https://acme.com" },
    segments: [{ id: "seg_1" }],
  });
  assertEquals(contactPayload("a@b.co", undefined, undefined), { email: "a@b.co", unsubscribed: false });
});

Deno.test("emails: confirmation copy and notification subject", () => {
  const c = confirmationEmail("a@b.co");
  assertEquals(c.to, "a@b.co");
  assertEquals(c.reply_to, "nina@flowity.ai");
  assertStringIncludes(c.text, "using it myself first");
  assertStringIncludes(c.text, "what your mornings look like");
  assert(!/[–—]/.test(c.text), "no dashes in copy");

  const n = notificationEmail({ email: "a@b.co", website: "https://x.com/<b>", contact: "failed", at: "t" });
  assertEquals(n.to, "nina@flowity.ai");
  assertEquals(n.subject, "[Site · Daybrief] waitlist: a@b.co");
  assertEquals(n.reply_to, "a@b.co");
  assertStringIncludes(n.text, "Website: https://x.com/<b>");
  assertStringIncludes(n.text, "FAILED");
  assert(!n.html.includes("<b>"), "html escaped");
  assertEquals(escapeHtml(`<a href="x">'&`), "&lt;a href=&quot;x&quot;&gt;&#39;&amp;");
});
