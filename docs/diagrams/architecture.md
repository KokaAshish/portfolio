# Architecture

High-level component view of the whole system: client, edge/Worker runtime,
storage, external services, and the deploy pipeline that ships it all.

```mermaid
flowchart TB
    subgraph Client["1 · Client"]
        Browser["Browser\n(desktop / mobile / tablet)"]
    end

    subgraph Edge["2 · Cloudflare Edge"]
        RL["2a · Rate Limiting binding\n(RATE_LIMITER — edge layer)"]
        Worker["2b · Astro SSR Worker\n(kokashish.workers.dev)"]
    end

    subgraph Routes["3 · Astro API Routes"]
        Contact["/api/contact"]
        Login["/api/admin/login"]
        Logout["/api/admin/logout"]
        Submissions["/api/admin/submissions"]
    end

    subgraph Storage["4 · Cloudflare Storage"]
        D1[("4a · D1 Database\ncontact_submissions\nadmin_sessions")]
        KV[("4b · KV Namespace\nRATE_LIMIT_KV\n(app-layer counters)")]
    end

    subgraph External["5 · External Services"]
        MailChannels["5a · MailChannels API\n(transactional email)"]
    end

    subgraph CICD["6 · CI/CD"]
        GHA["6a · GitHub Actions\nci.yml + deploy.yml"]
        CFAPI["6b · Cloudflare API\n(wrangler-action deploy)"]
    end

    Browser -- "1. HTTPS request" --> RL
    RL -- "2. allowed" --> Worker
    RL -. "2. blocked (429)" .-> Browser
    Worker -- "3. routes to" --> Routes

    Contact -- "4. save submission" --> D1
    Contact -- "5. per-IP counter" --> KV
    Contact -- "6. send email" --> MailChannels

    Login -- "7. create session row" --> D1
    Logout -- "8. delete session row" --> D1
    Submissions -- "9. read sessions + submissions" --> D1

    GHA -- "10. build + test" --> GHA
    GHA -- "11. deploy via API" --> CFAPI
    CFAPI -- "12. publish" --> Worker

    style Client fill:#1e1e2e,color:#fff,stroke:#7c6af7
    style Edge fill:#16213e,color:#fff,stroke:#7c6af7
    style Routes fill:#0f3460,color:#fff,stroke:#7c6af7
    style Storage fill:#22223b,color:#fff,stroke:#28c840
    style External fill:#3d1f1f,color:#fff,stroke:#f0b429
    style CICD fill:#1a1a2e,color:#fff,stroke:#6b6880
```

## Component notes

1. **Client** — plain Astro-rendered pages, no client-side framework runtime; a few `<script>` islands for form handling, dark-mode toggle, and admin UI interactivity.
2. **Edge — Rate Limiting binding** — Cloudflare's native `RATE_LIMITER` binding evaluates *before* Worker code runs. First line of defense against abusive IPs. See [sequence-contact-form.md](./sequence-contact-form.md).
3. **Astro SSR Worker** — all rendering and API routes execute in a single Cloudflare Worker (`@astrojs/cloudflare` adapter), deployed as `dist/_worker.js`.
4. **D1** — single SQLite-compatible database with two tables: `contact_submissions` (public form data) and `admin_sessions` (server-side session store, added to make logout an actual revocation instead of a client-side cookie clear).
5. **KV — RATE_LIMIT_KV** — app-layer rate-limit counters, keyed per IP per route. Persists across Worker cold starts, unlike an in-memory `Map`.
6. **MailChannels** — outbound-only integration; contact form emails are sent here *after* the D1 write succeeds, so a submission is never lost even if email delivery fails.
7. **GitHub Actions** — `ci.yml` runs on every PR + daily cron; `deploy.yml` runs on push to `main`, gated behind the same CI checks (`needs: ci`).
8. **Cloudflare API** — the deploy job authenticates with `CLOUDFLARE_API_TOKEN`/`CLOUDFLARE_ACCOUNT_ID` (GitHub Secrets) and publishes via `cloudflare/wrangler-action`. See [deployment-pipeline.md](./deployment-pipeline.md).
