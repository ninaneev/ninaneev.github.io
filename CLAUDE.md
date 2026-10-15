# CLAUDE.md · design rules for this site

Nina's personal link-in-bio site (TikTok and LinkedIn bio link). It sells Nina, not Flowity. Follow these rules on every edit.

## Palette (hard constraint)

- ONE accent: lilac `#9C83F7`. Used for buttons, links, icons, chips, the arch portrait ring, and the background lights. Text on lilac is `#111114`.
- Everything else is soft black and soft white, never pure `#000` or `#fff`: bg `#111114`, surface `#18181C`, surface 2 `#1E1E23`, line `rgba(236,234,230,.10)`, text `#ECEAE6`, muted `#A3A1A8`, faint `#6E6C74` (decorative and placeholders only, it fails AA for text).
- No cyan, no lime, no second accent, no gradients between hues. Warmth comes only from her photos.
- Dark only. All tokens live in `:root` in `styles.css`.

## Type

- Fraunces (display, headings, blog body), Inter (UI and body), DM Mono (small labels, chips, dates). Google Fonts is the only external dependency.

## Layout and components

- Hub (`index.html`): phone first at 390px. Arch portrait, name, role, one line, social icon row, then big tappable link cards (icon tile, title, one line, arrow circle). Daybrief is the featured card. Desktop: profile pinned left, cards right. Cards in order: Daybrief, Free resources, Ebooks (one calm card to `free.html#ebooks`, chip "from €7"), the newsletter (title = its name, line "A weekly newsletter"), Flowity (line "See clearly."), Blog.
- Card grids (every page): all cards in a row are equal height and their button or footer line sits at the bottom (flex column, footer `margin-top: auto`). Use `.cards`/`.card` + `.card-foot`, `.resources`/`.resource` + `.resource-foot`, `.split`/`.panel` + `.foot`, `.steps`. Never let a button float right after short text.
- Radius rule: cards 20px, icon tiles 14px, buttons, inputs and chips are pills.
- Atmosphere: breathing orb (`body::before`), film grain (`body::after`), `.lights` div with two drifting lilac lights. Keep all three. Reduced motion kills every animation.
- Icons are inline SVG, 24px viewBox, stroke 1.6, `class="ico"`. Every social link has an `aria-label`.
- Tap targets at least 44px. Visible `:focus-visible` everywhere.
- Every page has the same footer: socials, About, Flowity (https://flowity.ai), nina@flowity.ai.
- Every `mailto:` carries a subject naming its source: `mailto:nina@flowity.ai?subject=%5BSite%20%C2%B7%20<Page>%5D%20<Topic>` (renders as "[Site · Daybrief] Question"). Footers use "[Site · <Page>] Hello".
- Newsletter name is not chosen yet. Every place it appears is `<span data-nl-name>The Letter</span>` so it can be renamed in one pass.

## Motion

- CSS first, small vanilla JS in `app.js`. Every animation has a reason (feedback, state change, one celebratory moment). Custom curves `--ease-out` and `--ease-in-out` in `:root`.
- Hub and inner page heroes use the `.rise` load stagger (`--i`). Below the fold, `data-reveal` (single element) and `data-reveal-group` (stagger its children) are armed by `app.js` only when they start off screen, so nothing visible ever blinks.
- Daybrief: the hero brief types itself once (`data-brief`, `data-type` lines with a ghost copy so nothing shifts), the edition picker is CSS only (radio inputs + sliding thumb, works without JS). The ebook pages have a phone only buy bar (`data-buybar`) that appears after the hero buy box scrolls away; Daybrief has none while in testing.
- Free page: CSS book covers (`.cover-plan`, `.cover-auto`) float gently and tilt toward the pointer on desktop (`data-tilt`).
- Subscribe success and the paid thanks state fire a short lilac confetti burst. Blog posts have a CSS scroll progress bar and a lilac drop cap.
- Hover motion is gated behind `(hover: hover) and (pointer: fine)`. Reduced motion: no animation at all, the brief shows fully written, confetti and tilt are skipped.

## JavaScript

- Allowed ONLY in `config.js` (`window.NINA = { FN_BASE, SALES_OPEN, EBOOKS_OPEN }`) and `app.js` (subscribe forms, Daybrief buy box and buy bar, thanks page session check, plus the motion helpers above). Vanilla, no frameworks, no build step, no trackers.
- Forms: `<form data-source="...">` posts to `nina-subscribe` with `{ email, first_name?, source, referrer }` (referrer = page path). Live sources: newsletter, day-plan, automation-ebook, unlocking-ebook, sentiment-ebook, ebooks-waitlist. daybrief-waitlist is still accepted by the backend but no page uses it while Daybrief is in testing. Gated forms say the person also gets the newsletter.
- Buy boxes: `[data-buy]` with `data-gate` naming the flag (`SALES_OPEN` for Daybrief, the default; `EBOOKS_OPEN` for the ebooks). False shows the waitlist form, true shows the checkout button. `data-checkout` with no value posts to `daybrief-checkout`; `data-checkout="ai-edge"` or `"package-it"` posts `{product}` to `nina-checkout`. Both redirect to the returned Stripe url.
- Thanks pages: `daybrief-thanks.html` uses `daybrief-session`; the shared `thanks.html` (`data-endpoint="nina-session"`) fills `[data-product]` with the product name and shows the matching `[data-product-extra]` note.
- Covers: `.cover > img` points at `assets/covers/<slug>.png`; if the PNG is missing, app.js removes it and the CSS cover underneath shows.
- Pages must still read fine without JS (noscript note on forms).

## Offers (current)

1. Daybrief · IN TESTING, no price shown (`daybrief.html`, thanks page `daybrief-thanks.html`, noindex). Decided 2026-10-14: Daybrief will be OPEN SOURCE and free (repo https://github.com/ninaneev/daybrief, not public yet; plan in the Daybrief repo `docs/OPEN-SOURCE-PLAN.md`), the lead magnet for the Decision Lab at https://flowity.ai/lab. The €347 paid version is PARKED, not deleted: it lives in HTML comments marked `PAID-347` on `daybrief.html` and `index.html`. Never delete those blocks. Only when Nina says to launch it: uncomment every PAID-347 block, remove the open source lines and waitlist forms, set `SALES_OPEN` true in config.js and in the Supabase secret. The page says "Daybrief will be open source and free. The waitlist gets the link first." When the repo is public, replace the waitlist forms with the repo link and email the waitlist first. Nina uses it herself first; the hub chip says "In testing" and the page has two "Tell me when it's ready" forms (`form[data-waitlist]`: email, optional website, honeypot `company`) posting to the `daybrief-waitlist` function (Resend, not Kit), with a mailto ([Site · Daybrief]) fallback shown on failure and in noscript, instead of a buy box or buy bar. Keep `SALES_OPEN=false`. Three editions: Make (recommended, runs in Make cloud every morning, setup about 30 to 45 min), Claude (Claude Code, runs when you type /daybrief, Claude Pro, about 20 to 30 min), n8n (n8n Cloud or self hosted, about 45 to 90 min). Privacy per edition: Claude stays within their Claude account; Make and n8n send email text to the AI provider they choose (Ollama on self hosted n8n keeps it local). There is NO setup call bonus.
2. Free resources (`free.html`): 10 Minute Day Plan plus three free ebooks (Do You Need Automation, Unlocking Business Potential, Sentiment Synthesis), email gated, files in `free/files/`; a "Go deeper" section (`#ebooks`) for the paid ebooks; Flowity public read and sample (external)
2b. Paid ebooks: `ai-edge.html` (The AI Edge, €27: ebook, workbook, 25 prompts, Notion Signal Log) and `package-it.html` (Package It, €7: 7 day plan, worksheets, pricing calculator, offer page template, 15 Claude prompts, checklist)
3. Newsletter (`newsletter.html`, Resend: `nina-subscribe` adds every signup to the Resend newsletter segment, secret `RESEND_NEWSLETTER_SEGMENT_ID`; Kit dropped 2026-10-15), name placeholder `data-nl-name`
4. Flowity (https://flowity.ai), tagline "See clearly." Flowity is a premium productized service, never "a SaaS".
5. Blog (`blog/`, posts use `.post` / `.post-body`)

Removed 2026-10-14: the circle (community) and the course, including `community.html` and both waitlists. Never mention them on the site.

The old five systems, guided installs, Full Stack Install, the loop and the ladder are retired. Never mention them.

## Voice and copy

- First person, plain, warm, confident, no hype adjectives. English.
- NO DASHES in visible copy: no em or en dashes, no hyphen as a pause, avoid hyphenated compounds. Use periods, commas, colons, or the middot `·`.
- The name is **Nina Niamh** everywhere. **Nina Niamh Cressoni** appears ONLY on `about.html`.
- About keeps her story and the Zenodo preprint: https://zenodo.org/records/19120961.
- Never mention how the site was built or by what tool.
