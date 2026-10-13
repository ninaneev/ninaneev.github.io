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

- Hub (`index.html`): phone first at 390px. Arch portrait, name, role, one line, social icon row, then big tappable link cards (icon tile, title, one line, arrow circle). Daybrief is the featured card. Desktop: profile pinned left, cards right.
- Radius rule: cards 20px, icon tiles 14px, buttons, inputs and chips are pills.
- Atmosphere: breathing orb (`body::before`), film grain (`body::after`), `.lights` div with two drifting lilac lights. Keep all three. Reduced motion kills every animation.
- Icons are inline SVG, 24px viewBox, stroke 1.6, `class="ico"`. Every social link has an `aria-label`.
- Tap targets at least 44px. Visible `:focus-visible` everywhere.
- Every page has the same footer: socials, About, Work with Flowity (https://flowity.ai), nina@flowity.ai.

## JavaScript

- Allowed ONLY in `config.js` (`window.NINA = { FN_BASE, SALES_OPEN }`) and `app.js` (subscribe forms, Daybrief buy box, thanks page session check). Vanilla, no frameworks, no build step, no trackers.
- Forms: `<form data-source="...">` posts to `nina-subscribe`. Sources: newsletter, day-plan, automation-ebook, course, community, daybrief-waitlist. Gated forms say the person also gets the weekly letter.
- `SALES_OPEN: false` shows the Daybrief launch list; `true` shows the checkout button (`daybrief-checkout`, then redirect to Stripe).
- Pages must still read fine without JS (noscript note on forms).

## Offers (current)

1. Daybrief · €347 one time (`daybrief.html`, thanks page `daybrief-thanks.html`)
2. Free resources (`free.html`): 10 Minute Day Plan and the automation ebook (email gated, files in `free/files/`), Flowity public read and sample (external)
3. Newsletter (`newsletter.html`, Kit)
4. Work with Flowity (https://flowity.ai). Flowity is a premium productized service, never "a SaaS".
5. Blog (`blog/`, posts use `.post` / `.post-body`)
6. Course, coming soon (waitlist on `community.html#course`)
7. The circle (`community.html`)

The old five systems, guided installs, Full Stack Install, the loop and the ladder are retired. Never mention them.

## Voice and copy

- First person, plain, warm, confident, no hype adjectives. English.
- NO DASHES in visible copy: no em or en dashes, no hyphen as a pause, avoid hyphenated compounds. Use periods, commas, colons, or the middot `·`.
- The name is **Nina Niamh** everywhere. **Nina Niamh Cressoni** appears ONLY on `about.html`.
- About keeps her story and the Zenodo preprint: https://zenodo.org/records/19120961.
- Never mention how the site was built or by what tool.
