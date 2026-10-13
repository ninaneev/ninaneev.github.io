# Backend: Supabase Edge Functions

Three Deno functions live in `supabase/functions/` and deploy to the **Flowity** Supabase project
(`yrqbzaqbracrgaxzhyxr`). Names are prefixed (`nina-`, `daybrief-`) and do not clash with any
existing Flowity function (checked against flowity-executive-hub/supabase/functions on 2026-10-13).

| Function | Method | Purpose |
| --- | --- | --- |
| `nina-subscribe` | POST `{email, first_name?, source, company?}` | Kit upsert + tags `newsletter` and `src-<source>`; returns `download_url` for `day-plan` / `automation-ebook` |
| `daybrief-checkout` | POST `{email?}` | Stripe Checkout Session for the `daybrief_eur_347` price; 403 `not_on_sale` unless `SALES_OPEN=true` |
| `daybrief-session` | GET `?session_id=cs_...` | `{paid, email?, download_url?}`; on paid signs a 7 day URL for `daybrief/daybrief-v1.zip` and tags the buyer `daybrief-buyer` in Kit |

Errors are always `{ "ok": false, "error": "<code>" }` with no upstream details. CORS allows
`https://ninaneev.github.io` and `http://localhost:*` / `http://127.0.0.1:*` only.

## 1. Secrets (Nina sets these herself)

Never paste values into chat or commit them. From the repo root:

```bash
supabase secrets set KIT_API_KEY=... STRIPE_SECRET_KEY=... SALES_OPEN=false --project-ref yrqbzaqbracrgaxzhyxr
# optional, enables double opt-in (see section 5):
supabase secrets set KIT_FORM_ID=... --project-ref yrqbzaqbracrgaxzhyxr
```

- `KIT_API_KEY`: Kit > Settings > Developer > **v4** API key (not the v3 key/secret).
- `STRIPE_SECRET_KEY`: prefer a **restricted key** (`rk_...`) with write on Checkout Sessions and
  read on Prices. Use the test mode / sandbox key first.
- `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected automatically by the edge runtime.

Caution: secrets are project wide. `STRIPE_SECRET_KEY` may already exist for Flowity's own
functions (`create-checkout-session`, `stripe-webhook`). Check first with
`supabase secrets list --project-ref yrqbzaqbracrgaxzhyxr` (shows names and digests only). If it
exists and is Flowity's key, Daybrief will sell through Flowity's Stripe account. That works
(sessions are filtered by `metadata.product=daybrief`), but if Daybrief should go to a different
account, rename the variable in `supabase/functions/_shared/stripe.ts` (e.g. `DAYBRIEF_STRIPE_KEY`)
before setting it, so Flowity's checkout is not overwritten.

## 2. Stripe product

In the Stripe Dashboard (test mode first): create product "Daybrief", one-time price EUR 347.00,
**lookup key `daybrief_eur_347`**. Repeat in live mode before launch. Notes:

- `automatic_tax` is **off**. Price is charged as is; VAT handling (OSS registration, tax inclusive
  pricing) is Nina's call before go-live. Turn it on only after a Stripe Tax registration exists.
- `consent_collection.terms_of_service` is **not used**: it requires an account level Terms of
  Service URL in Dashboard > Settings > Public details. The EU 14 day withdrawal waiver text is
  shown via `custom_text.submit` instead. If a ToS URL gets set later, consider switching to the
  required checkbox for a stronger consent record.
- `invoice_creation` is on (buyer gets an invoice PDF), promotion codes allowed.

## 3. Storage bucket

Dashboard > Storage > New bucket: name `daybrief`, **Private** (public off). Upload
`daybrief-v1.zip` at the bucket root. No RLS policies needed: only the service role signs URLs.
If the object is missing, `daybrief-session` still returns `paid: true`, just without a link.

## 4. Deploy (from the repo root)

```bash
supabase functions deploy nina-subscribe   --project-ref yrqbzaqbracrgaxzhyxr --no-verify-jwt
supabase functions deploy daybrief-checkout --project-ref yrqbzaqbracrgaxzhyxr --no-verify-jwt
supabase functions deploy daybrief-session  --project-ref yrqbzaqbracrgaxzhyxr --no-verify-jwt
```

`--no-verify-jwt` is required: the static site calls these without a Supabase key.

Local checks (Deno via npx works if deno is not installed):

```bash
cd supabase/functions
npx -y deno check nina-subscribe/index.ts daybrief-checkout/index.ts daybrief-session/index.ts
npx -y deno test _shared/
```

## 5. Kit and double opt-in

`POST /v4/subscribers` creates subscribers as **active** by default, which skips Kit's
confirmation email (single opt-in). For EU audiences double opt-in is the safer consent record.
To enable it: create a Kit form with "Send incentive email" / double opt-in on, and set
`KIT_FORM_ID`. The function then creates the subscriber as `inactive` and adds them to that form,
so Kit sends the confirmation; they become active when they click. Tags are applied either way.
The free PDF download link is returned immediately regardless (not gated on confirmation).

Existing subscribers who unsubscribed stay unsubscribed (Kit's upsert does not change state).
Buyers tagged `daybrief-buyer` are created as active subscribers in Kit; exclude that tag from
newsletter broadcasts unless they also have `newsletter`.

## 6. Flip sales open (launch, 16 Nov 2026)

1. Live mode price with lookup key `daybrief_eur_347` exists; live key set as `STRIPE_SECRET_KEY`.
2. `supabase secrets set SALES_OPEN=true --project-ref yrqbzaqbracrgaxzhyxr` (takes effect on the
   next cold start; redeploying `daybrief-checkout` forces it).
3. Set `SALES_OPEN: true` in `config.js` at the repo root and publish the site.

To close again, set both back to `false`.

## 7. Test with Stripe test mode

1. Set test key + `SALES_OPEN=true` (test only), deploy.
2. Open the Daybrief page locally or on the site, click buy. Pay with card `4242 4242 4242 4242`,
   any future expiry, any CVC, any postcode.
3. Stripe redirects to `daybrief-thanks.html?session_id=cs_test_...`; the page calls
   `daybrief-session` and should show the download. Check Kit for the `daybrief-buyer` tag.
4. Declines: `4000 0000 0000 0002`. 3DS: `4000 0027 6000 3184`.

Quick curl checks:

```bash
FN=https://yrqbzaqbracrgaxzhyxr.supabase.co/functions/v1
curl -s -X POST $FN/nina-subscribe -H "Origin: http://localhost:8000" -H "Content-Type: application/json" \
  -d '{"email":"you+test@example.com","source":"day-plan"}'
curl -s -X POST $FN/daybrief-checkout -H "Content-Type: application/json" -d '{}'
curl -s "$FN/daybrief-session?session_id=cs_test_..."
```

## Known gaps

- **No webhook yet.** Fulfilment (signed link + Kit tag) happens when the thanks page loads. A
  buyer who closes the tab before the redirect paid but has no link until they contact Nina.
  Recommended next step: a `daybrief-webhook` function on `checkout.session.completed` and
  `checkout.session.async_payment_succeeded` (gated on `payment_status === "paid"`) that tags the
  buyer in Kit, with a Kit automation on `daybrief-buyer` emailing the download page.
- Anyone holding a paid `session_id` can mint fresh 7 day links. Acceptable for a €347 digital
  download; rotate the object name (`daybrief-v2.zip`) if links leak.
- No rate limiting beyond the honeypot field `company` and body size caps.
