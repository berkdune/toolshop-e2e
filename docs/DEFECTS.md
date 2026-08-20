# Defect Reports

Structured write-ups of the defects found while building and automating the suite.
All were observed on the **public deployment** (`practicesoftwaretesting.com`, frontend v2.4 / API v5.0.0, August 2026) unless noted otherwise.

> A fair caveat: the target is Testsmith's intentional practice application, so some of these behaviors may be seeded on purpose. They are reported here exactly as a QA engineer would report them against a real product.
>
> **Live evidence:** every defect below also exists as a reproduction test in `tests/defects/` that asserts the *correct* behavior — so it fails against today's app. The [live report](https://berkdune.github.io/toolshop-e2e/) is a full run against the public deployment and shows all 8 as red failures (open the *Failed* filter); `npm run test:defects` reproduces them locally.

| ID | Title | Severity | Related tests |
|---|---|---|---|
| [BUG-001](#bug-001--payment-success-message-is-misleading--the-order-is-not-placed) | Payment success message is misleading — the order is not placed | High | TC-052, TC-061, TC-063 |
| [BUG-002](#bug-002--invoice-api-rejects-valid-citycountry-pairs) | Invoice API rejects valid city/country pairs | High | TC-117 |
| [BUG-003](#bug-003--user-typed-house-number-is-wiped-by-the-async-postcode-lookup) | User-typed house number is wiped by the async postcode lookup | Medium | TC-054 |
| [BUG-004](#bug-004--product-edit-form-does-not-prefill-stock-and-dropdowns) | Product edit form does not prefill stock and dropdowns | Medium | TC-085 |
| [BUG-005](#bug-005--forgot-password-confirmation-renders-a-raw-i18n-key) | Forgot-password confirmation renders a raw i18n key | Low | TC-011 |
| [BUG-006](#bug-006--register-api-performs-no-server-side-email-format-validation) | Register API performs no server-side email format validation | Medium | TC-102 |
| [BUG-007](#bug-007--contact-attachments-are-only-accepted-when-the-file-is-empty) | Contact attachments are only accepted when the file is empty | High | TC-080, TC-081 |
| [BUG-008](#bug-008--accessibility-violations-on-core-pages-wcag-aaa) | Accessibility violations on core pages (WCAG A/AA) | High | TC-123–TC-126 |

---

## BUG-001 — Payment success message is misleading — the order is not placed

- **Severity:** High
- **Priority:** High
- **Environment:** practicesoftwaretesting.com v2.4 (prod deployment), checkout flow
- **Preconditions:** Registered customer with a product in the cart, checkout completed up to the Payment step.
- **Steps to reproduce:**
  1. Select "Cash on Delivery" and click **Confirm**.
  2. Observe the message. Do not click anything else.
  3. Open Account → Invoices (or `GET /invoices` with the user's token).
- **Expected result:** After a message that reads "Payment was successful", the order exists — an invoice is created and listed.
- **Actual result:** The first Confirm only calls `POST /payment/check` and shows **"Payment was successful"**; no `POST /invoices` request is made. The order is only placed after clicking **Confirm a second time** (network capture confirms `POST /invoices → 201` on the second click). A user who leaves after the success message has not bought anything, and their invoice list stays empty.
- **Evidence:** Network capture during checkout (first Confirm: `/payment/check` only; second Confirm: `/invoices` 201). See `EXPLORATION.md §7`.
- **Related automated test:** TC-052, TC-061 (both assert the second-phase `POST /invoices → 201`), TC-063.
- **Status:** Open (documented; not reported upstream).

## BUG-002 — Invoice API rejects valid city/country pairs

- **Severity:** High
- **Priority:** Medium
- **Environment:** api.practicesoftwaretesting.com v5.0.0, `POST /invoices`
- **Preconditions:** Authenticated user, cart with one product.
- **Steps to reproduce:**
  1. `POST /invoices` with `billing_city: "Izmir"` (or `"İzmir"`), `billing_country: "TR"`, valid remaining fields.
- **Expected result:** 201 — Izmir is a real Turkish city.
- **Actual result:** 422 — `"The billing_country does not match the entered address. The city does not belong to the selected country."` The app's own TR postcode lookup is inconsistent with the validator as well: `GET /postcode-lookup?country=TR&postcode=35000` (an Izmir postcode) returns the city **"Elazığ"**.
- **Evidence:** API responses for the payloads above; `EXPLORATION.md §7`.
- **Related automated test:** TC-117 (the suite uses the NL address returned by the app's own lookup as a workaround).
- **Status:** Open (documented; not reported upstream).

## BUG-003 — User-typed house number is wiped by the async postcode lookup

- **Severity:** Medium
- **Priority:** Medium
- **Environment:** practicesoftwaretesting.com v2.4, checkout Billing step
- **Preconditions:** Signed-in customer whose profile has no house number; checkout reached the Billing Address step (other fields prefilled).
- **Steps to reproduce:**
  1. Type a house number into the empty field and move focus away.
  2. Watch the field for the next few seconds.
- **Expected result:** The typed value stays; the Proceed button becomes enabled.
- **Actual result:** The postcode-lookup request triggered by completing the address resolves asynchronously and **overwrites the form, clearing the house number the user just typed**. The Proceed button flips back to disabled. Intermittent (depends on lookup latency).
- **Evidence:** Field-state dump captured during automation (value present, then empty with `ng-invalid` after the lookup resolves).
- **Reproduction note:** the trigger is the lookup's latency, so the repro test injects a realistic response delay via route interception, which makes the wipe deterministic against the deployed frontend. The current upstream build does not exhibit the wipe even with the injected delay, so the nightly hermetic run skips this one repro.
- **Related automated test:** TC-054 (verify-and-refill guard with a `bug-candidate` annotation when the wipe occurs).
- **Status:** Open on the deployed v2.4 frontend; fixed in the current upstream build (verified with injected lookup latency, Aug 2026).

## BUG-004 — Product edit form does not prefill stock and dropdowns

- **Severity:** Medium
- **Priority:** Medium
- **Environment:** practicesoftwaretesting.com v2.4, admin panel `/admin/products/edit/{id}`
- **Preconditions:** Admin session; an existing product.
- **Steps to reproduce:**
  1. Open a product's Edit page and wait for it to load (name/description/price prefill).
  2. Change nothing and click **Save**.
- **Expected result:** Saving an untouched product succeeds (or the form loads fully populated).
- **Actual result:** `stock` and the brand/category/image/CO₂ dropdowns are **not prefilled**; the save fails with **"Quantity is required"**. Editing any product forces the admin to re-enter data that already exists.
- **Evidence:** Timed form dumps after load (name/price fill in ~1.5 s; stock and all selects stay empty).
- **Related automated test:** TC-085 (re-enters the missing fields; carries a `bug-candidate` annotation).
- **Status:** Open (documented; not reported upstream).

## BUG-005 — Forgot-password confirmation renders a raw i18n key

- **Severity:** Low
- **Priority:** Medium
- **Environment:** practicesoftwaretesting.com v2.4, `/auth/forgot-password`
- **Preconditions:** None.
- **Steps to reproduce:**
  1. Enter a registered email and submit the form.
- **Expected result:** A human-readable confirmation message.
- **Actual result:** The alert renders the untranslated key **`page.forgot-password.confirm`**.
- **Evidence:** Alert text captured by the automated run.
- **Related automated test:** TC-011 (annotates the raw key when present).
- **Status:** Open (documented; not reported upstream).

## BUG-006 — Register API performs no server-side email format validation

- **Severity:** Medium
- **Priority:** Low
- **Environment:** api.practicesoftwaretesting.com v5.0.0, `POST /users/register`
- **Preconditions:** None.
- **Steps to reproduce:**
  1. `POST /users/register` with `email: "not-an-email"` and other fields missing/invalid.
- **Expected result:** The 422 body flags the malformed email alongside the other field errors.
- **Actual result:** The 422 body contains `first_name`, `last_name` and `password` errors but **no `email` key** — email format is validated client-side only. Any client bypassing the UI can create accounts with malformed emails.
- **Evidence:** 422 response body for the payload above.
- **Related automated test:** TC-102 (asserts the observed contract and annotates the gap).
- **Status:** Open (documented; not reported upstream).

## BUG-007 — Contact attachments are only accepted when the file is empty

- **Severity:** High
- **Priority:** Medium
- **Environment:** practicesoftwaretesting.com v2.4, `/contact`
- **Preconditions:** Contact form filled with valid data.
- **Steps to reproduce:**
  1. Attach a small `.txt` file **with content** and submit.
  2. Repeat with a 0-byte `.txt` file.
- **Expected result:** A normal small text attachment is accepted; an empty file is the one that should arguably be rejected.
- **Actual result:** Any non-empty file is rejected with **"File should be empty."**; only 0-byte files are accepted — which makes the attachment feature useless for its purpose.
- **Evidence:** Validation message captured for `.txt`-with-content and `.pdf` uploads.
- **Related automated test:** TC-080 (empty file accepted), TC-081 (non-empty rejected).
- **Status:** Open (documented; not reported upstream).

## BUG-008 — Accessibility violations on core pages (WCAG A/AA)

- **Severity:** High (one violation is axe-critical)
- **Priority:** Medium
- **Environment:** practicesoftwaretesting.com v2.4; axe-core scan with WCAG 2.0/2.1 A+AA rule sets
- **Preconditions:** None.
- **Steps to reproduce:**
  1. Run an axe scan on `/` and `/auth/login` + `/auth/register`.
- **Expected result:** No serious or critical violations.
- **Actual result:**
  - `button-name` (**critical**): an icon-only button without an accessible name on the auth pages — invisible to screen-reader users.
  - `list` (**serious**): invalid list markup — the home category filter tree nests `<ul>` directly inside `<ul>` (3 nodes), and the password-requirements list contains a non-`<li>` direct child.
- **Evidence:** Full axe JSON attached to each test run (`axe-*.json` report attachments).
- **Related automated test:** TC-123–TC-126 (violations are held in a known-issues list; the tests guard against any new ones).
- **Status:** Open (documented; not reported upstream).
