# Deployment Pipeline

Numbered flow from a merged commit on `main` to a live Cloudflare deployment.

```mermaid
sequenceDiagram
    autonumber
    actor Dev as Developer
    participant GH as GitHub (main)
    participant CI as CI job<br/>(deploy.yml → ci)
    participant Artifact as dist/ artifact
    participant Deploy as Deploy job<br/>(deploy.yml → deploy)
    participant CFAPI as Cloudflare API<br/>(wrangler-action)
    participant Worker as Live Worker<br/>(kokashish.workers.dev)

    Dev->>GH: 1. Merge PR into main
    GH->>CI: 2. Trigger deploy.yml (push to main)
    CI->>CI: 3. npm ci
    CI->>CI: 4. npm run lint
    CI->>CI: 5. npm run check (type-check)
    CI->>CI: 6. npm test
    CI->>CI: 7. npm run build
    alt any check fails
        CI-->>GH: 7a. Workflow fails — deploy job never runs
    else all checks pass
        CI->>Artifact: 8. Upload dist/ (retention: 1 day)
        Artifact-->>Deploy: 9. needs: ci → Deploy job starts
        Deploy->>Artifact: 10. Download dist/
        Deploy->>Deploy: 11. Create .assetsignore (exclude _worker.js from static assets)
        Deploy->>CFAPI: 12. wrangler deploy (authenticated via CLOUDFLARE_API_TOKEN + CLOUDFLARE_ACCOUNT_ID secrets)
        CFAPI->>Worker: 13. Publish new Worker version + bindings (D1, KV, RATE_LIMITER)
        Worker-->>Dev: 14. Live at kokashish.workers.dev
    end
```

## Notes

- **Step 2** — the workflow triggers only on push to `main`; there is no manual `wrangler deploy` from a laptop as the primary path.
- **Steps 3–7** — the same checks required for any PR (`ci.yml`) run again here, so `main` can never deploy a build that hasn't passed lint/type-check/tests.
- **Step 9 (`needs: ci`)** — the deploy job is hard-gated on the CI job succeeding; a failing check stops the deploy entirely.
- **Step 12** — secrets (`CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`) live in GitHub Actions secrets, never in the repo. `ADMIN_PASSWORD` / `TO_EMAIL` are separate Worker secrets set via `npx wrangler secret put`, also never committed.
- **Step 13** — bindings declared in `wrangler.toml` (D1, KV, rate limiter) are published together with the Worker code — no separate manual binding step.
