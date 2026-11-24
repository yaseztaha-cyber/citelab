# Design Review: CiteLab full application

Reviewed against: user-confirmed direction; no `DESIGN_BRIEF.md` was found in the project.
Philosophy: warm editorial paper + evidence-chain laboratory: `SOURCE → EVIDENCE → CLAIM → CITATION → REFERENCE → UNDERSTANDING`.
Date: 2026-10-03

## Screenshots Captured

No Playwright MCP or Cursor browser tool was available, so I used the same capture protocol with local Playwright/Chromium: desktop `1280×800`, tablet `768×1024`, mobile `375×812`, full-page PNGs, plus desktop Night Study Lab variants. Capture completed with `28` saved screenshots and `0` page errors.

| Screenshot | Breakpoint | Description |
| --- | --- | --- |
| `screenshots/review-home-desktop-1280.png` | Desktop, paper | Lab console: central specimen, WHY CITATIONS MATTER, instruments, investigation, daily specimen, stamps. |
| `screenshots/review-learn-desktop-1280.png` | Desktop, paper | Learn: lesson index, investigation, evidence, examples, rule panel. |
| `screenshots/review-practice-desktop-1280.png` | Desktop, paper | Train: evidence packet, constructor, accuracy pattern, order drill, in-text application. |
| `screenshots/review-builder-desktop-1280.png` | Desktop, paper | Build: raw evidence, construction zone, APA logic column. |
| `screenshots/review-inspector-desktop-1280.png` | Desktop, paper | Inspect: suspect citation, exhibits, sealed case report, reconstruction lab, case file. |
| `screenshots/review-desk-desktop-1280.png` | Desktop, paper | Research Source Explorer: taxonomy graph, journal-vs-book comparison, detail panel. |
| `screenshots/review-progress-desktop-1280.png` | Desktop, paper | Mastery: skill map, dossier, ledger, stamps, journey. |
| `screenshots/review-home-tablet-768.png` | Tablet, paper | Lab console stacked; rail replaced by bottom nav; path cards vertical. |
| `screenshots/review-learn-tablet-768.png` | Tablet, paper | Learn stacked; lesson index above investigation. |
| `screenshots/review-practice-tablet-768.png` | Tablet, paper | Train stacked into readable sections. |
| `screenshots/review-builder-tablet-768.png` | Tablet, paper | Build stacked evidence/construction/logic. |
| `screenshots/review-inspector-tablet-768.png` | Tablet, paper | Inspect stacked exhibits and reports. |
| `screenshots/review-desk-tablet-768.png` | Tablet, paper | Source Explorer stacked; taxonomy scrolls horizontally. |
| `screenshots/review-progress-tablet-768.png` | Tablet, paper | Mastery stacked; ledger remains scannable. |
| `screenshots/review-home-mobile-375.png` | Mobile, paper | Bottom nav; top actions wrap; cards stack without overflow. |
| `screenshots/review-learn-mobile-375.png` | Mobile, paper | Lesson index and investigation stack; dense but navigable. |
| `screenshots/review-practice-mobile-375.png` | Mobile, paper | Challenge and drills stack vertically. |
| `screenshots/review-builder-mobile-375.png` | Mobile, paper | Workbench uses stepped single-pane flow. |
| `screenshots/review-inspector-mobile-375.png` | Mobile, paper | Forensics panels stack; actions remain reachable. |
| `screenshots/review-desk-mobile-375.png` | Mobile, paper | Explorer list/detail stack; taxonomy scrolls rather than breaking layout. |
| `screenshots/review-progress-mobile-375.png` | Mobile, paper | Skill map, dossier, ledger, stamps stack. |
| `screenshots/review-home-desktop-1280-night.png` | Desktop, night | Night Study Lab home preserves hierarchy and warmth. |
| `screenshots/review-learn-desktop-1280-night.png` | Desktop, night | Night Learn remains readable. |
| `screenshots/review-practice-desktop-1280-night.png` | Desktop, night | Night Train preserves evidence/construction contrast. |
| `screenshots/review-builder-desktop-1280-night.png` | Desktop, night | Night Build preserves three-zone structure. |
| `screenshots/review-inspector-desktop-1280-night.png` | Desktop, night | Night forensics preserves sealed-file hierarchy. |
| `screenshots/review-desk-desktop-1280-night.png` | Desktop, night | Night Explorer works, but unselected taxonomy labels look dim. |
| `screenshots/review-progress-desktop-1280-night.png` | Desktop, night | Night Mastery is coherent. |

> All screenshots are in `D:\YASEZ_HOME\projects\citelab\screenshots\`.

## Summary

CiteLab reads as an editorial research instrument, not a generic quiz dashboard: serif citations, specimen anatomy, rule traces, sealed case files, and the Source Explorer carry the evidence-chain philosophy. The biggest risks are theme-token leakage on special evidence surfaces, cold-start empty columns that show terminal actions too early, and Learn/Mastery density that weakens the otherwise strong reading order.

## Must Fix

1. **Theme-hardcoded evidence surfaces**: unselected Source Explorer taxonomy nodes and some specimen/graph/workbench washes bypass Night Study Lab tokens. In `screenshots/review-desk-desktop-1280-night.png`, selected “Journal article” is clear while surrounding taxonomy labels look dim; the night montage also shows bright paper-like Build construction and Inspector repair panels. Related hardcodes include dark specimen/graph fills and fixed light washes in `styles.css:186`, `styles.css:272`, `styles.css:406`, `styles.css:454`, `styles.css:691-692`. _Fix: route taxonomy nodes, specimen washes, graph panels, workbench/repair panels, and the Mastery console through existing paper/night semantic tokens; add explicit night fills for unselected interactive SVG nodes and verify contrast._
2. **Cold-start terminal actions**: fresh Practice shows “Reveal the correction” and “Archive reference” alongside an empty reference preview in `screenshots/review-practice-desktop-1280.png`; Build’s APA-logic column is mostly empty in `screenshots/review-builder-desktop-1280.png`; Inspector shows several empty/sealed panels before investigation in `screenshots/review-inspector-desktop-1280.png`. _Fix: disable or hide reveal/archive/“send” actions until the minimum valid construction exists, and replace empty logic/report columns with the next required action plus a staged checklist._
3. **Paper-mode Mastery console breaks the philosophy**: the black terminal-style skill map dominates `screenshots/review-progress-desktop-1280.png`, while the rest of the app is warm paper; related hardcoded console styling is around `styles.css:406-409`. _Fix: restyle the skill map as a paper taxonomy/document tree in paper mode while retaining a deliberate dark treatment only in Night Study Lab._

## Should Fix

1. **Learn index density**: `screenshots/review-learn-desktop-1280.png`, `screenshots/review-learn-tablet-768.png`, and `screenshots/review-learn-mobile-375.png` show a very long lesson index beside/above the investigation. _Fix: default modules to collapsed except the current investigation, keep the active lesson sticky/visible, and add “current position” context._
2. **Explorer comparison table compression**: in `screenshots/review-desk-desktop-1280.png`, the left dimension/family columns are narrow and cramped. _Fix: give the comparison table a clearer first-column width, sticky row labels on wide screens, and a card layout below the taxonomy breakpoint._
3. **Navigation naming drift**: rail uses “Train,” “Research,” and “Mastery” in `index.html:26-33`, while mobile bottom nav uses “TRAIN,” “DESK,” and “MAP” in `index.html:519-527`. _Fix: use one vocabulary everywhere: Lab/Learn/Train/Build/Inspect/Research/Mastery._
4. **Pill/radius and status-token drift**: pills/tabs use `999px` radii in `styles.css:168`, `styles.css:316`, `styles.css:326`, `styles.css:418`, `styles.css:500`, `styles.css:590` against `--radius:10px` and `--radius-s:6px` in `styles.css:27-28`; status uses overlapping `.tag`, `.acc-state`, `.mstate`, and `.xm` vocabularies. _Fix: add `--radius-pill` and one semantic status vocabulary mapped to success/warning/danger/info tokens._
5. **Untokenized type scale**: headings and citation text use breakpoint-specific hardcoded sizes in `styles.css:157`, `styles.css:236`, `styles.css:491-492`, `styles.css:537`, `styles.css:544`, `styles.css:667`, `styles.css:705-707`. The rendered scale looks consistent, but future edits can drift. _Fix: introduce display/title/body/micro/mono tokens and replace hardcoded font sizes._
6. **Duplicate citation painters**: identical `dnaSegEl`/`dnaNodeEl` implementations exist in `ui.js:91-113` and `app.js:177-199`. _Fix: keep the shared implementation in `ui.js` and delete the duplicate in `app.js`._
7. **Landmark gap**: navigation and labelled sections are present in `index.html:19-38` and `index.html:56-485`, but the content wrapper is `div.main` rather than a `main` landmark. _Fix: change the content wrapper to `<main>` or add the equivalent landmark role without altering layout._
8. **Tablet/mobile topbar wrapping**: `screenshots/review-home-tablet-768.png` and `screenshots/review-home-mobile-375.png` push “Daily specimen” onto a second chrome row. This is acceptable, but it weakens topbar hierarchy. _Fix: collapse secondary topbar actions into the existing overflow/menu pattern on narrow widths._

## Could Improve

1. **Inline-style cleanup**: one-off layout styles remain in markup/templates such as `index.html:442`, `app.js:229`, `app.js:343`, and small concept/focus heads. _Suggestion: move repeated spacing/typography into utility classes or existing panel/eyebrow styles._
2. **Motion documentation**: transitions exist and reduced-motion handling is present in `styles.css:119-121`, but there is no brief-level motion rule. _Suggestion: document that motion is limited to state confirmation, scanning, and trace reveals; no decorative looping motion._
3. **Home stamp-grid rhythm**: “RESEARCH STAMPS” in `screenshots/review-home-desktop-1280.png` has uneven card heights/rows. _Suggestion: normalize stamp-card minimum height and align progress metadata._
4. **Mobile-first CSS posture**: responsive behavior works and prior QA found no horizontal overflow, but breakpoints are desktop-first `max-width` rules such as `styles.css:482-505`. _Suggestion: for new work, prefer `min-width` progressive enhancement while leaving the working layout intact._

## What Works Well

- The central specimen → anatomy → trace → rebuild flow is visually and conceptually coherent across Home, Learn, Train, and Build.
- WHY CITATIONS MATTER is prominent without becoming marketing decoration.
- Source Explorer makes source-type consequences tangible through taxonomy, comparison, structure signature, worked specimen, mistakes, and research value.
- Night Study Lab is a genuinely redesigned theme with semantic tokens in `styles.css:69-107`, not a simple inversion.
- Forensics language—exhibits, sealed findings, reconstruction, mistake memory—supports the philosophy that corrections must cite a rule.
- Responsive adaptation is real reorganization: bottom navigation, stacked cards, stepped workbench, scrollable taxonomy, and preserved contrast.

## Implementation status (2026-10-03)

Implemented and verified with zero failures across curriculum, matrix, title-first, qa5a–qa8, polish, final UI, search, a11y, foundations, referrer, researcher, video, and overhaul suites:

- Added `--radius-pill` and base type tokens; routed pill radii and base heading/lede/micro/citation sizes through tokens.
- Replaced hardcoded specimen/graph/skill-tree/workbench surfaces with paper/night semantic tokens.
- Added the Evidence Thread chain (`Source → Evidence → Claim → Citation → Reference → Understanding`) with active `aria-current` state and full mobile labels on bottom navigation.
- Removed duplicated DNA painters; `ui.js` remains the single implementation.
- Reordered Home instruments to `01–05`, moved path titles to editorial serif title case, normalized stamp rhythm, widened Explorer comparison columns, and made the Learn index sticky on desktop.
- Verified existing evidence gating instead of changing behavior: Practice reveal, Build copy, Inspector correction reveal, and archive guards were already present.

Deferred to protect tests or avoid behavior changes: collapsing Learn modules by default, unifying all status vocabularies, full breakpoint type-token replacement, and a narrow-width topbar overflow menu.
