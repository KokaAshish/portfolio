# Sequence — Portfolio Chatbot

Numbered flow for a single chat message, including the input-side injection
filter, both rate-limit layers, and the output-side leak filter.

```mermaid
sequenceDiagram
    autonumber
    actor V as Visitor
    participant W as ChatWidget<br/>(browser)
    participant RL as Edge Rate Limiter<br/>(RATE_LIMITER binding)
    participant API as /api/chat<br/>(Astro Worker)
    participant KV as RATE_LIMIT_KV<br/>(app-layer counter)
    participant Data as about-me.ts<br/>(grounding data)
    participant Claude as Anthropic API<br/>(claude-haiku-4-5)

    V->>W: 1. Open chat bubble, type a question
    W->>RL: 2. POST /api/chat { message, history }
    RL->>RL: 3. Check edge-level limit for "chat:<ip>"
    alt limit exceeded
        RL-->>W: 3a. 429 Too many messages
    else within limit
        RL->>API: 4. forward request
        API->>KV: 5. Check + increment app-layer counter
        alt over app-layer limit
            KV-->>API: 5a. blocked
            API-->>W: 5b. 429 Too many messages
        else allowed
            API->>API: 6. Validate + trim message, cap history to last 8
            API->>API: 7. Check message against injection patterns
            alt looks like a jailbreak attempt
                API-->>W: 7a. 200 canned refusal (model never called)
            else looks like a normal question
                API->>Data: 8. buildSystemPrompt() — render grounding facts
                API->>Claude: 9. POST /v1/messages (system + history + message)
                Claude-->>API: 10. full reply text (non-streaming)
                API->>API: 11. Scan reply for leaked prompt/secret markers
                alt leak detected
                    API-->>W: 11a. safe refusal text instead
                else clean
                    API-->>W: 11b. 200 { ok: true, reply }
                end
                W-->>V: 12. Render assistant bubble
            end
        end
    end
```

## Why the order matters

- **Steps 3 → 5 before 6** — both rate-limit layers run before any input
  validation or model call, so an attacker can't run up API costs even by
  sending malformed requests.
- **Step 7 before 9** — the injection pre-filter runs *before* the Anthropic
  call, not after. A caught attempt costs nothing and never reaches the
  model.
- **Step 11 before 11b** — the full reply is inspected before it's ever
  sent to the browser, which is only possible because the response is
  buffered rather than streamed token-by-token. See the "Non-streaming, on
  purpose" note in [DECISIONS.md](../../DECISIONS.md).
