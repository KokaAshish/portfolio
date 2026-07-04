# Sequence — Contact Form Submission

Numbered, end-to-end flow of a single contact form submission, including
both rate-limit layers and the D1-before-email ordering that guarantees a
submission is never lost even if MailChannels fails.

```mermaid
sequenceDiagram
    autonumber
    actor U as User
    participant B as Browser
    participant RL as Edge Rate Limiter<br/>(RATE_LIMITER binding)
    participant W as Astro Worker<br/>(/api/contact)
    participant KV as RATE_LIMIT_KV<br/>(app-layer counter)
    participant D1 as D1<br/>(contact_submissions)
    participant MC as MailChannels API

    U->>B: 1. Fill form, click Send
    B->>B: 2. Client-side validation (required, min/max length)
    B->>RL: 3. POST /api/contact { name, email, message }
    RL->>RL: 4. Check edge-level limit for this IP
    alt limit exceeded
        RL-->>B: 4a. 429 Too Many Requests (blocked before Worker runs)
    else within limit
        RL->>W: 5. forward request
        W->>KV: 6. Check + increment app-layer counter for this IP
        alt over app-layer limit
            KV-->>W: 6a. blocked
            W-->>B: 6b. 429 Too Many Requests
        else allowed
            W->>W: 7. Server-side validation (length, format)
            W->>W: 8. Strip HTML/script tags (stored-XSS defense)
            W->>D1: 9. INSERT INTO contact_submissions
            D1-->>W: 10. row saved (status = 'pending')
            W->>MC: 11. POST /tx/v1/send (email notification)
            MC-->>W: 12. 202 Accepted (best-effort — failure doesn't block)
            W-->>B: 13. 200 { ok: true }
            B-->>U: 14. Show success message
        end
    end
```

## Why this order matters

- **Step 6 before 9** — both rate-limit layers run before any DB write, so an attacker can't exhaust D1 capacity or storage even if the edge layer somehow misses them.
- **Step 9 before 11** — the submission is persisted to D1 *before* the email is attempted. If MailChannels is down or misconfigured, the message is still safely stored and visible in the admin UI — nothing is silently dropped.
- **Step 8 before 9** — sanitization happens before the value is ever written to D1 or handed to the email API, so the sanitized value — not the raw input — is what gets stored and sent.
