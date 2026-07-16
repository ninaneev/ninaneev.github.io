# CLAUDE.md — design constraints for this site

These rules keep the site coherent. Follow them on every edit.

## Palette (hard constraint)

- Background: `#080810` only. Dark theme only — no light mode.
- Text: near-white `#EDEDF2`; muted `#9494A6`; faint `#6C6C7E`.
- ONE accent: purple `#9C83F7`. No cyan, no second accent, no gradients between hues. Subtle purple glows/hovers (low-alpha `rgba(156,131,247,…)`) are allowed.
- Hairlines: `rgba(237,237,242,0.09)`.
- All tokens live in `:root` in `styles.css` — change them there, never inline.

## Typography

- Display: Fraunces (italic is the accent gesture — used for hooks and system names).
- Body: Inter. Utility/labels: DM Mono (eyebrows, buttons, colophon).
- Loaded from Google Fonts — the only permitted external dependency.

## Structure

- Pure HTML + CSS. No frameworks, no build step, no JS unless genuinely unavoidable, no external CDNs beyond Google Fonts, no trackers.
- Single 620px column (`.wrap`), generous vertical rhythm, mono eyebrows + hairline rules between sections. No heavy-bordered cards; the featured Full Stack tile is the only bordered element.
- All pages share `styles.css` (systems/ pages reference `../styles.css`).
- Every missing link is `href="#"` with an adjacent `<!-- TODO: ... -->` comment — keep that convention until real links land.

## Voice

- First person, plain, confident, no hype adjectives. Flowity AI is a premium productized service, never "a SaaS".
- The three systems are free and open source (MIT); paid tiers are done-for-you (guided install €149 each, Full Stack Install €1,500).
- Never mention how the site was built or by what tool.

## Quality floor

- Mobile-first responsive (most traffic is from phones), visible `:focus-visible` states, `prefers-reduced-motion` respected.
