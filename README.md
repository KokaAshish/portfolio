# Ashish Koka — Portfolio

[![CI](https://github.com/ashishkoka/portfolio/actions/workflows/ci.yml/badge.svg)](https://github.com/ashishkoka/portfolio/actions/workflows/ci.yml)
[![Deploy](https://github.com/ashishkoka/portfolio/actions/workflows/deploy.yml/badge.svg)](https://github.com/ashishkoka/portfolio/actions/workflows/deploy.yml)

Personal portfolio site. Multi-page, dark-mode-capable, with a working contact form, blog, and project case studies. Deployed on Cloudflare Workers.

**Live:** https://ashishkoka.workers.dev

---

## Stack

- **Framework:** Astro 5 (hybrid output mode)
- **Hosting:** Cloudflare Workers + Static Assets
- **Styling:** Vanilla CSS custom properties — no framework
- **Tests:** Vitest
- **CI/CD:** GitHub Actions → `cloudflare/wrangler-action`

See [PLAN.md](./PLAN.md) for stack rationale and [DESIGN.md](./DESIGN.md) for the design system.

---

## Local setup

### Prerequisites

- Node.js 20+
- A Cloudflare account (free tier is enough)

### Steps

```bash
# 1. Clone
git clone https://github.com/ashishkoka/portfolio.git
cd portfolio

# 2. Install
npm install

# 3. Develop
npm run dev
# → http://localhost:4321

# 4. Test
npm test

# 5. Build
npm run build

# 6. Preview (Cloudflare Workers runtime locally)
npm run preview
```

---

## Deploy

All deploys happen through GitHub Actions. **Never deploy from your laptop.**

### One-time setup

1. Get your Cloudflare API token: Dashboard → My Profile → API Tokens → Create Token → "Edit Cloudflare Workers"
2. Get your Account ID: Dashboard → Workers & Pages (right sidebar)
3. Add both to GitHub: Settings → Secrets and variables → Actions:
   - `CLOUDFLARE_API_TOKEN`
   - `CLOUDFLARE_ACCOUNT_ID`
4. Push to `main` — the deploy workflow runs automatically.

### Workflow summary

- **CI** (every PR): lint → type-check → test → build
- **Deploy** (push to `main`): test → build → `wrangler deploy`

---

## Project structure

```
src/
├── components/       # Navigation, Footer
├── content/
│   ├── blog/         # Markdown blog posts
│   └── projects/     # Markdown project case studies
├── layouts/          # BaseLayout (OG tags, dark mode, skip link)
├── pages/
│   ├── index.astro   # Homepage (terminal, SVG animation)
│   ├── about.astro
│   ├── projects/     # [slug].astro
│   ├── blog/         # [slug].astro
│   ├── contact.astro
│   ├── 404.astro
│   ├── api/
│   │   └── contact.ts  # Worker route
│   └── rss.xml.ts
├── styles/
│   └── global.css    # Full design system
└── workers/
    └── contact.ts    # Contact form handler (testable pure module)

tests/
└── contact.test.ts   # Worker unit tests

design/               # Wireframes and design artifacts
```

---

## Environment variables

| Variable      | Required | Description                        |
|---------------|----------|------------------------------------|
| `TO_EMAIL`    | No       | Override destination email address |

Set in `wrangler.toml` under `[vars]` or in Cloudflare dashboard.

---

## Adding content

**New blog post:** Create `src/content/blog/my-post.md` with frontmatter matching the schema in `src/content/config.ts`.

**New project:** Create `src/content/projects/my-project.md` with the required frontmatter fields.

---

## Design

See [DESIGN.md](./DESIGN.md) and the [/design](./design/) folder for wireframes, color system, and typography choices.
