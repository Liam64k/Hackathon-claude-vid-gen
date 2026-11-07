# Studio Gen landing page

A static, dependency-free landing page for Studio Gen: plain HTML, CSS and a small script.
It has no build step and no framework.

```
site/
  index.html        the page (SEO meta, Open Graph, JSON-LD)
  styles.css        the app's design system (see DESIGN.md), motion, responsive rules
  DESIGN.md         colour, type, spacing and motion rules for the site
  main.js           scroll reveals, tabs, copy buttons, magnetic CTA, video timecode
  404.html          styled not-found page
  favicon.svg, robots.txt
  vercel.json       clean URLs, security headers (CSP), asset caching
  assets/           hero clip (14 s, 1 MB), poster, storyboard frames, app screenshots, og.jpg
  og-card.html      source for assets/og.jpg (not deployed)
  serve.mjs         local preview server (not deployed)
```

## Preview locally

```bash
node site/serve.mjs        # http://127.0.0.1:4600/
```

## Deploy on Vercel

1. In Vercel, choose **Add New → Project** and import `Liam64k/Hackathon-claude-vid-gen`.
2. Set **Root Directory** to `site`, **Framework Preset** to "Other", and leave the Build Command and
   Output Directory empty.
3. Deploy. Every push to `main` redeploys the site, and the app code outside `site/` is ignored.

After you get a domain, add `<link rel="canonical" href="https://your-domain/">` to `index.html` and a
`Sitemap:` line to `robots.txt`.

## Notes

- The social-card image (`og:image`) is loaded from the public GitHub repo
  (`raw.githubusercontent.com/.../main/site/assets/og.jpg`), so it works before a custom domain exists.
  Once the repo is public, check it with any Open Graph previewer.
- Fonts are self-hosted in `assets/fonts/` (Bricolage Grotesque, Fraunces italic, Geist Mono: the app's own fonts, SIL OFL).
  The page makes no third-party requests, so the CSP in `vercel.json` allows only `'self'`.
- Regenerate the social card after design changes by opening `og-card.html` at 1200×630 in a headless
  browser and saving the screenshot as `assets/og.jpg`.
- Every claim on the page comes from a real measured run (`episodes/how-to-help-a-friend-…`). Keep it
  that way when you edit the copy.
