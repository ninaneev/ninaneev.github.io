# STATUS.md

## State: v1 live-ready — 2026-07-15

All pages written and internally linked. No git history yet (files only — repo not initialized/pushed). Ready to `git init`, commit, and push to `ninaneev/ninaneev.github.io` for GitHub Pages.

Pages:

- `index.html` — hero, about, Flowity AI (cal.com CTA live), research, systems ledger (3 open-source tiles + featured Full Stack tile), Call It! newsletter, social footer
- `systems/continuum.html` — free/OSS + guided install €149
- `systems/cortex.html` — free/OSS + guided install €149
- `systems/council.html` — free/OSS + guided install €149
- `systems/full-stack.html` — flagship €1,500, limited seats, "book a call first" → cal.com live
- `404.html`, `styles.css`, README, CLAUDE.md, BRIDGE.md, .gitignore

## Next (all marked with `<!-- TODO: ... -->` in the HTML)

1. Real social links: TikTok, Instagram, X, LinkedIn, YouTube handles + real email in mailto (footer of `index.html`)
2. Research paper link (`index.html` research section)
3. Beehiiv subscribe link for Call It! (`index.html` newsletter section)
4. Stripe payment links: 3× guided install €149 (`systems/*.html`) + Full Stack €1,500 (`systems/full-stack.html`) — then remove `disabled` class and `aria-disabled`
5. Demo videos: replace `.video-placeholder` blocks on all four system pages
6. Publish the three GitHub repos (continuum, cortex, council) the install sections link to

---

## Session handoff 2026-07-15

- Done: repo scaffolded, committed (50ddbc0), published public to https://github.com/ninaneev/ninaneev.github.io (MIT where applicable)
- Site LIVE at https://ninaneev.github.io/ (GitHub Pages auto-build from main, verified 200 on all pages)
- Known broken: nothing known; no verification run in a clean session yet
- Next session: Fill the TODO links in index.html + systems/*.html (social handles, research paper, Beehiiv), then create Stripe payment links (€149 guided installs + €1,500 Full Stack) and wire them in.
