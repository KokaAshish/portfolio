# Sequence — Admin Login, Authenticated Request, Logout

Numbered flow covering the full admin session lifecycle, including the
server-side revocation that a stateless signed-cookie design can't provide.

```mermaid
sequenceDiagram
    autonumber
    actor A as Admin
    participant B as Browser
    participant P as /admin page
    participant Login as /api/admin/login
    participant Sub as /api/admin/submissions
    participant Logout as /api/admin/logout
    participant D1 as D1<br/>(admin_sessions)

    A->>B: 1. Navigate to /admin
    B->>P: 2. GET /admin (no session cookie yet)
    P-->>B: 3. Render login form

    A->>B: 4. Enter username + password, submit
    B->>Login: 5. POST { username, password }
    Login->>Login: 6. verifyCredentials (constant-time compare)
    alt invalid credentials
        Login-->>B: 6a. 401 + 500ms brute-force delay
    else valid
        Login->>D1: 7. DELETE expired sessions (opportunistic cleanup)
        Login->>D1: 8. INSERT new session row (id, ip, user_agent, expires_at)
        D1-->>Login: 9. session id confirmed
        Login-->>B: 10. Set-Cookie admin_session=<id>; HttpOnly; Secure; SameSite=Strict
    end

    B->>P: 11. Reload /admin with session cookie
    P->>D1: 12. SELECT session WHERE id = ? AND expires_at > now()
    D1-->>P: 13. session valid
    P->>Sub: 14. GET /api/admin/submissions?page=1
    Sub->>D1: 15. SELECT * FROM contact_submissions
    D1-->>Sub: 16. rows
    Sub-->>P: 17. render submissions table

    A->>B: 18. Click "Log out"
    B->>Logout: 19. POST /api/admin/logout (with session cookie)
    Logout->>D1: 20. DELETE FROM admin_sessions WHERE id = ?
    D1-->>Logout: 21. row deleted
    Logout-->>B: 22. Set-Cookie admin_session=; Max-Age=0 (cleared)

    Note over B,D1: 23. Even if the old cookie value is replayed after this point,<br/>step 12's lookup finds no row → request is rejected.
```

## Why sessions are DB-backed, not signed cookies

The previous design used a stateless HMAC-signed cookie: the token itself
carried its expiry, and logout could only ask the browser to forget it —
a captured or replayed cookie stayed valid until the 24h expiry regardless.
Step 20 above is the fix: logout deletes the *server-side* row, so a
replayed cookie fails the lookup in step 12 immediately, not eventually.
