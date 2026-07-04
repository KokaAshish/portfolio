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

**Update:** originally shipped as stateless HMAC-SHA256 signed cookies (see
history below); replaced with **D1-backed server-side sessions** because a
stateless token can't be revoked — logout could only ask the browser to
forget the cookie, while a captured/replayed token stayed valid until its
24h expiry regardless.

**Current design — `admin_sessions` table in D1:**
The cookie carries only a random `crypto.randomUUID()` session id. Login
inserts a row (`id`, `ip`, `user_agent`, `expires_at`); every admin request
does `SELECT ... WHERE id = ? AND expires_at > now()`; logout does
`DELETE FROM admin_sessions WHERE id = ?`. See
[sequence-admin-auth.md](./docs/diagrams/sequence-admin-auth.md) for the
full numbered flow, and [DATA-MODEL.md](./DATA-MODEL.md) for the schema.

**Why this is worth the extra D1 round-trip:**
The admin surface is small (one page, a handful of requests per session),
so the added D1 lookup per request is negligible. In exchange, logout is a
real revocation, and a compromised cookie can be invalidated at any time by
deleting its row — properties a stateless signed cookie cannot offer no
matter how it's signed.

**Original (superseded) design — for history:**
Stateless HMAC-SHA256 signed cookies: `base64(JSON({exp})).base64(HMAC-SHA256(ADMIN_SECRET, base64(JSON({exp}))))`.
Rejected in favor of the above once "logout doesn't actually revoke
anything" was flagged as a real security gap rather than an acceptable
trade-off.

**Security properties (still true):**
- `HttpOnly; Secure; SameSite=Strict` — cookie cannot be read by JS or sent cross-origin
- Session id is a cryptographically random UUID — unguessable
- Constant-time password comparison — prevents timing attacks on the login endpoint

**What I'd change at 10,000 users:**
A single shared admin password doesn't scale. I'd switch to per-user credentials in D1, and add a scheduled cron (rather than login-time cleanup) to sweep expired sessions.

## Extension 1 — Rate limiting: two layers, not one

The original `isRateLimited` was a single in-memory `Map`, which resets on
every Worker cold start — under real traffic patterns that's frequently,
so the limit was more theoretical than real.

**Layer 1 — edge (`RATE_LIMITER` binding):** Cloudflare's native Workers
Rate Limiting binding, configured in `wrangler.toml`. Runs before any
Worker code executes, so abusive IPs are rejected at the edge — cheapest
possible layer, coarse-grained (shared across all routes using it).

**Layer 2 — application (`RATE_LIMIT_KV`):** a KV-backed per-IP counter,
scoped per-route (`ratelimit:contact:<ip>`), with a TTL matching the
rate-limit window. Persists across cold starts, unlike the old in-memory
Map, and lets the contact form have a stricter limit than a hypothetical
read-only endpoint.

**Why keep the in-memory fallback?** Local dev (`astro dev`, and CI) has
neither binding configured. Rather than fail closed or open entirely, the
code checks bindings in order (edge → KV → in-memory) so the form still
degrades gracefully without extra local setup. See
[sequence-contact-form.md](./docs/diagrams/sequence-contact-form.md).

**Other approaches considered:**
- **Cloudflare zone-level WAF rate-limiting rules** — dashboard/API-configured, but require a custom domain on a Cloudflare zone; `kokashish.workers.dev` is a `workers.dev` subdomain, not a zone, so this wasn't available.
- **Durable Objects** — gives a single strongly-consistent counter per key (no eventual-consistency race between concurrent requests), at the cost of provisioning a DO class for something KV already handles well enough at this traffic volume.
- **Turnstile/CAPTCHA** — complementary, not a replacement: stops scripted abuse before submission rather than throttling request rate. Worth adding alongside rate limiting, not instead of it.
- **Third-party services (Upstash Redis, etc.)** — adds an external dependency and network hop for something Cloudflare already provides natively at the edge.

## Extension 1 — Feature choice: contact form submissions

I chose to persist contact form submissions over a guestbook or comments because:
1. The contact form already exists — this extends it rather than duplicating it
2. It solves a real problem: currently submissions arrive only by email, which is lossy (spam filters, no history)
3. The admin moderation workflow (pending → reviewed → archived) is more realistic than a guestbook

## What's next (v2)

- Self-hosted fonts to eliminate the Google Fonts request and improve Privacy score
- Auto-generated OG images per blog post (once there are enough posts to justify it)
- Search across blog posts and projects