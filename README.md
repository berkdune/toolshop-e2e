# Toolshop E2E — Playwright Test Automation

[![E2E Tests](https://github.com/berkdune/toolshop-e2e/actions/workflows/e2e.yml/badge.svg)](https://github.com/berkdune/toolshop-e2e/actions/workflows/e2e.yml)
[![Nightly report](https://img.shields.io/badge/nightly%20report-GitHub%20Pages-blue)](https://berkdune.github.io/toolshop-e2e/)

End-to-end **UI + API** test automation for [practicesoftwaretesting.com](https://practicesoftwaretesting.com) (Toolshop, a public e-commerce demo), built with **Playwright + TypeScript**.

The project follows a test-case-first QA workflow: the application was explored first, a **128-case manual test suite** was written in Xray-importable CSV format, and then **all 128 cases were automated** — with full traceability between the two.

```
128 test cases  →  128 automated tests (103 UI + 25 API)  →  full suite in ~4 minutes
```

## Highlights

- **Case-first design with traceability** — every automated test carries its `TC-xxx` id in the title; [`docs/TRACEABILITY.md`](docs/TRACEABILITY.md) is generated from the specs by `npm run cases:lint`, mapping all 128 cases to their spec files.
- **Hybrid UI + API strategy** — critical journeys are exercised through the UI; test data (users, carts, orders) is provisioned and cleaned up through the REST API. Login uses token injection instead of repeated UI sign-ins.
- **Real findings** — automating the suite surfaced genuine defects in the target app (see below), each annotated in the corresponding test.
- **Built for a hostile environment** — the target is a *shared, hourly-reset* public demo. The suite survives concurrent strangers, vanishing stock, and mid-run database resets.

## Bugs & quirks found while automating

| Finding | Where |
|---|---|
| Order flow is silently two-phase: the "Payment was successful" message only confirms the payment check — without a **second Confirm click no order/invoice is ever created** | `checkout.spec.ts` |
| Invoice API rejects real city/country pairs (`Izmir` + `TR` → 422 *"city does not belong to the selected country"*); the app's own TR postcode lookup returns mismatched data | `EXPLORATION.md §7` |
| A user-typed `house_number` gets **wiped by the async postcode lookup** on the billing form | TC-054 |
| Product **edit** form doesn't prefill stock/dropdowns — saving an untouched product fails with *"Quantity is required"* | TC-085 |
| Forgot-password confirmation renders a **raw i18n key** (`page.forgot-password.confirm`) | TC-011 |
| Register API performs no server-side **email format** validation (client-side only) | TC-102 |
| Contact attachments are only accepted when the file is **empty (0 bytes)** ("File should be empty.") | TC-080/081 |
| Accessibility (axe, WCAG A/AA): icon-only button without an accessible name (**critical**) on auth pages; invalid list markup on the home filters and password-requirements list (**serious**) | TC-123–126 |

Every finding is written up as a full defect report (severity, repro steps, evidence, linked tests) in [`docs/DEFECTS.md`](docs/DEFECTS.md).

**Want to watch them fail?** Each defect is also encoded as a reproduction test that asserts the behavior the app *should* have — so the suite is red by design: run `npm run test:defects` against the public deployment (all 8 fail), or open the nightly [live defect report](https://berkdune.github.io/toolshop-e2e/defects/) from the hermetic CI build — where a repro that passes is a signal of its own (timing-dependent bugs like BUG-003 don't manifest against a localhost lookup). The gating suite stays green; the red suite is the evidence.

## Quick start

```bash
npm ci
npx playwright install chromium
npm test               # full suite (~4 min)
```

| Script | What it does |
|---|---|
| `npm test` | Full suite: UI (chromium) + API projects |
| `npm run test:smoke` | 14 critical-path smoke tests (~20 s) |
| `npm run test:ui` / `test:api` | One project only |
| `npm run test:defects` | Defect-reproduction suite — **fails by design**, one red test per documented bug |
| `npm run cases:lint` | Validates the 128-case CSV suite and regenerates `TRACEABILITY.md` |
| `npm run report` | Opens the last HTML report |

No configuration needed — defaults target the public demo. Override via `.env` (see `.env.example`).

## Architecture

```
├── docs/
│   ├── TEST_PLAN.md          # strategy, scope, phases (Turkish)
│   ├── EXPLORATION.md        # reconnaissance notes & findings (Turkish)
│   ├── TRACEABILITY.md       # generated: TC ↔ spec mapping
│   └── cases/                # 128 manual cases, Xray-importable CSV (English)
├── src/
│   ├── pages/                # Page Objects (data-test–first selectors)
│   ├── fixtures/fixtures.ts  # testUser (API-provisioned + auto-cleanup), stockProduct, api
│   ├── api/api-client.ts     # register/login, carts, invoices, admin helpers, cleanup
│   └── utils/                # data factory, session injection, money parsing
├── tests/
│   ├── ui/                   # 103 UI tests across 9 modules (incl. axe a11y + visual examples)
│   ├── api/                  # 25 API contract tests
│   └── defects/              # 8 red-by-design defect reproductions (BUG-001..008)
└── .github/workflows/e2e.yml # smoke on push · full nightly + report to Pages
```

## Surviving a shared demo environment

| Environment reality | Countermeasure |
|---|---|
| Database resets **every hour on the hour** | `retries: 1` re-creates per-test state after a reset; nightly cron runs at `:25` |
| Other visitors (and this suite) **drain product stock** | `stockProduct` fixture picks an in-stock product dynamically via the API |
| Product/category IDs change on every reset | Navigation is always search-based, never hardcoded IDs |
| Login endpoint locks accounts after 4 failed attempts | Every test gets its own fresh API-provisioned user; polling with wrong credentials is avoided by design |
| Angular forms reset when late data arrives; in-flight requests die on navigation | "Form is populated" anchors before typing; `submitAndWait()` blocks until the API responds |
| Password policy rejects breached passwords (HIBP-style) | Random, class-complete generated passwords |

## CI — hermetic by design

The public demo sits behind **Cloudflare bot protection** that serves an interactive "verify you are human" challenge to datacenter IPs — so browser tests cannot (and should not try to) run against it from GitHub-hosted runners. Instead, CI is **hermetic**: the workflow boots the application under test inside the runner using the upstream project's prebuilt Docker images, seeds the database, and runs the suite against `localhost`. This also removes the shared-demo variables (hourly resets, strangers draining stock) from CI entirely.

- **Push / PR** → app boots in Docker → smoke suite on chromium.
- **Nightly (01:25 UTC) / manual** → full run (visual tests excluded — their baselines are platform-specific and maintained locally); the HTML report (with traces for failures) is published to [GitHub Pages](https://berkdune.github.io/toolshop-e2e/).
- **Local runs** target the public demo by default (that's where the shared-environment countermeasures above earn their keep); point `BASE_URL`/`API_URL` at a local Docker instance to run hermetically.

## Development notes

Built with AI-assisted tooling (Claude Code). The test strategy, case design, prioritization and engineering decisions are the author's, and every finding above was verified against the live application.

## License

[MIT](LICENSE) — the target application is the open [practice-software-testing](https://github.com/testsmith-io/practice-software-testing) demo by Testsmith, used here for testing practice as intended.
