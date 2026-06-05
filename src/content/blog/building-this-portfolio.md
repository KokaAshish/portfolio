---
title: "How I Built This Portfolio: Astro, Cloudflare Workers, and What I Learned"
excerpt: "A first-person account of the decisions, trade-offs, and lessons from building a personal portfolio with Astro and Cloudflare Workers — the stack, the pain points, and what I'd change."
date: 2025-06-05
category: "Engineering"
tags: ["astro", "cloudflare", "workers", "portfolio", "css", "typescript"]
draft: false
---

Building a personal portfolio should be simple. It's a few pages, some CSS, maybe a contact form. I made it complicated on purpose — not to over-engineer, but because I wanted every piece of it to be something I could stand behind technically. Here's what I built, why, and what I'd do differently.

## Why Astro?

I'd used React and Vue for projects before, but for a portfolio the trade-off didn't make sense. I wanted:

- **Zero client-side JS by default** — most pages are just content; there's no reason to ship a runtime for that
- **Content collections** — a type-safe way to manage blog posts and project case studies as Markdown files with frontmatter
- **Good output for Cloudflare** — Astro's `@astrojs/cloudflare` adapter makes deploying to Workers straightforward

What convinced me was Astro's "islands" model. The scroll reveal animations and the contact form need JS. The blog post page does not. With Astro, you get JS exactly where you need it and nothing else.

## The Design System

I spent more time on the design than I expected. The dark, terminal-inspired aesthetic wasn't an accident — I wanted something that felt like *my* work, not a template.

The key choices:

- **Color palette:** Near-black background (`#08080f`), soft violet accent (`#7c6af7`), and cyan highlights. The combination reads as technical without being sterile.
- **Typography:** Inter for body copy, JetBrains Mono for labels, code, and the monospace accent elements like section labels. The contrast between the two typefaces does a lot of work.
- **Grain texture overlay:** A subtle SVG noise filter applied as a fixed `::before` pseudo-element at `opacity: 0.6`. It keeps the dark background from feeling flat.
- **Scroll reveal:** A simple `IntersectionObserver` that adds a `visible` class when elements scroll into view, triggering a `translateY` + `opacity` transition. No library needed.

The light mode override surprised me — I almost didn't add it, but having it meant the site was usable for people who don't live in dark mode. The CSS custom properties approach made the toggle trivial: swap `--bg`, `--text`, and `--accent`, and everything inherits correctly.

## Cloudflare Workers for the Contact Form

The contact form was the one part that needed server-side logic. I could have used a third-party form service, but I wanted to understand the stack end-to-end.

The Worker handler (`src/workers/contact.ts`) does three things:

1. **Rate limiting** — a simple in-memory `Map` keyed by the Cloudflare-provided `CF-Connecting-IP` header, allowing 3 submissions per IP per 60 seconds. This resets on Worker restart, which is fine for a personal portfolio.
2. **Server-side validation** — mirrors the client-side checks so a request can't bypass them. Name ≥ 2 characters, valid email format, message between 10 and 2000 characters.
3. **Email via MailChannels** — Cloudflare Workers can use the MailChannels API to send transactional email. One fetch call, no SMTP configuration.

The biggest lesson here: **MailChannels requires domain authentication.** I needed to add a DNS record (`_mailchannels TXT` and DKIM) to prove I own the domain. Without it, emails get silently dropped. This took longer to debug than the actual Worker code.

## The Project Modal

The interactive project tiles were something I wanted to get right. The requirement was: click a tile → see extended details without navigating away.

I used the native `<dialog>` element instead of building a custom modal. The advantages:

- **Focus trapping** — built-in; when the dialog opens, Tab cycles only within it
- **ESC to close** — handled natively by the browser
- **Accessibility** — `aria-modal="true"` and `aria-labelledby` link the dialog to its heading correctly

The data flow is simple: each tile has a `data-project` attribute with the project's JSON-serialized data. On click, the JS reads and parses it, populates the modal's DOM elements, and calls `dialog.showModal()`. No framework state management needed.

## GitHub Actions for CI

Every push to `main` runs:

1. `astro check` — TypeScript type-checking for `.astro` files
2. `vitest run` — unit tests for the contact form validation logic and rate limiter
3. `astro build` — ensures the build doesn't break

There's also a daily cron job at midnight UTC that runs the same test suite. The point isn't to catch bugs that the push-triggered run missed — it's to catch environmental drift. If a dependency releases a breaking change, I want to know before I try to deploy, not when something stops working in production.

## What I'd Change

**The rate limiter.** In-memory rate limiting works for a single Worker instance, but Workers can run across many instances simultaneously. A proper rate limiter would use Cloudflare KV or Durable Objects. For a personal portfolio it doesn't matter, but it's worth noting.

**The build pipeline.** Right now, deployment is manual (`wrangler deploy`). I could wire up automatic deployment on `main` push with Wrangler's GitHub Action. I opted for manual deploy intentionally — I want to review builds before they go out — but the option is there when I want it.

**Image handling.** The portfolio has no project screenshots or photography. Adding them would require an image optimization pipeline (Astro has this built-in), but I didn't want placeholder images. When I have real screenshots worth showing, I'll add them.

## The Honest Part

The things that took the longest weren't the interesting technical decisions. They were:

- Getting the DKIM and SPF records right for MailChannels
- Debugging why the `<dialog>` backdrop wasn't applying in Safari (needed `display: flex` on `dialog[open]`)
- Writing the CSS for the contact form link cards so they look right in both light and dark mode without duplicating values

That's usually how it goes. The architecture decisions are fast. The polish is slow. But the polish is what people actually notice.

---

The source code for this portfolio is available at [github.com/KokaAshish](https://github.com/KokaAshish). If you're building something similar and want to talk through the stack, [reach out](/contact).
