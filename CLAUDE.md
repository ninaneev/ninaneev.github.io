# CLAUDE.md — design constraints for this site

These rules keep the site coherent. Follow them on every edit.

## Palette (hard constraint)

- Background: `#080810` only. Dark theme only — no light mode.
- Text: near-white `#EDEDF2`; muted `#9494A6`; faint `#6C6C7E`.
- ONE accent: purple `#9C83F7`. No cyan, no second accent, no gradients between hues. Purple glows, text-shadows, and low-alpha `rgba(156,131,247,…)` washes ARE the aura — use them generously but only in that hue.
- Hairlines: `rgba(237,237,242,0.09)`.
- All tokens live in `:root` in `styles.css` — change them there, never inline.

## Typography

- Display: Fraunces (italic is the accent gesture — hooks, system names, giant hero lines).
- Body: Inter. Utility/labels: DM Mono (eyebrows, buttons, stage labels, colophon).
- Loaded from Google Fonts — the only permitted external dependency.
- Scale is deliberately oversized on desktop (hero up to ~8.75rem, system names up to ~3.6rem). Don't shrink it back to "safe".

## Layout

- Desktop and mobile are DIFFERENT designs, both first-class. Desktop: wide 1180px wrap, editorial two-column sections (sticky mono label left, content right), fixed blurred top nav, full-viewport hero, ascending ladder grid. Mobile: compact single column, labels stack above content, nav collapses to brand + call button.
- Signature element: "the loop" — five systems as stations on one glowing vertical spine (Compass listens, Canon knows, Continuum remembers, Council decides, Cadence executes). Protect it.
- Atmosphere: breathing hero orb (body::before) + film grain overlay (body::after). Keep both.
- Pure HTML + CSS. No JS. Scroll reveals use CSS scroll-driven animations behind `@supports (animation-timeline: view())`.
- All pages share `styles.css` (systems/ pages reference `../styles.css`).
- Every missing link is `href="#"` with an adjacent `<!-- TODO: ... -->` comment — keep that convention until real links land.

## Voice and copy

- First person, plain, confident, no hype adjectives. Flowity AI is a premium productized service, never "a SaaS".
- NO DASHES in visible copy: no em dashes, no hyphen-as-pause. Use periods, colons, commas, or the mono middot `·` in labels. Avoid hyphenated compounds where a clean alternative exists.
- The author is **Nina Niamh** everywhere on the site — the full name **Nina Niamh Cressoni** appears ONLY on `about.html` (page title, H1, paper citation there). Do not reintroduce the surname elsewhere.
- Photos live in `assets/` (nina-desk.jpg square, nina-smile.jpg vertical) and always sit inside a `.portrait-frame` (purple wash + glow) with a mono `.portrait-caption`. Never place a raw `<img>`.
- Guided install copy always states the call sets the system up "for your business or for your own improvement", with per system examples. The index has a What For section (`#uses`) with paired business/personal examples — keep both sides represented.
- Five systems, MIT, free: Compass (shipping soon), Canon (renamed from Cortex — never call it Cortex, that name belongs to Flowity), Continuum, Council (ten advisors; credit Edward de Bono / Six Thinking Hats / parallel thinking on the Council page), Cadence (shipping soon).
- The Ladder: free clone → €149 guided install per system → €1,500 Full Stack Install (one time, limited seats, Compass/Cadence added free when they ship) → Flowity AI retainer (by application, B2B SaaS ICPs only).
- Research links to the Zenodo preprint: https://zenodo.org/records/19120961 ("From Signals to Decisions: A Framework for Executive Signal Synthesis in AI Systems").
- Never mention how the site was built or by what tool.

## Quality floor

- Responsive at every width, visible `:focus-visible` states, `prefers-reduced-motion` respected (kills orb breathing, drip, and reveals).
- `systems/cortex.html` is a meta-refresh redirect to `canon.html` — keep it until inbound links die.
