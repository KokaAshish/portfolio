# TESTING.md

## Automated tests

Tests are in `tests/contact.test.ts` and run with Vitest.

```bash
npm test
```

**What's covered:**
- `validatePayload` — valid payload, missing fields, short/long values, invalid email
- `isRateLimited` — first request allowed, requests up to limit allowed, beyond limit blocked, IPs isolated
- `handleContact` — 405 on GET, 400 on invalid payload, 400 on malformed JSON, correct Content-Type header

Tests run automatically in CI on every pull request (see `.github/workflows/ci.yml`).

---

## Manual test checklist

### Contact form

- [ ] Submit with all empty fields — error messages appear on all three fields
- [ ] Submit with invalid email — email error appears, other fields unaffected
- [ ] Submit with message < 10 chars — message error appears
- [ ] Submit valid form — spinner shows, success message appears, form resets
- [ ] Rapid submit (3 times fast) — 4th submission returns rate limit error

### Dark mode

- [ ] Default theme matches OS preference (`prefers-color-scheme`)
- [ ] Toggle button switches theme immediately
- [ ] Theme persists after page refresh
- [ ] Theme persists after navigating to a different page

### Navigation

- [ ] All nav links route to correct pages
- [ ] Active link is visually marked on each page
- [ ] Mobile hamburger opens and closes the menu
- [ ] Clicking a mobile menu link closes the menu and navigates

### Responsive (tested at 320px, 768px, 1024px, 1440px)

- [ ] 320px: hero text doesn't overflow, terminal is usable
- [ ] 768px: two-column layouts collapse correctly
- [ ] 1024px+: full layout with sidebar on about page
- [ ] Navigation collapses at ≤640px

### Accessibility

- [ ] Skip-to-content link appears on Tab key press
- [ ] All pages navigable with keyboard only (Tab, Enter, arrow keys)
- [ ] Form inputs have visible focus rings
- [ ] All form errors announced by screen reader (tested with VoiceOver on macOS)
- [ ] `aria-live` regions on form feedback announce dynamically

### Content

- [ ] All 3 project case studies link and render correctly
- [ ] Both blog posts render with correct dates and categories
- [ ] RSS feed at `/rss.xml` is valid XML with correct post entries
- [ ] 404 page shows for unknown routes

---

## Accessibility audit

**Tool:** Lighthouse accessibility audit (Chrome DevTools)

**Score at time of submission:** [fill in before submitting]

**axe DevTools findings:** [fill in — list any issues found and whether fixed]

**Keyboard navigation notes:**
Navigated the full site with keyboard only. Tab order is logical: skip link → nav → main content → footer. The terminal input receives focus on `Tab` from the hero CTA buttons. One issue found: the terminal output `aria-live` region announces every line as it's appended, which is correct behavior but verbose with rapid typing. Not a blocker.

**Screen reader test (VoiceOver, 5 minutes):**
[Fill in after testing — what worked, what was confusing, what you didn't have time to fix]

---

## Browsers tested

- Chrome 124 (primary dev browser)
- Firefox 125
- Safari 17 (macOS)
- Safari iOS 17 (iPhone 15 simulator)
- Chrome Android (Samsung Galaxy S23 — manual test on physical device)

---

## Lighthouse scores (mobile)

Tested at: [fill in deployed URL]

| Category       | Score |
|----------------|-------|
| Performance    |       |
| Accessibility  |       |
| Best Practices |       |
| SEO            |       |

Target: ≥ 90 on all four.
