# Studio Gen landing page: design system

The landing page shares the visual language of the **Studio Gen app** (`app/ui/styles.css`), so the site and
the product feel like one thing. Its structure follows a reference study of a "Marquee Hero" fintech
landing page (soft purple-to-white gradient, centred type, an app mock-up overlapping the fold, generous
radii). We adapted that study, not copied it: there are no third-party fonts, logos or tokens. Every
colour and typeface comes from the app.

## Tone

Clean, airy and confident. It's a calm creative tool, not a chat box. There's lots of white space, one
loud action per view (the download button) and real product output everywhere (screenshots, storyboard
frames, the video).

## Colour (from the app)

| Token | Hex | Use |
|---|---|---|
| `--ground` | `#f3f2fa` | page background (lavender white) |
| `--primary` | `#5a4fd6` | brand, links, primary CTA |
| `--primary-d` | `#3f35b0` | CTA gradient end, hover |
| `--primary-soft` | `#e9e7ff` | tints, pills, hero glow |
| `--ink` | `#1f1b24` | headings, body text, terminal surface |
| `--ink2` | `#5f5a66` | secondary text |
| `--muted` | `#77727e` | captions, labels |
| `--ok` / `--ok-dot` | `#14703f` / `#26d478` | "connected", "done", success |
| `--line` | `rgba(38,34,40,.08)` | hairlines and card borders |

Purple is dominant and green is the only second accent. Never put purple text on a purple fill below a
4.5:1 contrast ratio.

## Type (from the app, self-hosted, SIL OFL)

| Role | Family | Size | Weight | Line-height | Tracking |
|---|---|---|---|---|---|
| h1 | Bricolage Grotesque | clamp(46px, 6.8vw, 100px) | 700 | 1.0 | -0.045em |
| h2 | Bricolage Grotesque | clamp(34px, 4.4vw, 60px) | 650 | 1.05 | -0.035em |
| h3 | Bricolage Grotesque | 20px | 650 | 1.25 | -0.01em |
| body | Bricolage Grotesque (opsz 14) | 17px | 400 | 1.6 | 0 |
| accent words | Fraunces italic | inherits | 500 | inherits | -0.01em |
| labels / HUD | Geist Mono | 11-13px | 500 | 1.2 | 0.06em, uppercase |

Use one serif-italic accent word per headline at most (e.g. "*short*").

## Spacing, radius, container

- 4px base step. The scale is 12 · 16 · 24 · 32 · 48 · 56 · 72 · 108 · 120.
- Radii: 12 for small chips, 20 for cards, 28 for large panels, 999px for pills and buttons.
- Content max width is 1200px, with page gutters of clamp(20px, 4vw, 48px).

## Motion

- Easing `cubic-bezier(.22,1,.36,1)` (same as the app). Durations run 0.5-0.9s.
- On page load, the headline lights up word by word (karaoke captions, which is how the videos read),
  then the copy and CTA rise in a stagger.
- The hero mock-up starts tilted and flattens as you scroll. Floating chips bob slowly.
- The download button has a soft breathing glow, a shine sweep and a magnetic pull, and ice cracks
  spread across it on hover (a nod to the Winter Lake pack).
- Everything is disabled under `prefers-reduced-motion`.

## Components

Glass pill nav · centred marquee hero with app mock-up + phone video · ticker · 5-frame "how it works"
strip · storyboard wall · tabbed product screenshots · privacy list + dark terminal · quick-start steps
with copy buttons · FAQ accordions · deep-purple final CTA band · footer with the non-affiliation notice.
