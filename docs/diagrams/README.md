# Diagrams

High-level architecture and sequence diagrams for the portfolio project.
All diagrams are [Mermaid](https://mermaid.js.org/) — they render natively
on GitHub, no extra tooling needed.

| File | Covers |
|---|---|
| [architecture.md](./architecture.md) | System-wide component/architecture diagram — client, Astro Worker, D1, KV, rate limiter, MailChannels, CI/CD |
| [sequence-contact-form.md](./sequence-contact-form.md) | Numbered step-by-step flow of a contact form submission, including both rate-limit layers |
| [sequence-admin-auth.md](./sequence-admin-auth.md) | Numbered step-by-step flow of admin login, authenticated request, and logout (server-side session revocation) |
| [deployment-pipeline.md](./deployment-pipeline.md) | Numbered step-by-step flow of the GitHub Actions → Cloudflare deploy pipeline |

Keep these in sync with the code when the architecture changes — see
[DECISIONS.md](../../DECISIONS.md) for the reasoning behind each choice.
