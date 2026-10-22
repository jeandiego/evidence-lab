---
name: "Synko Lab"
description: "Synko's public engineering lab: numbered issues to read, each tied to runnable code, methodology and raw data."
colors:
  ink: "#141518"
  paper: "#f3f0e9"
  stone: "#d8d2c5"
  neutral-500: "#86847d"
  neutral-600: "#66655f"
  ink-soft: "#2f3034"
  navy: "#15243d"
  navy-200: "#aab3c2"
  accent: "#b5653a"
  error: "#a3311f"
  code-well: "#141518"
  code-bar: "#1b1c20"
  night-paper: "#141518"
  night-ink: "#f3f0e9"
  night-ink-soft: "#d6d3cc"
  night-ink-muted: "#aab3c2"
  night-rule: "rgb(243 240 233 / 0.14)"
  night-rule-strong: "rgb(243 240 233 / 0.72)"
  night-code-well: "#0d0e10"
  night-code-bar: "#101114"
typography:
  issue-number:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.78rem"
    fontWeight: 500
    letterSpacing: "0.06em"
    fontFeature: "tnum"
  issue-title:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.15rem, 1.4rem + 3vw, 3.65rem)"
    fontWeight: 500
    lineHeight: 1.04
    letterSpacing: "-0.025em"
  masthead:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(2.2rem, 1.5rem + 3vw, 3.65rem)"
    fontWeight: 500
    lineHeight: 1
    letterSpacing: "-0.025em"
  prose-h2:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.55rem, 1.2rem + 1.1vw, 2.05rem)"
    fontWeight: 500
    lineHeight: 1.15
    letterSpacing: "-0.015em"
  prose-h3:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.15rem, 1.05rem + 0.35vw, 1.3rem)"
    fontWeight: 600
    lineHeight: 1.3
  thesis:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.125rem, 1.05rem + 0.33vw, 1.3125rem)"
    fontWeight: 400
    lineHeight: 1.45
  prose-body:
    fontFamily: "Instrument Sans, Helvetica Neue, Arial, sans-serif"
    fontSize: "clamp(1.03rem, 0.98rem + 0.22vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.72
  meta:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.74rem"
    fontWeight: 400
    letterSpacing: "0.02em"
  label:
    fontFamily: "IBM Plex Mono, ui-monospace, monospace"
    fontSize: "0.72rem"
    fontWeight: 500
    letterSpacing: "0.06em"
  code:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.84rem"
    fontWeight: 400
    lineHeight: 1.7
rounded:
  none: "0"
spacing:
  gutter: "24px"
  gutter-mobile: "16px"
  header: "60px"
  measure: "68ch"
  container: "1280px"
components:
  play-button:
    backgroundColor: "{colors.navy}"
    textColor: "{colors.paper}"
    rounded: "{rounded.none}"
    size: "56px"
  play-button-hover:
    backgroundColor: "{colors.ink}"
  code-window:
    backgroundColor: "{colors.code-well}"
    rounded: "{rounded.none}"
    typography: "{typography.code}"
  code-window-dark:
    backgroundColor: "{colors.night-code-well}"
    rounded: "{rounded.none}"
  prose-link:
    textColor: "{colors.ink}"
  header-control:
    backgroundColor: "transparent"
    rounded: "{rounded.none}"
    height: "40px"
---

# Design System: Synko Lab

## Overview

**Creative North Star: "The Lab Under the Synko Mark"**

Synko Lab is the reading surface (the Astro site in `site/`, published at `lab.synko.digital`) where every post is a numbered issue. It follows the Synko Brand System v1.0 (`/Users/jeandiego/synko/brand-synko/brand`): quiet engineering, editorial precision, understated confidence. Flat fields, hairlines, square corners and type carry the hierarchy; colour is environment, not decoration.

The brand ships light only (its open decision OD-6). The lab adds a dark reading theme derived from the brand's own ink field: the ink becomes the page, paper becomes the text, navy-200 the secondary text, exactly as `[data-synko-surface="ink"]` remaps them. The theme follows `prefers-color-scheme` and the header toggle (stored in `localStorage`).

**Scope.** The lab workbenches inside `posts/002–004/lab` and their reels keep the earlier "Editorial Workbench" look (Figtree, wine, orange) as published. They are not restyled retroactively.

**Key Characteristics:**

- Each issue opens with a small mono "Edição Nº NNN" label, a title with one copper keyword, a ruled thesis strip and the 4:5 video.
- Paper and ink in light; ink and paper in dark. No other grounds.
- Hairlines and an ink rule open structures; nothing is a card.
- Instrument Sans states the argument; IBM Plex Mono labels the evidence; Geist Mono sets code.
- Zero radius, zero shadow, no blur.

## Colors

Monochrome first, from the brand's ten primitives. No generated scales except `ink-soft`, a mix of ink toward paper for long prose.

### Light (brand canonical)

- **Paper `#F3F0E9`:** Page and sticky header ground.
- **Ink `#141518`:** Text, logo, focus ring, strong rules (the rule that opens the thesis strip, tables, the archive list, the masthead), links, the active TOC segment.
- **Ink Soft `#2F3034`:** Long-form prose body.
- **Neutral-600 `#66655F`:** Metadata, labels, "Nº", table heads, list markers.
- **Stone `#D8D2C5`:** Hairline dividers and the empty media well.
- **Copper accent `#B5653A`:** The keyword in an issue title, nothing else. Always at title size (≥ 2rem), so its 3.78 : 1 on paper clears large-text contrast.
- **Navy `#15243D`:** The video play button, the single navy field on the page.

### Dark reading theme

- **Ground:** Ink `#141518`. **Text:** Paper `#F3F0E9`; prose `#D6D3CC`; secondary Navy-200 `#AAB3C2` (8.64 : 1).
- **Rules:** Paper at 14 % (hairline) and 72 % (strong rule).
- **Code well:** `#0D0E10`, sinking below the page instead of inverting.
- **Media:** Light video posters dim to `brightness(0.82) contrast(1.02)` at rest; the filter lifts on play.
- The copper accent and navy play button are unchanged.

### Named Rules

**The One Accent Rule.** Copper appears once per view: the issue keyword. Never on links, buttons, markers or small text.

**The Ink Link Rule.** Links are ink (paper in dark) with a 1px underline at 40 % strength; hover completes the underline. Colour does not signal links.

**The Third-Party Rule.** Framework colours stay inside the embedded demos and videos; the page itself never adopts them.

## Typography

- **Instrument Sans** (variable, 400–700, width 75–100 %), self-hosted from `site/src/styles/fonts/`. All text.
- **IBM Plex Mono** (400, 500), self-hosted. Labels, metadata, "Nº", table heads, tags, footer links, the header "LAB".
- **Geist Mono Variable** (from `@fontsource-variable/geist-mono`). Code only: fenced blocks and inline code. Kept outside the brand for code legibility.

### Hierarchy

- **Issue number:** a Plex Mono label ("Edição Nº 004"; "Edição mais recente · Nº 005" on the index), 0.78rem, uppercase, muted. The title carries the cover; the number only locates it. The giant numeral was dropped.
- **Issue title / masthead:** 500, -0.025em, one copper keyword set upright.
- **Prose H2:** 500, opened by a hairline 1.35rem above and 3.4rem of space before it. **Prose H3:** 600.
- **Thesis:** 400, 1.45 line-height, max 44ch.
- **Prose body:** 400, fluid 1.03–1.125rem, 1.72 line-height, 68ch measure.
- **Labels:** Plex Mono 500, 0.72rem, 0.06em, uppercase. **Meta:** Plex Mono 400, 0.74rem.

## Layout

Unchanged from the previous system; only surfaces changed.

- **Container:** 1280px plus a 24px gutter (16px under 760px).
- **Article cover:** number label and title left, a 240–340px 4:5 media column right; the ruled thesis strip below (96px mono term column). Stacks below 860px.
- **Reading body:** 68ch prose beside a 200–250px sticky TOC; below 1100px the TOC becomes a disclosure above the prose. Code may break the measure by 6ch at ≥ 1100px.
- **Index:** no masthead title (the header already names the lab; a visually hidden h1 keeps the outline). A quiet one-line intro in muted ink above a hairline, then the latest issue as a wide cover, older issues as ruled rows (number, title, thesis, date).

**The Issue Cover Rule.** Every issue opens with number, keyword title and 4:5 video (or the live demo).

**The Rule-Before-Card Rule.** Dividers and grid relationships before any container.

## Elevation & Shapes

Flat. Radius `0` everywhere: video, poster, demo frame, code windows, inline code, header controls, skip link. No shadows, no `backdrop-filter`; the sticky header is solid paper with a bottom hairline. The code window reads as depth by tone alone.

## Components

### Site header

Sticky, 60px (56px mobile), solid paper, bottom hairline. Left: the Synko lockup SVG at 22px height (the brand's header size; never typeset "SYNKO"), a vertical hairline, then "LAB" in Plex Mono. Below 760px only the symbol shows (the wordmark is hidden and the 22px width crops the viewBox). The symbol loops the brand contact motion: the squares part 0.35q along the diagonal and meet again over 480ms, on a 12s cycle that stays in contact most of the time. The brand specifies no loop; this one was requested for the lab. Off under reduced motion. Right: the Work link, PT/EN switch (current language in ink with a spaced underline), theme toggle (40px square, hairline border). On an article, once the title scrolls away the header fades in "Nº NNN" and the truncated title; on mobile the number replaces the brand.

### Live demo

When an issue has a live demo it takes the media column in the same 4:5 frame as the video, as a preview; the "open full screen" link is the real way to use it.

### Video player

4:5 frame on the media well, no border. A 56px square navy play button sits flush in the bottom-right corner; hover goes to ink. On play, native controls appear and the button leaves.

### Code window

Expressive Code with `vitesse-dark`, radius 0, Geist Mono 0.84rem / 1.7, UI labels in Plex Mono. Ink well in light, `#0D0E10` in dark. The copy confirmation is a paper tooltip with ink text.

### Prose

Ink links (see The Ink Link Rule), external links with a small masked arrow. List markers in neutral-600. Blockquote: a one-pixel strong rule on the left. Inline code: Geist Mono at 0.86em on a 6–8 % ink/paper wash, no radius. Tables bounded by strong rules, mono uppercase heads, tabular numerals.

### Footer

The landing page's footer, tightened: a full-bleed ink field that rises out of the paper through the brand grain edge (eased oklab ramp plus film grain), with a shorter band (10rem mobile, 14rem from 768px; the brand uses 16/24rem). Inside: the lockup and one line about the lab; a "Links" label over one horizontal row of links (Synko · Work, GitHub, RSS), right-aligned on desktop and wrapping below the brand on mobile; a closing bar with "© YYYY Synko Lab" and PT/EN. No company data. Text is paper, labels navy-200, rules paper at 22 %.

**The No-Light-In-Dark Rule.** In the dark theme the page is already ink, so the footer field is navy and the ramp runs ink → navy. The grain tile's alpha is used as a mask over `#070B13`, so every speck is darker than the field; the tile's white specks never paint.

### OG image

Built per issue by `site/src/pages/og/[lang]/[slug].png.ts`: paper ground, a small "Nº NNN" label, the Instrument Sans title with the copper keyword, the Synko symbol drawn as two 13px squares in contact, "Synko Lab · lab.synko.digital", and the issue poster unframed.

## Motion

Brand motion tokens: 120ms for hover and colour, 240ms for reveals and theme change, `cubic-bezier(0.4, 0, 0.2, 1)`. Hover changes colour or underline only; no lifts, scaling, sliding arrows or blur transitions. Everything collapses under `prefers-reduced-motion`.

## Do's and Don'ts

### Do:

- **Do** use the brand SVG for the logo and keep its contact pixel-aligned (even pixel heights).
- **Do** keep one copper keyword per view and links in ink.
- **Do** give every colour role a dark counterpart from the ink field.
- **Do** keep fonts self-hosted.

### Don't:

- **Don't** round corners, add shadows, glass or blur.
- **Don't** reintroduce wine or evidence orange on the reading surface.
- **Don't** typeset "SYNKO" in a font.
- **Don't** render the issue list as thumbnail cards.
- **Don't** bring back the giant issue numeral.
- **Don't** let anything light (grain specks included) appear in the dark theme's grounds.
- **Don't** restyle published lab workbenches or regenerate their videos to match.
