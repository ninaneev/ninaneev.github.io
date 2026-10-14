# STATUS.md

## 2026-10-13 (night) · ebooks pass (branch feature/link-in-bio, uncommitted)

- New pages: `ai-edge.html` (€27) and `package-it.html` (€7) in the Daybrief design language: hero with CSS cover on a tilt stage, buy box gated by `EBOOKS_OPEN` (false = "Opens soon · get notified", source ebooks-waitlist; true = POST nina-checkout {product}), what's inside cards, FAQ, closing buy box, phone buy bar. Package It shows the 7 days and ends with the free course waitlist (source course, opens 5 February 2027).
- Shared `thanks.html` reads `nina-session` and shows the product name, download and a product note. `daybrief-thanks.html` unchanged and still on `daybrief-session`.
- `config.js` gains `EBOOKS_OPEN: false`. app.js: gated buy boxes, product checkout, endpoint aware thanks, missing cover PNG fallback.
- Free page: four gated cards (day plan + three ebooks: automation, unlocking-ebook, sentiment-ebook) and a "Go deeper" section. Hub: one "Ebooks" card (from €7) after Free resources.
- Verified via file:// with mocked endpoints at 390 and 1440: no horizontal scroll, equal heights, forms post source + referrer, checkout flows land on thanks, both thanks pages render paid.
- Open: cover PNGs in `assets/covers/` (10-minute-day-plan, do-you-need-automation, unlocking-business-potential, sentiment-synthesis, ai-edge, package-it) and the two new PDFs do not exist yet; copy for the two new free ebooks and the Package It day titles is my draft, Nina to check.

## 2026-10-13 (later) · BRIEF2 frontend pass (branch feature/link-in-bio, uncommitted)

- Daybrief now sells THREE editions in one purchase. `daybrief.html` rebuilt: hero with a morning brief that types itself, CSS only edition picker (Make recommended, Claude, n8n) with per edition runs / setup time / requirements / best for / privacy, per edition privacy panels ("email text goes to"), FAQ rewritten (setup times per edition, "does it run with my computer off"), phone sticky buy bar. Setup call bonus removed everywhere (page, FAQ, thanks page). "About 60 minutes" replaced by 20 to 30 / 30 to 45 / 45 to 90.
- Hub: course and circle cards removed; newsletter card titled `<span data-nl-name>The Letter</span>` with "A weekly newsletter"; "Work with Flowity" is now "Flowity" / "See clearly." (card and every footer).
- `community.html` kept but hidden: `noindex`, no links to it anywhere.
- Free page: CSS book covers for both guides (dark Day Plan, mint to periwinkle automation ebook) that float and tilt; Flowity resources in their own section.
- Newsletter page: name + "A weekly newsletter", letter card with stamp, three topic cards, "write to me" note.
- Blog: post card + "next post is on my desk" card that points to the newsletter; post gets a scroll progress bar, drop cap and an end of post signup.
- About: "What I do now" became three linked cards. Thanks page: lilac confetti on paid, three next steps, no setup call.
- Sitewide: equal height card grids with bottom pinned footers, `data-reveal` scroll reveals, lilac confetti on subscribe success, `referrer` (page path) sent in every subscribe POST, every mailto has a "[Site · Page] ..." subject.
- Verified with Playwright at 390 and 1440 (screens in the session scratchpad `shots2/`): no horizontal scroll, no console errors, equal heights and footer alignment measured, reduced motion shows everything static.
- Open: newsletter name still the placeholder "The Letter"; Make free plan operation count for one brief a day not verified (copy says the free plan covers it); `nina-subscribe` ignores the new `referrer` field until the backend stores it; demo video slot still a TODO; BRIDGE.md still describes the old systems.

## 2026-10-13 · link-in-bio rebuild (branch feature/link-in-bio, uncommitted frontend work)

- Full frontend redesign: one lilac accent (#9C83F7) on soft black/white, lime and all second accents deleted. Orb + grain kept, new `.lights` layer.
- `index.html` is now the link hub: arch portrait, socials (TikTok @nina.neev, LinkedIn, Instagram, GitHub), 7 icon link cards (Daybrief featured €347, Free, Newsletter, Flowity, Blog, Course coming soon, The circle) + inline newsletter signup.
- New pages: `daybrief.html`, `daybrief-thanks.html`, `free.html`, `newsletter.html`, `community.html` (#circle, #course), `blog/index.html`, `blog/hello.html` (DRAFT, Nina to review).
- `config.js` + `app.js` added (forms, Daybrief buy box, thanks session check). `SALES_OPEN: false` until launch.
- `about.html` rewritten without the five systems; 404 restyled; `systems/` deleted. Old Cal.com embed removed from the hub.
- Open: demo video slot on daybrief.html (TODO comment), CV pdf dropped from about, BRIDGE.md still describes the old systems, blog post copy needs Nina's review. Verified at 390 and 1440 wide with mocked endpoints.


## State: v2 redesign on branch — 2026-07-16

Branch `feature/aura-redesign` (commits 5c9d3ea + ce1baf6), NOT yet merged/pushed. main still has v1 live on GitHub Pages.

What v2 is:

- Full redesign: desktop = wide 1180px editorial layout (fixed blurred nav, full-viewport hero, sticky section labels, breathing orb + film grain aura); mobile = compact single column. CSS-only scroll reveals (`animation-timeline: view()` behind `@supports`). Verified in Chromium at 1440px and 390px.
- Author renamed sitewide to **Nina Niamh Cressoni**.
- **Cortex → Canon** (`systems/canon.html`; `cortex.html` is now a meta-refresh redirect). Site links to github.com/ninaneev/canon — repo must be renamed on GitHub.
- Five-system loop ("the loop" spine): Compass (listens, shipping soon) → Canon (knows) → Continuum (remembers) → Council (decides) → Cadence (executes, shipping soon). New pages `systems/compass.html`, `systems/cadence.html`.
- Council page: ten-seat bench, credits Edward de Bono (Six Thinking Hats, 1985, parallel thinking).
- New Ladder section: free clone → €149 guided install → €1,500 Full Stack Install (one time; Compass/Cadence added free when they ship) → Flowity AI retainer (by application, B2B SaaS ICPs only).
- Research section links the Zenodo preprint: https://zenodo.org/records/19120961 ("From Signals to Decisions", March 2026).
- Copy rule: no dashes anywhere in visible text (see CLAUDE.md).

## Update 2026-07-16 (later session, same branch)

- `about.html` added: full name **Nina Niamh Cressoni** lives ONLY here; everywhere else the site says **Nina Niamh**. Photos in `assets/` (nina-desk.jpg, nina-smile.jpg) shown in hero, about teaser, and about page.
- Index hero = text + portrait grid; new `#uses` section (business + personal examples); every guided install says "for your business or for your own improvement" with examples.
- **Compass and Cadence repos are BUILT** (v1 committed on main in `../compass` and `../cadence`, Loomfield worked examples consistent with Council's). Site pages flipped from "shipping soon" to live: free install + guided €149 sections; Full Stack now sells all five systems.

## Next

1. Nina reviews branch in browser → merge `feature/aura-redesign` to main → Pages redeploys.
2. Create GitHub repos `ninaneev/compass` + `ninaneev/cadence` and push (local repos ready, single commit on main each).
3. Rename GitHub repo `ninaneev/cortex` → `ninaneev/canon` (Settings → Rename; old URL redirects). Push local canon branch `feature/rename-to-canon`. Local folder still named `cortex` — rename to `canon` after closing whatever locks it.
4. Push council branch `feature/ten-advisor-bench`.
5. Stripe: user must authenticate the claude.ai Stripe connector (`/mcp`) → then create 2 payment links (guided install €149, Full Stack €1,500) and wire all buttons (remove `disabled` + `aria-disabled`).
6. Still-open TODOs from v1: social handles + email, Beehiiv link, demo videos.

---

## Session handoff 2026-07-15 (v1)

- Done: repo scaffolded, committed (50ddbc0), published public to https://github.com/ninaneev/ninaneev.github.io (MIT where applicable)
- Site LIVE at https://ninaneev.github.io/ (GitHub Pages auto-build from main, verified 200 on all pages)
