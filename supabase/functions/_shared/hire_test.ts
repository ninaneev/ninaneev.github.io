// Run: deno test supabase/functions/_shared/hire_test.ts
import { assert, assertEquals, assertStringIncludes } from "jsr:@std/assert@1.0.13";
import { cleanText, parseHireBody } from "./validate.ts";
import { hireConfirmationEmail, hireNotificationEmail } from "./resend.ts";

const base = { email: "Ana@Acme.com", service: "automation", message: "Leads from our form should land in the CRM." };

Deno.test("hire body: honeypot and shape", () => {
  assertEquals(parseHireBody({ ...base, company: "x" }), { ok: true, honeypot: true });
  assertEquals(parseHireBody(null), { ok: false, error: "invalid_body" });
  assertEquals(parseHireBody([base]), { ok: false, error: "invalid_body" });
});

Deno.test("hire body: field validation", () => {
  assertEquals(parseHireBody({ ...base, email: "nope" }), { ok: false, error: "invalid_email" });
  assertEquals(parseHireBody({ ...base, website: "not a site" }), { ok: false, error: "invalid_website" });
  assertEquals(parseHireBody({ ...base, service: "mobile-app" }), { ok: false, error: "invalid_service" });
  assertEquals(parseHireBody({ ...base, service: "toString" }), { ok: false, error: "invalid_service" });
  assertEquals(parseHireBody({ ...base, service: "other" }), { ok: false, error: "invalid_other" });
  assertEquals(parseHireBody({ ...base, service: "other", other: "x".repeat(121) }), { ok: false, error: "invalid_other" });
  assertEquals(parseHireBody({ ...base, message: "short" }), { ok: false, error: "invalid_message" });
  assertEquals(parseHireBody({ ...base, message: "a".repeat(4001) }), { ok: false, error: "invalid_message" });
});

Deno.test("hire body: happy path", () => {
  const r = parseHireBody({ ...base, name: " Ana ", website: "acme.com", referrer: "/work.html" });
  assert(r.ok && !r.honeypot);
  assertEquals(r.email, "ana@acme.com");
  assertEquals(r.name, "Ana");
  assertEquals(r.website, "https://acme.com");
  assertEquals(r.service, "automation");
  assertEquals(r.other, undefined);
  assertEquals(r.referrer, "/work.html");
  const o = parseHireBody({ ...base, service: "other", other: "Chrome extension", referrer: "javascript:x" });
  assert(o.ok && !o.honeypot);
  assertEquals(o.other, "Chrome extension");
  assertEquals(o.referrer, undefined);
  // The "other" text is ignored when a listed service is chosen.
  const n = parseHireBody({ ...base, other: "ignored" });
  assert(n.ok && !n.honeypot);
  assertEquals(n.other, undefined);
});

Deno.test("cleanText keeps newlines only when multiline", () => {
  assertEquals(cleanText("a\r\nb\u0007", 10, true), "a\nb");
  assertEquals(cleanText("a\nb", 10), "ab");
  assertEquals(cleanText("   ", 10), undefined);
  assertEquals(cleanText("abcdef", 3), null);
});

Deno.test("hire emails: escaped, reply_to set", () => {
  const n = hireNotificationEmail({
    name: "<b>Ana</b>",
    email: "ana@acme.com",
    serviceLabel: "Other",
    other: "Chrome extension",
    message: "Line 1\n<script>",
    at: "2026-10-20T00:00:00Z",
  });
  assertEquals(n.to, "nina@flowity.ai");
  assertEquals(n.reply_to, "ana@acme.com");
  assertStringIncludes(n.subject, "[Site · Work] Other: Chrome extension");
  assertStringIncludes(n.html, "&lt;script&gt;");
  assert(!n.html.includes("<script>"));
  assertStringIncludes(n.text, "Line 1\n<script>");
  const c = hireConfirmationEmail("ana@acme.com", "Ana");
  assertEquals(c.reply_to, "nina@flowity.ai");
  assertStringIncludes(c.text, "Hi Ana,");
  assertStringIncludes(hireConfirmationEmail("a@b.co").text, "Hi,");
});
