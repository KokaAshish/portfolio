# Rate Limiting

How this project limits request rate per IP, on which routes, and why it's
built the way it is. See [sequence-contact-form.md](./docs/diagrams/sequence-contact-form.md)
and [sequence-chatbot.md](./docs/diagrams/sequence-chatbot.md) for the
numbered request flow through these layers.

## The problem

Two public, unauthenticated endpoints accept POST requests from anyone:
`/api/contact` and `/api/chat`. Both need protection against scripted
abuse — spam floods on the contact form, and runaway API costs on the
chatbot (every message is a billed Anthropic API call).

The original implementation was a single in-memory `Map<ip, count>`. That's
unreliable in a Cloudflare Worker: cold starts happen constantly under real
traffic, and every restart wipes the `Map`, effectively resetting an
attacker's quota. It's kept today only as a last-resort local-dev fallback.

## The two layers

Every rate-limited route checks, **in this order**, stopping at the first
layer that blocks:

### 1. Edge — `RATE_LIMITER` binding

Cloudflare's native Workers Rate Limiting binding, declared in
[wrangler.toml](./wrangler.toml):

```toml
[[unsafe.bindings]]
name = "RATE_LIMITER"
type = "ratelimit"
namespace_id = "1001"

[unsafe.bindings.simple]
limit = 10
period = 60
```

This runs **before any Worker code executes** — the cheapest possible
check, since a blocked request never touches D1, KV, or your validation
logic at all. Each route calls it with its own key so quotas don't
collide:

```ts
await env.RATE_LIMITER.limit({ key: ip });        // contact.ts
await env.RATE_LIMITER.limit({ key: `chat:${ip}` }); // chat.ts
```

### 2. Application — `RATE_LIMIT_KV`

A KV-backed per-IP counter, declared in [wrangler.toml](./wrangler.toml):

```toml
[[kv_namespaces]]
binding = "RATE_LIMIT_KV"
id = "<your namespace id>"
```

Finer-grained and route-specific — unlike the edge layer's single shared
limit, each route can have its own threshold and its own key prefix:

| Route | Key prefix | Limit | Window |
|---|---|---|---|
| `/api/contact` | `ratelimit:contact:<ip>` | 3 requests | 60s |
| `/api/chat` | `ratelimit:chat:<ip>` | 8 requests | 60s |

The contact form is stricter because a submission is a one-shot action; a
chat conversation naturally needs several messages back and forth. Counts
are stored with `expirationTtl` matching the window, so KV self-cleans —
nothing to sweep manually.

Critically, this **persists across Worker cold starts**, unlike the old
in-memory `Map` — a KV read/write survives a restart that would otherwise
silently reset an attacker's quota.

### 3. Fallback — in-memory `Map`

Used only when *neither* binding is configured — local dev (`astro dev`)
and the test suite have no real Cloudflare edge or KV namespace to talk to.
This is the original logic, kept so the app still degrades to "something"
locally instead of throwing or being wide open. It is never used in
production, where both bindings are always configured.

## Where this lives in code

- [src/workers/contact.ts](./src/workers/contact.ts) — `isRateLimited()`
- [src/workers/chat.ts](./src/workers/chat.ts) — `isChatRateLimited()`

Both follow the identical pattern: check `env.RATE_LIMITER` → check
`env.RATE_LIMIT_KV` → fall back to an in-memory `Map`. The logic isn't
shared into a common helper because each route needs its own limit/window
constants and key prefix — three lines of duplication versus a
parameterized abstraction that would need almost as many arguments as the
duplicated code itself.

## Setup (one-time, per Cloudflare account)

```bash
# 1. Create the KV namespace (only needed once; the id goes in wrangler.toml)
npx wrangler kv namespace create RATE_LIMIT_KV

# 2. Paste the printed id into wrangler.toml's [[kv_namespaces]] block
```

The `RATE_LIMITER` edge binding's `namespace_id` (`"1001"` in
`wrangler.toml`) is **not** a Cloudflare resource you create via the
dashboard or API — it's an arbitrary integer you choose yourself to
identify this particular binding. Any unique number works; it doesn't need
to reference anything that already exists.

## Other approaches considered

- **Cloudflare zone-level WAF rate-limiting rules** — the "textbook" edge
  answer, but they require a custom domain sitting on a Cloudflare zone.
  This site is served from `*.workers.dev`, which is Cloudflare's own
  subdomain, not a zone you control — so WAF rules aren't available here.
  The binding-based Rate Limiting API was used instead specifically
  because it attaches to the Worker itself, not a zone.
- **Durable Objects** — would give a perfectly consistent single counter
  per key (no race between two concurrent requests both reading count=2
  and both incrementing to 3), at the cost of provisioning a DO class.
  Not worth it at this traffic volume; KV's eventual consistency is an
  acceptable trade.
- **Turnstile / CAPTCHA** — complementary, not a substitute. It stops
  scripted submissions before they're sent; it doesn't cap raw request
  rate. Worth adding alongside rate limiting later, not instead of it.
- **Third-party services (Upstash Redis, etc.)** — rejected because
  Cloudflare already provides this natively at the edge; an external
  service would add a network hop and another billing dependency for no
  real benefit here.

## What changes at higher traffic

- Durable Objects would become worth the setup cost once KV's eventual
  consistency starts producing visible over-limit slop (a burst of
  concurrent requests all reading the same stale count).
- The edge binding's shared `1001` namespace could be split per-route if
  routes need meaningfully different edge-layer limits, not just different
  KV limits as today.
- A dashboard (e.g. a simple `/api/admin/rate-limit-stats` view backed by
  KV `list()`) would help distinguish "one abusive IP" from "organic
  traffic growth" before tuning the numbers further.
