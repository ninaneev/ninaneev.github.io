# BRIDGE.md — project context

## What this is

Nina Cressoni's personal site, published at https://ninaneev.github.io via GitHub Pages (repo `ninaneev/ninaneev.github.io`, root of default branch). It is the public front door for: Flowity AI (discovery calls), her research on external AI memory systems, the three open-source systems she sells services around, and the Call It! newsletter. Primary traffic source is TikTok/Instagram bios, so the site is mobile-first and linktree-shaped: one strong column, everything reachable in one scroll.

## Design decisions (settled — don't relitigate casually)

- Dark editorial look: `#080810` background, single purple accent `#9C83F7` (Flowity brand purple; the brand's cyan was deliberately dropped here for a one-accent system).
- Fraunces (display, italic as the accent gesture) + Inter (body) + DM Mono (labels). Google Fonts is the only external dependency.
- Signature elements: one fixed radial purple glow anchoring the top of every page, and the "ledger" systems list (hairline rows, not cards). The featured Full Stack tile is the only bordered element on the site.
- Zero JavaScript. Pure static files, no build step.

## Business model shown on the site (updated mid-build, 2026-07-15)

- Continuum, Cortex, Council: free and open source (MIT), self-install from GitHub (`github.com/ninaneev/{continuum,cortex,council}`).
- Paid tiers are done-for-you: guided install €149 per system; flagship "The Full Stack Install" €1,500 (working session, all three installed, documents ingested into Cortex, memory seeded, decision templates fitted, 30 days async support), limited seats.
- Original plan ("purchasing opens soon" + €49 install add-on) was superseded during the build — do not reintroduce it.
- All purchase buttons are disabled placeholders until Stripe payment links exist.

## Conventions

- Every unresolved link: `href="#"` + `<!-- TODO: ... -->` comment next to it. Grep for `TODO:` to find all pending items.
- Design constraints for future edits live in CLAUDE.md; current state and next actions in STATUS.md.
