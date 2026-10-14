# ninaneev.github.io

Nina Niamh's personal link-in-bio site: Daybrief, free resources, the weekly letter, the blog, and a link to Flowity AI.

## Stack

Static HTML and one shared `styles.css`. A small vanilla `app.js` (plus `config.js`) handles signup forms and the Daybrief checkout through Supabase Edge Functions in `supabase/functions/`. No build step. Google Fonts is the only external dependency.

## Pages

```
index.html             link hub
daybrief.html          Daybrief page (in testing, no price)
daybrief-thanks.html   post checkout page (checks the Stripe session)
free.html              free resources
newsletter.html        newsletter signup
blog/                  blog index and posts
about.html             about Nina
404.html               not found
```

## Run locally

```
python -m http.server 8093
# then open http://localhost:8093
```

## Deploy

GitHub Pages serves the root of `main` at https://ninaneev.github.io. Set `SALES_OPEN: true` in `config.js` to switch Daybrief from the launch list to checkout.
