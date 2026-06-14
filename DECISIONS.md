# DECISIONS.md

~500 words on the decisions that shaped this project.

---

## What I cut and why

The spec lists several stretch goals. I cut all of them deliberately, not because they sounded hard, but because adding them would have thinned out the core work.

Auto-generated OG images are interesting but would have required either a headless browser in a Worker (fragile) or a canvas-based renderer (more JS than the entire rest of the site). Not worth it for a site with 2 blog posts. When the blog has 20 posts, this becomes worth building.

The guestbook and visit counter with D1 would have been fun to wire up. I skipped them because the contact form already demonstrates I can build a form-to-storage pipeline. A second form that does roughly the same thing doesn't add signal for an evaluator — it just adds surface area to maintain.

The print stylesheet fell off the list in hour 8 when I realized I'd underestimated the blog post page styling. I made the call to drop it and invest that hour in the case study write-ups instead. The write-ups are higher signal than a print stylesheet no one will trigger.

---

## What I did differently than planned

The original plan had a sidebar navigation on the project case study pages. I dropped it after building the first case study — the sidebar created visual competition with the TL;DR cards, and the content didn't warrant it at v1 scale. Three pages don't need a sidebar to navigate.

I also planned to use Web3Forms as a fallback if MailChannels caused trouble. I ended up not needing it, but I kept the abstraction in `src/workers/contact.ts` — the email sending is one function that could be swapped with two lines changed.

---

## AI usage

I used Claude to help with this project in three specific areas:

1. **Scaffolding** — I used Claude to generate the initial Astro + Cloudflare Workers project structure, the CSS design system skeleton, and the GitHub Actions workflow files. These are configuration-heavy tasks where the main risk is typos and outdated API usage, not judgment. I reviewed all of it and changed roughly 20% of it.

2. **Debugging** — When the Cloudflare adapter threw a build error related to `output: 'hybrid'` and the contact API route, I used Claude to diagnose the issue. The fix was adding `export const prerender = false` to the API route — something I would have eventually found in the docs but Claude found in 30 seconds.

3. **Prose editing** — I asked Claude to review the case study write-ups for clarity. It suggested cuts in two places where I'd buried the outcome. I accepted both suggestions.

The About page content, the case study narratives (project descriptions, problem statements, lessons), and this document reflect my actual work and experience. The technical opinions in the blog posts reflect things I've genuinely encountered — not AI-generated filler.

---

## What I'd do differently with more time

The terminal command set is thin. Right now it has 5 commands. With more time I'd add a few that reveal personality — maybe `whoami`, a fake `man ashish` page, or an easter egg. The terminal is the most distinctive part of the homepage and it deserves more investment.

The mobile experience at 320px is functional but not great. The hero title wraps awkwardly at exactly 320px. I'd spend another hour on the responsive fine-tuning.

---

## Extension 1 — Auth mechanism decision

I chose **stateless HMAC-SHA256 signed cookies** over sessions or JWTs.

**Why not a session table in D1?**
Workers are stateless — in-memory session maps reset on every cold start. A D1 session table would work, but it adds a round-trip to D1 on every admin request. For a single-admin portfolio, the extra complexity isn't justified.

**Why not a JWT library?**
The Web Crypto API (`crypto.subtle`) is available natively in Workers. A JWT library would add a dependency to solve a problem I can solve in 40 lines. I implemented the same primitives: HMAC-SHA256 signing, base64 encoding, expiry in the payload.

**Token format:**
```
base64(JSON({exp})).base64(HMAC-SHA256(ADMIN_SECRET, base64(JSON({exp}))))
```

**Security properties:**
- `HttpOnly; Secure; SameSite=Strict` — cookie cannot be read by JS or sent cross-origin
- HMAC signature — unforgeable without `ADMIN_SECRET`
- 24-hour expiry in payload — no server-side revocation needed for a personal portfolio
- Constant-time password comparison — prevents timing attacks on the login endpoint

**What I'd change at 10,000 users:**
A single shared admin password doesn't scale. I'd switch to per-user credentials in D1, proper JWT (RS256 with key rotation), and session revocation via a blocklist in KV.

## Extension 1 — Feature choice: contact form submissions

I chose to persist contact form submissions over a guestbook or comments because:
1. The contact form already exists — this extends it rather than duplicating it
2. It solves a real problem: currently submissions arrive only by email, which is lossy (spam filters, no history)
3. The admin moderation workflow (pending → reviewed → archived) is more realistic than a guestbook

## What's next (v2)

- Self-hosted fonts to eliminate the Google Fonts request and improve Privacy score
- Auto-generated OG images per blog post (once there are enough posts to justify it)
- Search across blog posts and projects