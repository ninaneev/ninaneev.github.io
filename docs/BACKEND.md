# Backend: Supabase Edge Functions

Deno functions in `supabase/functions/` deploy to the **Flowity** Supabase project
(`yrqbzaqbracrgaxzhyxr`). Names are prefixed (`nina-`, `daybrief-`) so they never clash with
Flowity's own functions in the same project.

| Function | Method | Purpose |
| --- | --- | --- |
| `nina-subscribe` | POST `{email, first_name?, source, company?}` | Resend (Kit dropped 2026-10-15): contact added to the newsletter segment (secret `RESEND_NEWSLETTER_SEGMENT_ID`, plus `RESEND_API_KEY`); 503 `not_configured` if the segment secret is missing; returns `download_url` for `day-plan`, `automation-ebook`, `unlocking-ebook` (`/free/files/unlocking-business-potential.pdf`), `sentiment-ebook` (`/free/files/sentiment-synthesis.pdf`); other sources: newsletter, daybrief-waitlist, ebooks-waitlist |
| `nina-checkout` | POST `{product, email?}` | Stripe Checkout Session for `daybrief`, `ai-edge` or `package-it`; 403 `not_on_sale` unless that product is open |
| `nina-session` | GET `?session_id=cs_...` | `{paid, product, email?, download_url?}`; on paid signs a 7 day URL for the product zip |
| `nina-stripe-webhook` | POST (Stripe only) | Fulfilment: Kit buyer tag + custom fields with a 30 day download link. STILL KIT: must move to Resend (email the signed link directly) before any paid sale opens |
| `daybrief-checkout` | POST `{email?}` | Legacy alias of `nina-checkout` pinned to `daybrief` |
| `daybrief-session` | GET `?session_id=cs_...` | Legacy alias of `nina-session`, only answers for Daybrief sessions |
| `daybrief-waitlist` | POST `{email, website?, referrer?, company?}` | Resend (not Kit): contact with `website` property in the Daybrief segment, confirmation email from nina@flowity.ai, notification to Nina. See section 9 |

Errors are always `{ "ok": false, "error": "<code>" }` with no upstream details. CORS allows
`https://ninaneev.github.io` and `http://localhost:*` / `http://127.0.0.1:*` only (the webhook
has no CORS, Stripe calls it server to server).

Products (`supabase/functions/_shared/products.ts`):

| Slug | Stripe lookup key | Opens when | Cancel page |
| --- | --- | --- | --- |
| `daybrief` | `daybrief_eur_347` | `SALES_OPEN=true` | `daybrief.html` |
| `ai-edge` | `ai_edge_eur_27` | `EBOOKS_OPEN=true` | `ai-edge.html` |
| `package-it` | `package_it_eur_7` | `EBOOKS_OPEN=true` | `package-it.html` |

Every session gets `metadata.product=<slug>` and `metadata.seller=nina`, success URL
`https://ninaneev.github.io/thanks.html?session_id={CHECKOUT_SESSION_ID}`. The Stripe account is
Flowity's, so the session endpoint and the webhook ignore anything without one of these slugs
(Flowity's own webhook only acts on `mode=subscription`, so it ignores these one time sales).
Note: `daybrief-checkout` now also returns to `thanks.html`, so publish the new frontend before
opening Daybrief sales.

## 1. Secrets (Nina sets these herself)

Already set: `KIT_API_KEY`, `STRIPE_SECRET_KEY`, `SALES_OPEN`. `SUPABASE_URL` and
`SUPABASE_SERVICE_ROLE_KEY` are injected by the edge runtime. New ones:

| Secret | Value | Where |
| --- | --- | --- |
| `EBOOKS_OPEN` | `true` or `false` | Dashboard or CLI (not sensitive) |
| `NINA_STRIPE_WEBHOOK_SECRET` | the `whsec_...` signing secret from step 3 | **Dashboard only** |

Set secrets in Supabase Dashboard > Project `yrqbzaqbracrgaxzhyxr` > Edge Functions > Secrets
(Add new secret). Do not paste the webhook signing secret into a terminal, chat or file.

**Do not use the names `stripe-webhook` or `STRIPE_WEBHOOK_SECRET`.** Both already exist in this
project for Flowity billing (`flowity-executive-hub/supabase/functions/stripe-webhook`).
Deploying a function with that name or overwriting that secret would break Flowity's live
subscriptions. That is why ours is `nina-stripe-webhook` with `NINA_STRIPE_WEBHOOK_SECRET`.

## 2. Storage bucket `products`

Dashboard > Storage > New bucket: name `products`, **Private** (public off). No RLS policies:
only the service role signs URLs. Layout:

```
products/
  daybrief/daybrief-v1.zip
  ai-edge/ai-edge-v1.zip
  package-it/package-it-v1.zip
```

To ship a new version, upload `<slug>-v2.zip` and change `productObject()` in
`_shared/products.ts` (old links keep working until they expire). The legacy layout (bucket
`daybrief`, object `daybrief-v1.zip`) is still used as a fallback for Daybrief only, so moving
the file can happen any time. If an object is missing, `nina-session` returns `paid: true`
without a link and the webhook tags the buyer without a `dl_` field (logged as an error).

## 3. Stripe webhook endpoint (Nina, Stripe Dashboard)

1. Stripe Dashboard (Flowity account, live mode) > Developers > Webhooks > Add endpoint.
2. Endpoint URL: `https://yrqbzaqbracrgaxzhyxr.supabase.co/functions/v1/nina-stripe-webhook`
3. Events: `checkout.session.completed` and `checkout.session.async_payment_succeeded`. Nothing
   else.
4. Save, then Reveal the signing secret and paste it into Supabase Secrets as
   `NINA_STRIPE_WEBHOOK_SECRET` (Dashboard, step 1). Redeploy `nina-stripe-webhook` or wait for a
   cold start.
5. Test: Stripe > the endpoint > Send test event `checkout.session.completed`. Expected 200 with
   `ignored: not_ours` (the fixture has no product metadata). A real paid session returns
   `{received:true}` and the buyer appears in Kit with the tag and fields.

The webhook fulfils only paid sessions (async methods such as SEPA complete unpaid and are
fulfilled on `async_payment_succeeded`). Order per sale: sign a 30 day URL, upsert the buyer in
Kit, set fields, then apply the tag. On any Kit error it returns 500 and Stripe retries; every
step is safe to repeat. Logs contain event ids and slugs only.

## 4. Kit delivery automation (one per product)

The webhook sets these custom fields (created automatically on first sale if missing) before
tagging:

| Product | Tag | Fields |
| --- | --- | --- |
| Daybrief | `daybrief-buyer` | `purchased_daybrief_at`, `dl_daybrief` |
| AI Edge | `ai-edge-buyer` | `purchased_ai_edge_at`, `dl_ai_edge` |
| Package It | `package-it-buyer` | `purchased_package_it_at`, `dl_package_it` |

Recipe (Kit > Automations > New automation), repeat per product:

1. Entry point: "Is added to a tag" > `<slug>-buyer` (create the tag by hand first if no sale
   has happened yet, the webhook also creates it).
2. Step: Email. Subject e.g. "Your Daybrief download". Body with a button whose link is
   `{{ subscriber.dl_daybrief }}` (`dl_ai_edge`, `dl_package_it` for the ebooks), plus a line
   that the link works for 30 days and to reply for a fresh one.
3. Publish the automation. Exclude `*-buyer` tags from newsletter broadcasts unless they also
   carry `newsletter`.

Kit only emails subscribers who are not unsubscribed. A buyer who unsubscribed earlier still
gets the thanks page link, but not the email; resend by hand if they ask.

## 5. Deploy (PowerShell, from the repo root)

```powershell
$ref = "yrqbzaqbracrgaxzhyxr"
foreach ($fn in @("nina-checkout", "nina-session", "nina-stripe-webhook", "daybrief-checkout", "daybrief-session")) {
  supabase functions deploy $fn --project-ref $ref --no-verify-jwt
}
```

Add `nina-subscribe` to the list only when it changed. `--no-verify-jwt` is required: the static
site and Stripe call these without a Supabase key (the webhook authenticates by Stripe
signature instead).

Local checks (Deno via npx works without a Deno install):

```powershell
cd supabase/functions
npx -y deno check nina-subscribe/index.ts nina-checkout/index.ts nina-session/index.ts nina-stripe-webhook/index.ts daybrief-checkout/index.ts daybrief-session/index.ts daybrief-waitlist/index.ts
npx -y deno test _shared/
```

## 6. Open or close sales per product

| To open | Supabase secret | Site |
| --- | --- | --- |
| Daybrief (launch 16 Nov 2026) | `SALES_OPEN=true` | `SALES_OPEN: true` in `config.js`, publish |
| AI Edge and Package It (together) | `EBOOKS_OPEN=true` | whatever flag the frontend uses for the ebook buy buttons |

Set the secret in Dashboard > Edge Functions > Secrets, or from PowerShell:

```powershell
supabase secrets set EBOOKS_OPEN=true --project-ref yrqbzaqbracrgaxzhyxr
```

Secrets apply on the next cold start; redeploying `nina-checkout` (and `daybrief-checkout`)
forces it. To close, set back to `false`. Before opening: the price with the lookup key is
active in live mode, the zip is in `products/<slug>/`, the webhook endpoint exists and the Kit
automation is published.

## 7. Stripe notes

- `automatic_tax` is **off**: prices are charged as is. VAT handling (OSS registration, tax
  inclusive pricing) is Nina's call; turn it on only after a Stripe Tax registration exists.
- The EU 14 day withdrawal waiver is shown via `custom_text.submit` (per product name), since
  `consent_collection.terms_of_service` needs an account level ToS URL.
- `invoice_creation` on, promotion codes allowed. Prefer a restricted key (`rk_...`) with write
  on Checkout Sessions and read on Prices.

## 8. Test

Use a Stripe sandbox key first (and a sandbox webhook endpoint with its own signing secret).
Card `4242 4242 4242 4242`, any future expiry, any CVC. Declines `4000 0000 0000 0002`, 3DS
`4000 0027 6000 3184`.

```powershell
$FN = "https://yrqbzaqbracrgaxzhyxr.supabase.co/functions/v1"
Invoke-RestMethod -Method Post -Uri "$FN/nina-checkout" -ContentType "application/json" -Body '{"product":"ai-edge"}'
Invoke-RestMethod -Uri "$FN/nina-session?session_id=cs_test_..."
```

## 9. Daybrief waitlist (`daybrief-waitlist`, Resend)

The two "Tell me when it's ready" forms on `daybrief.html` post `{email, website?, referrer, company}`
here. `company` is the honeypot (filled = fake 200, nothing sent). The website is optional;
`yourcompany.com` becomes `https://yourcompany.com` (query, hash, trailing slash dropped).

Per signup: (1) `POST /contacts` with `properties.website` and `segments:[{id}]`; if the contact
already exists it falls back to `PATCH /contacts/{email}` + `POST /contacts/{email}/segments/{id}`.
(2) Confirmation from `Nina Niamh <nina@flowity.ai>` (reply to nina@), subject "You're on the
Daybrief list". (3) Notification to nina@flowity.ai, subject `[Site · Daybrief] waitlist: <email>`,
with the website and whether the Resend contact was saved (reply goes to the person).
Returns 200 unless both the contact and the notification failed (502 `waitlist_failed`).
Other errors: 400 `invalid_body|invalid_email|invalid_website`, 413, 429 `rate_limited`
(5 per IP per 10 min, per warm instance), 503 `not_configured` (no `RESEND_API_KEY`). The same
email twice within an hour gets 200 without a second email. The page shows a mailto fallback on
any failure.

### Resend setup (Nina, Resend dashboard, once)

1. Audience > Properties > Add property: key `website`, type `string`, no fallback. The contact
   create fails if this property does not exist (the notification still reaches you, marked
   "Resend contact: FAILED").
2. Audience > Segments > Create segment, name `daybrief-waitlist`. Open it and copy its ID (a UUID).
3. Sender: `flowity.ai` is already verified (the hub functions and Vela send from nina@flowity.ai).

### Secrets

| Secret | Value | Note |
| --- | --- | --- |
| `RESEND_API_KEY` | Resend API key with **full access** (contacts need it; a sending only key fails on step 1) | Already set in this project for the hub functions. Check that key is full access, otherwise create a new full access key and update it in the Dashboard |
| `RESEND_DAYBRIEF_SEGMENT_ID` | the segment ID from step 2 | Not sensitive. Without it contacts are saved without the segment (logged as a warning) |

```powershell
supabase secrets set RESEND_DAYBRIEF_SEGMENT_ID=<segment-uuid> --project-ref yrqbzaqbracrgaxzhyxr
```

### Deploy and test

```powershell
supabase functions deploy daybrief-waitlist --project-ref yrqbzaqbracrgaxzhyxr --no-verify-jwt
$FN = "https://yrqbzaqbracrgaxzhyxr.supabase.co/functions/v1"
Invoke-RestMethod -Method Post -Uri "$FN/daybrief-waitlist" -ContentType "application/json" -Body '{"email":"you+test@example.com","website":"example.com"}'
```

Expected `{ ok: true }`, the contact in the segment with `website`, the confirmation in that
inbox and the notification at nina@. The frontend needs no change after deploy (it already
calls `FN_BASE/daybrief-waitlist`). Tests: `npx -y deno test _shared/` covers validation,
the limiter, the Resend payload and the email copy.

## Known gaps

- Anyone holding a paid `session_id` can mint fresh 7 day links. Acceptable for digital
  downloads; bump the object version if links leak.
- The webhook dedupe cache is per warm instance; correctness relies on Kit calls being
  idempotent, which they are (upsert, set field, tag).
- No rate limiting beyond the honeypot field `company` and body size caps.
