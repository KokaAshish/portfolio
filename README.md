# Ashish Koka — Portfolio

[![CI](https://github.com/KokaAshish/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/KokaAshish/portfolio/actions/workflows/ci.yml)
[![Deploy](https://github.com/KokaAshish/portfolio/actions/workflows/deploy.yml/badge.svg)](https://github.com/KokaAshish/portfolio/actions/workflows/deploy.yml)

Personal portfolio site built with Astro 5 and deployed on Cloudflare Workers. Includes project case studies, a blog, and a working server-side contact form.

**Live:** https://kokaashish.workers.dev

---

## Stack

| Layer | Choice |
|---|---|
| Framework | Astro 5 |
| Hosting | Cloudflare Workers + Static Assets |
| Styling | Vanilla CSS custom properties |
| Contact form | Cloudflare Workers + MailChannels |
| Tests | Vitest |
| CI/CD | GitHub Actions |

---

## Local setup

**Prerequisites:** Node.js 20+

```bash
# Clone
git clone https://github.com/KokaAshish/portfolio.git
cd portfolio

# Install
npm install

# Start dev server
npm run dev
# Open http://localhost:4321

# Run tests
npm test

# Build
npm run build

# Preview built output (Cloudflare Workers runtime)
npx wrangler dev
# Open http://localhost:8787
```

---

## Project structure

```
src/
├── components/        Navigation.astro, Footer.astro
├── content/
│   ├── blog/          Markdown blog posts
│   └── projects/      Markdown project case studies
├── layouts/           BaseLayout.astro (meta tags, dark mode, skip link)
├── pages/
│   ├── index.astro    Home page with interactive project tiles
│   ├── about.astro
│   ├── contact.astro
│   ├── 404.astro
│   ├── projects/      [slug].astro — project case study pages
│   ├── blog/          [slug].astro — blog post pages
│   ├── api/
│   │   └── contact.ts Worker API route
│   └── rss.xml.ts
├── styles/
│   └── global.css     Design system (tokens, components, utilities)
└── workers/
    └── contact.ts     Contact form handler (rate limiting + MailChannels)

tests/
└── contact.test.ts    Unit tests for contact form logic

.github/
└── workflows/
    ├── ci.yml         Runs on PRs and daily cron
    └── deploy.yml     Runs on push to main
```

---

## CI / CD

### CI workflow (`ci.yml`)

Runs on every **pull request** and on a **daily cron at midnight UTC**.

Steps: Lint → Type-check → Unit tests → Build

### Deploy workflow (`deploy.yml`)

Runs on every **push to `main`**. Lint, tests, and build must all pass before the deploy step runs.

Steps: Lint → Type-check → Unit tests → Build → Deploy to Cloudflare Workers

### One-time secrets setup

Add these two secrets to your GitHub repo under **Settings → Secrets and variables → Actions**:

| Secret | Where to find it |
|---|---|
| `CLOUDFLARE_API_TOKEN` | Cloudflare Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers" |
| `CLOUDFLARE_ACCOUNT_ID` | Cloudflare Dashboard → Workers and Pages → right sidebar |

---

## Adding content

**New blog post** — create `src/content/blog/my-post.md`:

```md
---
title: "Post title"
excerpt: "One sentence summary shown in the blog list."
date: 2025-01-01
category: "Engineering"
tags: ["tag1", "tag2"]
draft: false
---

Post content here...
```

**New project** — create `src/content/projects/my-project.md`:

```md
---
title: "Project title"
summary: "One paragraph summary."
year: 2025
tags: ["Python", "Astro"]
problem: "What problem did this solve?"
outcome: "What was the result?"
lessons: "What would you do differently?"
github: "https://github.com/KokaAshish/repo"
featured: false
---

Full case study content here...
```

---

## Environment variables

| Variable | Required | Description |
|---|---|---|
| `TO_EMAIL` | No | Override the contact form destination email. Defaults to `ashishkoka423@gmail.com`. |

Set in `wrangler.toml` under `[vars]` or in the Cloudflare dashboard under Worker settings.

---

## Contact

- Email: ashishkoka423@gmail.com
- GitHub: [KokaAshish](https://github.com/KokaAshish)
- LinkedIn: [ashishkoka](https://linkedin.com/in/ashishkoka)
