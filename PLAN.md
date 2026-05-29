# PLAN.md

## What I'm building

A personal portfolio site that serves as my online presence. Multi-page, dark-mode capable, with a working contact form, a small blog, and case studies of past work. Deployed entirely on Cloudflare's free tier.

---

## Stack choice

**Static site generator: Astro**

I chose Astro over Eleventy and Hugo for three reasons:
1. Native TypeScript and content collections — the schema-validated frontmatter means I can't ship a broken page because I typo'd a field name.
2. Islands architecture: zero JS shipped by default. The terminal on the homepage and the contact form are the only client-side JS on the whole site. Everything else is static HTML.
3. The Cloudflare adapter is first-class and well-documented.

I considered Hugo for its build speed, but Go templating would have slowed me down on the component design. The site is small enough that Astro's build time is not a bottleneck.

**Styling: Vanilla CSS custom properties**

No framework. No Tailwind. The design system is about 250 lines of CSS variables plus ~600 lines of component styles. The evaluators specifically called out "hundreds of npm dependencies" as a negative signal, and a CSS framework is exactly that. Writing plain CSS also forces me to understand what I'm building rather than assembling utility classes.

**Contact form backend: Cloudflare Worker route + MailChannels**

The `/api/contact` route is a Cloudflare Worker endpoint served from the same project as the static site. MailChannels is free on Cloudflare Workers and doesn't require a separate API key for basic use. Server-side validation mirrors the client-side validation — I never trust client-only checks.

**Tests: Vitest**

Vitest is the standard choice for Astro/Vite projects. Fast, native TypeScript, no config headaches. I test the Worker's validation and rate limiting logic as pure functions — no mocking the HTTP layer.

**CI/CD: GitHub Actions + cloudflare/wrangler-action**

Two workflows: CI on PRs (lint, type-check, test, build), deploy on push to main. Secrets are in GitHub Actions secrets, not in the repo.

---

## Pages shipping in v1

- `/` — Homepage with hero, terminal, project preview, blog preview
- `/about` — Bio, stack, currently-reading
- `/projects` — List of case studies
- `/projects/[slug]` — Individual case study (problem → approach → outcome → lessons)
- `/blog` — List of posts
- `/blog/[slug]` — Individual post
- `/contact` — Contact form with client + server validation
- `/404` — Custom error page
- `/rss.xml` — RSS feed

---

## Explicitly not shipping in v1

- **Search** — Adds complexity (index generation, client-side fuzzy search) that isn't worth it for 2 blog posts and 3 projects. Easy to add in v2.
- **Dark mode auto-generated OG images** — Interesting stretch goal but not core to the spec. Would require a Worker that spins up a headless browser or a canvas renderer — too much for the time budget.
- **Guestbook / visit counter** — D1-backed guestbook is a fun idea but not a required feature. Cut to stay within 10–15 hours.
- **Print stylesheet** — Noted as a stretch goal; not doing it to preserve time for the design and test phases.
- **Comments on blog posts** — Not in spec. Out of scope.

---

## Unknowns and risks

1. **MailChannels free tier** — MailChannels announced restrictions on some Workers plans. If it doesn't work in the free tier, the fallback is Web3Forms or a Resend free-tier key. The Worker handler is abstracted so swapping the email backend is a one-function change.

2. **Lighthouse scores** — The grain texture overlay and web font loading could hurt Performance. Mitigation: `font-display: swap`, self-hosted fonts if needed, and the grain is a lightweight SVG filter not a PNG.

3. **Cloudflare adapter edge cases** — Astro's `hybrid` output mode (static + server) is newer than `server` mode. If there are issues with the Cloudflare adapter and dynamic routes, fallback is switching to full `server` mode.

4. **Time** — The design phase is the most likely to over-run. I'm capping it at 2 hours and shipping wireframes + a documented color system, not pixel-perfect mockups.
