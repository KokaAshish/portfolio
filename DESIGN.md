# DESIGN.md

Design artifacts are in the [/design](./design/) folder.

---

## Philosophy

The design goal was: feels like a tool, not a template. Dark by default, technical without being cold, and detailed enough that someone who looks closely notices things.

The four signature details I aimed for:
1. **Terminal UI** on the homepage — visitors type commands to explore the site.
2. **Animated SVG background** — pulsing gradient orbs and floating dots that don't distract.
3. **Film grain texture** — a subtle SVG noise overlay that makes the dark backgrounds feel tactile rather than flat.
4. **Scroll-driven typography** — large hero text with intersection-observer-based reveal animations.

---

## Color system

All values are CSS custom properties on `:root`, overridden for `[data-theme="light"]`.

### Dark mode (default)

| Token              | Value     | Usage                              |
|--------------------|-----------|------------------------------------|
| `--bg`             | `#08080f` | Page background                    |
| `--bg-surface`     | `#0f0f1a` | Cards, nav background              |
| `--bg-elevated`    | `#16162a` | Hover states, code blocks          |
| `--border`         | `#1e1e35` | Borders, dividers                  |
| `--border-glow`    | `#7c6af740` | Glowing borders on hover          |
| `--text`           | `#e8e6f0` | Primary text                       |
| `--text-muted`     | `#6b6880` | Secondary text, descriptions       |
| `--text-dim`       | `#3e3b52` | Placeholder text                   |
| `--accent`         | `#7c6af7` | Primary accent (soft violet)       |
| `--accent-glow`    | `#7c6af730` | Glow shadows                     |
| `--cyan`           | `#4aeadc` | Secondary accent, terminal prompts |
| `--amber`          | `#f0b429` | Warnings (unused in v1)            |

### Light mode

The light mode uses the same hue family — muted purple backgrounds, deep navy text — so the transition feels intentional rather than inverted. `--accent` shifts to `#5a4fcf` (slightly darker for contrast on light backgrounds), and glow effects are reduced in intensity.

### Contrast ratios

- `--text` on `--bg`: ~14:1 (passes AAA)
- `--text-muted` on `--bg`: ~5.2:1 (passes AA)
- `--accent` on `--bg`: ~6.1:1 (passes AA for large text; used mostly for decorative elements)

---

## Typography

| Token            | Value                                  | Usage                       |
|------------------|----------------------------------------|-----------------------------|
| `--font-sans`    | Inter, system-ui, sans-serif           | Body, UI                    |
| `--font-mono`    | JetBrains Mono, Fira Code, monospace   | Labels, code, terminal      |

### Type scale

Fluid sizing using `clamp()` at the hero level; fixed rem scale everywhere else:

- Hero: `clamp(3rem, 10vw, 7rem)` — scales with viewport
- Display (h1): `clamp(2rem, 5vw, 4rem)`
- Section title (h2): `2rem`
- Card title (h3): `1.25rem`
- Body: `1rem`
- Muted/meta: `0.875rem`
- Mono labels: `0.75rem`, `letter-spacing: 0.15em`, `text-transform: uppercase`

---

## Spacing system

Based on a 4px baseline grid (`--space-1 = 0.25rem`):

`4 → 8 → 12 → 16 → 24 → 32 → 48 → 64 → 96 → 128px`

Sections use `--space-24` (6rem) padding-block on desktop, `--space-16` (4rem) on mobile.

---

## Effects

**Grain texture** — SVG `<feTurbulence>` filter rendered as a `data:` URI in the `body::before` pseudo-element. Fixed position, pointer-events none, z-index 9999. Opacity 0.6. Adds tactile depth to flat dark surfaces without performance cost (no external image request).

**Glow** — `box-shadow: 0 0 24px var(--accent-glow), 0 0 48px var(--accent-glow)` on hover states for cards and the terminal. Reduced to single-layer in light mode.

**Gradient text** — `background-clip: text` with a `135deg` gradient from `--accent` to `--cyan`. Used on the hero first name and 404 code.

**Animated orbs** — Two radial gradients in an SVG background, moving with a `12–16s ease-in-out infinite alternate` animation. Subtle enough to be background texture, visible enough to add depth on large viewports.

**Scroll reveal** — `IntersectionObserver` adds `.visible` to elements with `.reveal`, triggering a `opacity: 0 → 1` + `translateY(24px → 0)` transition. Staggered with `--reveal-delay-{1-4}` classes.

---

## Component decisions

**Navigation** — Fixed, backdrop-blur, border-bottom at 80% opacity on dark. Collapses to a hamburger at 640px. Active state uses a sliding underline pseudo-element rather than a background highlight — more precise and less noisy.

**Cards** — Consistent `card` class: surface background, single-pixel border, 16px radius, hover lifts 2px and adds a glow border. Used for project rows, terminal, contact form, 404 terminal. Consistent treatment across all "elevated surface" contexts.

**Terminal** — Custom-styled, no library. Commands are defined as a plain object keyed by command string. Adding new commands is one object entry. The terminal is the main stretch-goal feature; it was worth building from scratch to keep the JS minimal (no library = no extra bundle).

**Buttons** — Two variants: `btn-primary` (accent fill) and `btn-ghost` (transparent with border). Both use the same base `.btn` class for sizing. No tertiary or icon-only variants in v1.

---

## Design artifacts

See `/design/` for:
- Wireframes: homepage, project case study, contact page (desktop + mobile)
- Before/after: first wireframe iteration vs. shipped design
- Color swatches export

Wireframes were done in Excalidraw (browser-based, no account required). E