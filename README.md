# sspart-website

Company site for SSPART Enterprise Private Limited (sspart-enterprise.com), served by GitHub Pages. Plain HTML and CSS, no build.

## Run locally

```bash
python -m http.server 8080   # then open http://localhost:8080
```

## Files

- `index.html` — the home page: products (Atlas, DheQuest, Neel, Experts Jar), clients, story, contact
- `css/styles.css` — all styles; colours are the tokens at the top
- `privacy.html`, `terms.html`, `cookies.html` — legal pages

## Placeholders

Anything waiting on real content carries `data-placeholder="..."` and shows a dashed outline with a tag.
The product windows show real screenshots from `resources/screens/` (Experts Jar is still an HTML mock-up, as it has
no screenshots yet). The hero showcase clones each product's window, so editing it once updates both.
Neel screens were captured from its console running locally with the seeded demo data (`admin@neel.test`).

## Sample data (replace before going live)

Invented numbers, case-study details and testimonials carry `data-sample` (no visual marker). Search for
`data-sample` and confirm or replace each one, and get each client's sign-off on any quote or logo shown.

## Illustrations

`resources/people/` holds the characters, generated once with DiceBear 9.2.2 and committed as plain SVGs (no runtime dependency):

- People: "Notionists" by Zoish, CC0 1.0.
- Robots (`agent-*.svg`): "Bottts" by Pablo Stanley, free for personal and commercial use.

## Fonts

`resources/fonts/` holds Geist, Geist Mono and Caveat (Latin subsets, woff2), served from this site instead of Google Fonts
so text shows without extra third-party round trips. All three are under the SIL Open Font License 1.1.
