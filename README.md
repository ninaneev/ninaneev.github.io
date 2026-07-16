# ninaneev.github.io

Personal site for Nina Cressoni — AI engineer, founder of Flowity AI, researcher on external AI memory systems. Serves as a single-column landing page plus product pages for the three open-source systems (Continuum, Cortex, Council) and the flagship Full Stack Install.

## Stack

Pure static HTML + CSS. No frameworks, no build step, no JavaScript, no trackers. The only external dependency is Google Fonts (Fraunces, Inter, DM Mono).

## Structure

```
index.html              landing page (hero, about, Flowity, research, systems, newsletter, footer)
styles.css              shared stylesheet for every page
404.html                not-found page (GitHub Pages picks this up automatically)
systems/
  continuum.html        persistent memory for Claude Code
  cortex.html           local document brain, answers with receipts
  council.html          decision engine, five adversarial advisors
  full-stack.html       flagship: all three installed and tuned (€1,500)
```

## Run locally

No build step — open `index.html` in a browser, or serve the folder so relative paths behave exactly as they will in production:

```
python -m http.server 8000
# then visit http://localhost:8000
```

## Deployment

Published via GitHub Pages from the repository `ninaneev/ninaneev.github.io`. Because the repo is named `<username>.github.io`, Pages serves the root of the default branch at https://ninaneev.github.io — push to the default branch and it's live within a minute or two. `404.html` at the root is served automatically for unknown paths.

## Pending (see STATUS.md)

Social handles, research paper link, Beehiiv newsletter link, Stripe payment links, and demo videos are placeholders marked with `<!-- TODO: ... -->` comments in the HTML.
