# sspart-website

Company site for SSPART Enterprise Private Limited (sspart-enterprise.com), served by GitHub Pages. Plain HTML and CSS, no build. Enquiries are stored in Supabase.

## Run locally

```bash
python -m http.server 8080   # then open http://localhost:8080
```

## Tests

Browser tests live in `tests/` (Playwright, five screen sizes, Chromium and WebKit, plus speed and slow-network budgets).
See `tests/README.md`; in short: `cd tests && npm install && npm run setup && npm test`.

## Files

- `index.html` — the home page: products (Atlas, DheQuest, Neel, Experts Jar), clients, story, contact
- `css/styles.css` — all styles; colours are the tokens at the top
- `privacy.html`, `terms.html`, `cookies.html` — legal pages
- `atlas.html` — the Atlas detail page behind "Know more": plans, market comparison, pricing. The home page carries the summary; `js/console.js` drives the home page console, `js/atlas.js` and `js/board.js` the Atlas page
- `contact.html` — enquiry form; visitors need no account
- `admin.html`, `js/admin.js`, `css/desk.css` — private enquiry desk (sign-in, mobile search, status, comments)
- `js/config.js` — Supabase URL and publishable key; `js/vendor/supabase.js` is supabase-js 2.118.0

## Enquiry desk setup

1. Create a Supabase project and run `supabase/schema.sql` in its SQL editor. The steps at the top of that file cover turning off sign-ups, adding the owner and making them an admin.
2. Put the project URL and publishable (anon) key in `js/config.js`. Never use the service-role key here.
3. On a free Supabase plan, add repository variables `SUPABASE_URL` and `SUPABASE_ANON_KEY` so `.github/workflows/supabase-keepalive.yml` can stop the project pausing.

`cd tests && npm run test:schema` proves the access rules on a throwaway Postgres, with no Supabase project needed.

## Placeholders

Anything waiting on real content carries `data-placeholder="..."` and shows a dashed outline with a tag.
The product windows show real screenshots from `resources/screens/` (Experts Jar is still an HTML mock-up, as it has
no screenshots yet).
Neel screens were captured from its console running locally with the seeded demo data (`admin@neel.test`).

## Sample data (replace before going live)

Invented numbers, case-study details and testimonials carry `data-sample` (no visual marker). Search for
`data-sample` and confirm or replace each one, and get each client's sign-off on any quote or logo shown.

## Illustrations

`resources/people/` holds the characters, generated once with DiceBear 9.2.2 and committed as plain SVGs (no runtime dependency):

- People: "Notionists" by Zoish, CC0 1.0.
- Robots (`agent-*.svg`): "Bottts" by Pablo Stanley, free for personal and commercial use.

## Fonts

`resources/fonts/` holds Overpass (variable, Latin) and Caveat (Latin subset), both woff2, served from this site instead of Google Fonts
so text shows without extra third-party round trips. All three are under the SIL Open Font License 1.1.
