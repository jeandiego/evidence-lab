---
name: "Evidence Lab"
description: "An editorial engineering publication: numbered issues to read, workbenches to inspect reproducible technical evidence."
colors:
  paper-ivory: "#fdfcfc"
  canvas-white: "#ffffff"
  warm-surface: "#f5f3f1"
  stone-divider: "#ebe8e4"
  stone-rule-strong: "#d9d4ce"
  graphite: "#1e1b18"
  graphite-soft: "#514c47"
  muted-ink: "#777169"
  reading-muted: "#6f6962"
  synko-wine: "#421d24"
  synko-wine-soft: "#6f2f3a"
  synko-wine-hover: "#55262f"
  evidence-orange: "#d48a46"
  inline-code-wash: "#f3efeb"
  code-bar: "#25211d"
  code-border: "#332d28"
  code-meta: "#a89e94"
  destructive: "#a33b2f"
  vue-signal: "#287c63"
  night-paper: "#161310"
  night-canvas: "#1c1814"
  night-surface: "#1f1b17"
  night-rule: "rgb(230 224 217 / 0.1)"
  night-rule-strong: "rgb(230 224 217 / 0.18)"
  night-ink: "#e6e0d9"
  night-ink-soft: "#c2bab1"
  night-ink-muted: "#968d84"
  night-wine: "#ba6e7b"
  night-wine-text: "#d8959f"
  night-wine-hover: "#e6adb6"
  night-evidence-orange: "#e7a35b"
  night-inline-code-wash: "#231e1a"
  night-inline-code-ink: "#e3b9a0"
  night-code-well: "#100e0c"
  night-code-bar: "#151210"
  night-code-meta: "#8f867d"
typography:
  display:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(3.5rem, 8.2vw, 7.4rem)"
    fontWeight: 300
    lineHeight: 0.91
    letterSpacing: "-0.035em"
  issue-numeral:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(6rem, 17vw, 11rem)"
    fontWeight: 250
    lineHeight: 0.82
    letterSpacing: "-0.045em"
    fontFeature: "tnum"
  headline:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2rem, 4vw, 3.65rem)"
    fontWeight: 350
    lineHeight: 1
    letterSpacing: "-0.03em"
  issue-title:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.15rem, 1.4rem + 3vw, 3.65rem)"
    fontWeight: 330
    lineHeight: 1.02
    letterSpacing: "-0.03em"
  prose-h2:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.55rem, 1.2rem + 1.1vw, 2.05rem)"
    fontWeight: 380
    lineHeight: 1.12
    letterSpacing: "-0.022em"
  thesis:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.15rem, 1rem + 0.55vw, 1.4rem)"
    fontWeight: 350
    lineHeight: 1.38
    letterSpacing: "-0.01em"
  title:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "1.45rem"
    fontWeight: 500
    lineHeight: 1.2
  prose-h3:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.15rem, 1.05rem + 0.35vw, 1.3rem)"
    fontWeight: 520
    lineHeight: 1.3
    letterSpacing: "-0.01em"
  prose-body:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.03rem, 0.98rem + 0.22vw, 1.125rem)"
    fontWeight: 400
    lineHeight: 1.72
  body:
    fontFamily: "Figtree Variable, ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.95rem"
    fontWeight: 400
    lineHeight: 1.6
  meta:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.74rem"
    fontWeight: 400
    letterSpacing: "0.02em"
  code:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.84rem"
    fontWeight: 400
    lineHeight: 1.7
  label:
    fontFamily: "Geist Mono Variable, ui-monospace, monospace"
    fontSize: "0.66rem"
    fontWeight: 650
    lineHeight: 1.2
    letterSpacing: "0.08em"
rounded:
  hairline: "2px"
  inline-code: "5px"
  field: "9px"
  mark: "10px"
  code-window: "12px"
  media: "12px"
  pill: "20px"
  round: "50%"
spacing:
  hairline-gap: "3px"
  field-gap: "7px"
  compact: "12px"
  control: "14px"
  cluster: "18px"
  gutter: "24px"
  section: "30px"
  column: "42px"
  header: "60px"
  measure: "68ch"
  container: "1280px"
components:
  button-primary:
    backgroundColor: "{colors.synko-wine}"
    textColor: "{colors.canvas-white}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
    height: "44px"
  button-primary-hover:
    backgroundColor: "{colors.synko-wine-hover}"
    textColor: "{colors.canvas-white}"
    rounded: "{rounded.field}"
  input:
    backgroundColor: "{colors.canvas-white}"
    textColor: "{colors.graphite}"
    typography: "{typography.body}"
    rounded: "{rounded.field}"
    padding: "11px 12px"
  strategy-item:
    backgroundColor: "transparent"
    textColor: "{colors.graphite}"
    padding: "16px 22px 16px 16px"
    height: "76px"
  code-window:
    backgroundColor: "{colors.graphite}"
    textColor: "{colors.warm-surface}"
    typography: "{typography.code}"
    rounded: "{rounded.code-window}"
  code-window-dark:
    backgroundColor: "{colors.night-code-well}"
    textColor: "{colors.night-ink}"
    typography: "{typography.code}"
    rounded: "{rounded.code-window}"
  inline-code:
    backgroundColor: "{colors.inline-code-wash}"
    textColor: "{colors.synko-wine-hover}"
    rounded: "{rounded.inline-code}"
    padding: "0.1em 0.36em"
  inline-code-dark:
    backgroundColor: "{colors.night-inline-code-wash}"
    textColor: "{colors.night-inline-code-ink}"
    rounded: "{rounded.inline-code}"
    padding: "0.1em 0.36em"
  prose-link:
    textColor: "{colors.synko-wine-soft}"
  prose-link-hover:
    textColor: "{colors.synko-wine-hover}"
  prose-link-dark:
    textColor: "{colors.night-wine-text}"
  play-button:
    backgroundColor: "{colors.synko-wine}"
    textColor: "{colors.paper-ivory}"
    rounded: "{rounded.round}"
    size: "52px"
  play-button-hover:
    backgroundColor: "{colors.synko-wine-hover}"
    textColor: "{colors.paper-ivory}"
  header-control:
    backgroundColor: "transparent"
    textColor: "{colors.graphite-soft}"
    rounded: "{rounded.field}"
    height: "40px"
  toc-item-active:
    textColor: "{colors.synko-wine-soft}"
    padding: "6px 0 6px 14px"
---

# Design System: Evidence Lab

## Overview

**Creative North Star: "The Editorial Workbench"**

Evidence Lab combines the authority of an independent technical publication with the clarity of a physical inspection bench. It has two surfaces in one world. The **reading surface** (the Astro site at `/lab`) treats every post as a numbered issue: the number and the reel video are the cover, the article is the reading. The **workbench surface** (each lab app) is spacious and editorial at the top, then becomes denser and more instrument-like as the reader moves into the experiment. Neither surface decorates the evidence; both arrange code, behavior, data, and trade-offs so they can be read and compared without losing context.

The visual world is warm rather than clinical: paper ivory replaces sterile white, and at night a warm graphite ground replaces pure black. Synko Wine carries identity and emphasis; Evidence Orange marks observations and measurements. Fine one-pixel rules, disciplined alignment, and small monospaced annotations provide structure. Motion is brief and explanatory, never theatrical, and every transition has a reduced-motion equivalent.

This is a technical publication, not a generic dashboard, not a framework showcase, and not a card-grid blog. Framework colors appear only as local identifiers; the Synko palette remains the dominant voice.

**Key Characteristics:**

- Editorial scale paired with workbench density.
- Each post is a numbered issue whose cover is a giant light numeral and a 4:5 video.
- Warm paper surfaces by day, warm graphite by night, dark graphite type, sparse Synko accents.
- Hairline rules and alignment establish hierarchy before containers do.
- Figtree carries the argument; Geist Mono labels the evidence.
- One active object of inspection at a time.
- Quiet, state-driven motion with complete reduced-motion support.

## Colors

The palette feels like ink and annotation on warm archival paper: restrained neutrals carry most of the page, wine establishes authorship, and orange calls out evidence. The reading surface ships a light and a dark theme from the same roles; the lab workbenches are light only.

### Primary

- **Synko Wine:** The identity color for emphasized headline phrases, active states, focus outlines, primary actions, the video play button, blockquote rules, and diagram connectors. Its scarcity gives it authority.
- **Soft Synko Wine:** The readable text form of the wine: prose links, the keyword inside an issue title, the "Nº" prefix, the active TOC entry, the current language, and evidence links. Link underlines are the same color at 40% strength until hover.
- **Deep Synko Wine:** Hover state for wine actions and links; also the ink of inline code in the light theme.

### Secondary

- **Evidence Orange:** A precise annotation color for indices, status dots, list markers in prose, the brand dot beside "Evidence Lab", and the copy-success tooltip in code windows. It signals evidence without competing with the argument.

### Neutral

- **Paper Ivory:** The page ground; warmer and quieter than pure white.
- **Canvas White:** A local contrast surface for controls and compact nodes.
- **Warm Surface:** A secondary tonal layer for hover washes, code results, and the empty media well behind a loading cover.
- **Stone Divider:** The structural hairline for rows, section tops, TOC spines, and header/footer edges.
- **Strong Stone Rule:** The heavier hairline that opens a structure: the rule above the thesis strip, above and below tables, above the archive list, around the evidence block.
- **Graphite:** Primary text and the inverted code-window surface.
- **Graphite Soft:** Supporting prose; long-form article body sits here, with strong text lifted to Graphite.
- **Muted Ink:** Annotations and inactive states on the workbench.
- **Reading Muted:** The reading surface's slightly darker muted ink for metadata, table heads, TOC entries, and footer links, so small mono text holds contrast on ivory.
- **Inline Code Wash:** The warm tint behind inline code in prose.
- **Code Bar / Code Border / Code Meta:** The title-bar tone, frame edge, and filename/metadata ink of the light-theme code window.

### Dark Reading Theme

The dark theme is a reading theme, derived from the Synko landing page's dark mode, and switched by `data-theme="dark"` on the root (initial value from storage, then `prefers-color-scheme`). Every role above has a night counterpart; nothing else changes.

- **Night Paper** and **Night Canvas / Night Surface:** A warm graphite ground (not black) with two barely-lifted tonal layers for hover and control surfaces. Browser chrome follows via `theme-color`.
- **Night Rule / Night Rule Strong:** Hairlines drawn in the ink color at 10% and 18%, so rules stay warm instead of turning grey.
- **Night Ink, Night Ink Soft, Night Ink Muted:** Text sits below pure white to avoid halation in long reading; body prose uses Night Ink Soft.
- **Night Wine family:** The wine is lightened so links and keywords keep contrast on graphite; Night Wine draws rules and focus, Night Wine Text colors links and keywords, Night Wine Hover is the lightest step.
- **Night Evidence Orange:** A slightly brighter orange so markers keep their presence.
- **Night Inline Code Wash / Ink:** A graphite chip with a peach-toned code ink, so inline code reads as code rather than as a second link color.
- **Night Code Well / Bar / Meta:** The code window sinks below the page (darker than Night Paper) instead of inverting, so it stays the high-contrast artifact in both themes.
- **Dimmed media:** Video covers and posters are drawn with `brightness(0.82) contrast(1.02)` at rest in dark mode so light video frames do not glare; the filter lifts once playback starts.

### Tertiary

- **Vue Signal:** A local framework identifier used only on the Vue mark.
- **Destructive:** Error copy and the AngularJS mark; it is not a second brand accent.

### Named Rules

**The One Editorial Voice Rule.** Synko Wine owns emphasis; third-party brand colors remain small, local signals and never become section backgrounds or dominant accents.

**The Evidence Is Orange Rule.** Use Evidence Orange for observations, indices, markers, and status, not for primary calls to action or links.

**The Paper, Not Dashboard Rule.** Large areas stay Paper Ivory or Canvas White (Night Paper in the dark theme); avoid generic cool-gray dashboard panels.

**The Warm Night Rule.** The dark theme is warm graphite with off-white ink; never pure black grounds or pure white text, and every light role must have a night counterpart rather than an inverted guess.

## Typography

**Display Font:** Figtree Variable (with `ui-sans-serif`, `system-ui`, and `sans-serif` fallbacks)  
**Body Font:** Figtree Variable (with the same fallbacks)  
**Label/Mono Font:** Geist Mono Variable (with `ui-monospace` and `monospace` fallbacks)

**Character:** Figtree supplies an open, contemporary editorial voice with unusually light display weights. Geist Mono provides technical contrast for labels, filenames, measurements, metadata, and code without making the interface feel like a terminal. Both are self-hosted.

### Hierarchy

- **Issue Numeral** (250, fluid 6–11rem, 0.82 line-height, tabular numerals): The issue number on the article cover; the index cover runs it one step larger and lighter (200, up to 12rem). A tiny mono "Nº" at 10% of the numeral's size hangs from its top-left in Soft Synko Wine.
- **Display** (300, fluid 3.5–7.4rem, 0.91 line-height): Workbench hero statements only. Keep tracking tight and let selected phrases carry Synko Wine.
- **Headline** (350, fluid 2–3.65rem, 1 line-height): Workbench strategy and major section arguments; the index masthead "Evidence Lab" uses the same size at 300.
- **Issue Title** (330, fluid 2.15–3.65rem, 1.02 line-height, max 17–18ch): The title under the numeral. Exactly one authored keyword renders in Soft Synko Wine, upright, never italic.
- **Thesis** (350, fluid 1.15–1.4rem, 1.38 line-height, max 44ch): The one-sentence thesis in the ruled strip.
- **Prose H2** (380, fluid 1.55–2.05rem, 1.12 line-height): Article sections; each opens with a Stone Divider rule 1.35rem above the text and 3.4rem of space before the rule.
- **Title** (500, 1.45rem, 1.2 line-height): Workbench framework and component headings.
- **Prose H3** (520, fluid 1.15–1.3rem, 1.3 line-height): Subsections, 2.4rem above; content after any heading closes to 0.8rem.
- **Prose Body** (400, fluid 1.03–1.125rem, 1.72 line-height, 68ch measure): Long-form reading in Graphite Soft; paragraphs separated by 1.15em.
- **Body** (400, 0.95rem, 1.6 line-height): Workbench explanations; keep supporting passages near 52ch.
- **Meta** (Geist Mono 400, 0.74rem, 0.02em tracking): Dates, reading time, tags, archive numbers, and cover metadata.
- **Code** (Geist Mono 400, 0.84rem, 1.7 line-height): Code windows. Inline code in prose runs at 0.86em of the surrounding text.
- **Label** (Geist Mono 600–650, 0.66–0.72rem, 0.06–0.08em tracking, uppercase): Row terms, table heads, TOC heading, footer links, language switch.

### Named Rules

**The Argument and Evidence Rule.** Figtree states the argument; Geist Mono locates and labels the evidence: numbers, files, dates, and measurements.

**The Light Scale Rule.** Large type earns authority through size, spacing, and low weight. Numerals and titles stay between 200 and 380; do not make display headlines bold.

**The One Keyword Rule.** An issue title carries at most one wine keyword, set upright in color, never italic, never underlined.

**The Tabular Evidence Rule.** Right-aligned table cells are numbers: they switch to Geist Mono with tabular numerals and do not wrap.

## Layout

The reading surface uses a centered container capped at 1280px plus a 24px gutter per side (16px under 760px). The lab workbench caps at 1440px with the same gutter.

**Numbered issue (article).** The first viewport is a two-column cover: the numeral and title on the left, a 4:5 video column (240–340px) on the right spanning both rows. Beneath the title a ruled thesis strip opens with a Strong Stone Rule: a 96px mono term column beside the thesis, then a Stone Divider, then a row of mono metadata aligned to the thesis column (date, reading time, "code and data" link in wine, tags). Below 860px the cover stacks as text, thesis strip, then video (max 360px); below 560px the term column folds above its content.

**Reading body.** A 68ch prose column and a 200–250px table-of-contents column, pushed apart with fluid 40–96px space. The TOC is sticky under the header. Code windows are allowed to break the measure by 6ch to the right at 1100px and above. Below 1100px the TOC moves above the prose as a collapsible, rule-bounded block and the body narrows to the measure.

**Issue end.** A ruled "Reproduce" block in the same 96px term grid lists raw evidence files in mono wine links, followed by previous / next / all-issues links as rule-separated rows.

**Index.** A masthead band (title left, intro right, bottom Strong Stone Rule), then the latest issue as a wide cover (numeral, title, thesis, mono meta with an arrow call to action, 4:5 poster up to 360px wide), then older issues as a ruled archive list: mono number, title, thesis, date. There are no thumbnail cards.

**Workbench.** A 290px strategy rail beside a flexible stage that splits preview and analysis roughly two-to-one. Internal spacing repeats 12–18px clusters, 30px section intervals, and 42px column separations. At 1100px the rail narrows and the summary becomes a two-column band; at 760px the rail becomes a horizontal scroll-snapping selector and most regions collapse to one column.

**The Issue Cover Rule.** Every issue opens with number, keyword title, and 4:5 video; the video is the cover image, never a cropped thumbnail inside a card.

**The One Object Rule.** On the workbench, show one strategy preview and its synchronized evidence at a time; preserve each form's state when the reader changes strategies.

**The Rule-Before-Card Rule.** Use dividers and grid relationships before introducing a boxed container.

## Elevation & Depth

The system is flat and structural. It uses tonal changes, borders, and inset organization instead of floating surfaces. The only persistent layer is the sticky header: a 90–92% translucent paper ground with `saturate(1.4) blur(10px)` and a bottom hairline. In the dark theme the code window reads as depth by sinking darker than the page, not by casting a shadow.

### Shadow Vocabulary

- **Control focus** (`0 0 0 3px rgb(66 29 36 / 0.09)`): A restrained wine halo around focused form controls, paired with a wine border.
- **Evidence status halo** (`0 0 0 4px rgb(212 138 70 / 0.12)`): A soft orange ring around the workbench contract indicator.
- **Media control lift** (`0 6px 18px rgb(30 27 24 / 0.22)`): The soft shadow under the video play button so it separates from any frame of the cover.

### Named Rules

**The Flat-by-Default Rule.** Surfaces sit on the page at rest; use borders and tonal layers for structure, not ambient drop shadows. Code windows ship with no frame shadow.

## Shapes

The dominant geometry is rectilinear and editorial. Long sections, navigation rows, the thesis strip, tables, TOC, and archive rows remain square so their rules connect cleanly. Interactive controls (primary action, fields, header links, theme toggle) use gently curved 9px corners; framework marks use 10px; contained artifacts (code windows, video player, cover posters) use 12px; inline code uses 5px. Circular geometry is limited to the play button, status and brand dots, and scrollbar pills.

**The Local Curvature Rule.** Curves belong to touchable controls and contained artifacts. Do not round major page sections, the reading column, or the workbench shell.

## Components

Components feel precise and restrained: obvious enough to operate, quiet enough to keep the argument and its evidence in command.

### Buttons

- **Shape:** Gently curved primary action (9px) with a minimum 44px height.
- **Primary:** Synko Wine background, white text, compact horizontal padding, semibold label.
- **Hover / Focus / Active:** Hover deepens the wine; focus uses the shared two-pixel wine outline with a three-pixel offset; active moves down by one pixel.
- **Tabs:** Workbench inspection tabs are transparent text buttons whose active state is a one-pixel wine underline that expands into place.
- **Header controls:** 40px-tall text links and a 40px square theme toggle with a hairline border; hover lifts the ink and adds a Warm Surface wash. The toggle cross-fades a line-drawn sun and moon with a small rotation.

### Cards / Containers

- **Corner Style:** Major regions remain square; only contained artifacts receive rounding.
- **Background:** Paper Ivory (or Night Paper) is the ground; Canvas White is for localized controls and diagram nodes; Graphite inverts the code window.
- **Shadow Strategy:** Flat by default; see Elevation & Depth.
- **Border:** One-pixel Stone Divider rules define sections and rows; Strong Stone Rules open structures. Media and code windows carry their own one-pixel frame.
- **Internal Padding:** Compact artifacts use 14–23px; stage-level columns use 30–42px; reading rows use 18–22px vertical padding with no horizontal inset.

### Inputs / Fields

- **Style:** White surface, subtle warm-gray stroke, 9px radius, 11px by 12px internal padding.
- **Focus:** Border shifts to Synko Wine and gains the soft wine focus halo.
- **Error / Disabled:** Error text uses Destructive at a compact size with a reserved line box so layouts do not jump. Disabled styling must remain legible and may not rely on opacity alone.

### Navigation

- **Site header:** Sticky, 60px (56px on mobile), translucent paper with a bottom hairline. Left: an orange dot and "Evidence Lab" in Figtree 560. Right: the Synko work link with a small outbound arrow, a mono PT/EN switch behind a vertical hairline (current language in wine with a spaced underline), and the theme toggle.
- **Reading state:** On an article, once the issue title scrolls out of view, the header gains "Nº NNN" in mono wine plus the truncated title behind a vertical hairline, fading and rising into place over about 320–420ms with a slight blur clearing. On mobile the number replaces the brand name instead of joining it.
- **Table of contents:** An ordered list of H2 and H3 entries hung from a one-pixel vertical spine; H3 entries indent further. The active section (the last heading above 28% of the viewport) turns Soft Synko Wine and draws its segment of the spine in wine. Below 1100px it becomes a disclosure, closed by default.
- **Strategy selector (workbench):** A tablist of measured rows with index, strategy, note, and LOC; the selected state uses Synko Wine and a three-pixel vertical indicator; vertical arrow keys cycle on desktop, and mobile uses a snap-aligned strip.
- **Footer:** A top hairline, a quiet note, and mono uppercase links that turn wine on hover.

### Issue Cover (signature)

The numbered-issue composition described in Layout: giant light numeral with its hanging "Nº", one-keyword wine title, ruled thesis strip with mono metadata, and the 4:5 video. On the index the whole cover is one link; hovering lifts the poster 4px, strengthens its frame, and slides the call-to-action arrow 4px.

### Video Player

A 4:5 frame (12px radius, hairline border, Warm Surface or Night Code Well behind it) that shows the clean poster at rest with no native controls. A 52px round Synko Wine play button with an ivory triangle sits 16px in from the bottom-right corner; hover deepens the wine and scales it to 1.06. On play, native controls appear, the button leaves, focus moves to the video, and the dark-theme dimming lifts. The button keeps the brand wine in both themes. A mono label sits beneath as the caption.

### Prose

- **Links:** Soft Synko Wine with a 1px underline at 40% strength, 0.22em offset; hover goes to Deep Synko Wine with a full underline. External and repository links carry a small masked outbound arrow at 70% opacity.
- **Lists:** Markers in Evidence Orange.
- **Blockquote:** A one-pixel wine rule on the left, Graphite text, no background.
- **Inline code:** Geist Mono at 0.86em on the Inline Code Wash, 5px radius, wraps anywhere and clones its box across line breaks.
- **Tables:** Full width inside a horizontally scrollable wrapper bounded by Strong Stone Rules; the side with more content fades out over 64px. Heads are mono uppercase labels in Reading Muted; rows are separated by Stone Dividers; numeric columns follow the Tabular Evidence Rule.

### Code Window

The deliberate high-contrast artifact, used for workbench excerpts and, through Expressive Code, for every fenced block in the reading surface. Graphite well (Night Code Well in dark), Code Bar title strip, one-pixel Code Border frame, 12px radius, no frame shadow. Filename tabs and terminal titles use Geist Mono at 0.72rem in Code Meta, with no active-tab indicator and no terminal traffic-light dots. Code is Geist Mono 0.84rem at 1.7 line-height on the `vitesse-dark` syntax theme; long lines wrap with preserved indentation instead of scrolling. The copy button is always visible on touch devices (with reserved right padding) and confirms in an Evidence Orange tooltip. It is not a general-purpose dark theme; the site's dark theme is defined separately above.

### Framework Marks

Compact 40px square marks identify frameworks without importing their visual systems. Vue uses its local green signal; AngularJS shares the destructive red. Both remain subordinate to the Synko palette.

## Do's and Don'ts

### Do:

- **Do** open every issue with its number, a one-keyword title, the thesis strip, and the 4:5 video.
- **Do** keep article prose at the 68ch measure in Graphite Soft, with sections opened by a hairline rule.
- **Do** use one-pixel Stone Divider rules to make grids, rows, and relationships legible.
- **Do** reserve Geist Mono for evidence-bearing metadata, numbers, filenames, and technical labels.
- **Do** give every color role a night counterpart in the dark reading theme, and dim light media at rest.
- **Do** synchronize preview, facts, verdict, and inspection content around one active strategy on the workbench.
- **Do** preserve visible focus, keyboard navigation, and `prefers-reduced-motion` behavior.
- **Do** keep Figtree and Geist Mono locally hosted.

### Don't:

- **Don't** render the issue list as a grid of thumbnail cards; older issues are ruled rows.
- **Don't** use pure black grounds or pure white text in the dark theme.
- **Don't** show all five forms simultaneously; comparison happens through a stable inspection stage.
- **Don't** turn every region into a rounded, elevated card.
- **Don't** use framework brand colors as the page's visual language.
- **Don't** treat line count as a productivity score; it is a locator for implementation cost.
- **Don't** use decorative motion that delays reading or inspection or obscures state changes.
- **Don't** make display typography bold or compress the page into dashboard density.
