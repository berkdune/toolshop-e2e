# Traceability Matrisi — TC ↔ Otomasyon

> Bu dosya `node scripts/validate-cases.js` ile üretilir; Otomasyon kolonu tests/ altındaki spec'lerden otomatik taranır.
> Toplam: **128 case** · Smoke: **14** · Otomatize: **128** · Kaynak: docs/cases/*.csv

## Auth (`auth.csv`, 15 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-001 | Login - Customer logs in with valid credentials | Highest | Smoke, UI, Positive | 2 | ✅ tests/ui/auth.spec.ts |
| TC-002 | Login - Error is shown for wrong password | High | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-003 | Login - Unregistered email shows the same generic error | Medium | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-004 | Login - Empty form shows required-field validations | Medium | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-005 | Login - Invalid email format is rejected | Medium | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-006 | Login - Account locks after repeated failed attempts | High | Regression, UI, Edge | 3 | ✅ tests/ui/auth.spec.ts |
| TC-007 | Register - New customer registers with valid data | Highest | Smoke, UI, Positive | 3 | ✅ tests/ui/auth.spec.ts |
| TC-008 | Register - Empty form shows a validation per required field | High | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-009 | Register - Duplicate email is rejected | Medium | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-010 | Register - Breached password is rejected by the password policy | High | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-011 | Forgot Password - Registered email gets a confirmation | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/auth.spec.ts |
| TC-012 | Logout - Customer signs out and loses access to protected pages | High | Regression, UI, Positive | 3 | ✅ tests/ui/auth.spec.ts |
| TC-013 | Authorization - Guest is redirected to login on protected pages | High | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-014 | Authorization - Customer cannot access admin pages | High | Regression, UI, Negative | 2 | ✅ tests/ui/auth.spec.ts |
| TC-015 | Login - Admin logs in and lands on the admin dashboard | Highest | Smoke, UI, Positive | 2 | ✅ tests/ui/auth.spec.ts |

## Product Discovery (`product_discovery.csv`, 18 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-016 | Listing - Home page shows the product grid with core information | Highest | Smoke, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-017 | Search - Search returns products matching the term | Highest | Smoke, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-018 | Search - No results state for an unmatched term | High | Regression, UI, Negative | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-019 | Search - Reset clears the search and restores the full listing | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-020 | Filters - Single category filter narrows the listing | High | Regression, UI, Positive | 3 | ✅ tests/ui/product-discovery.spec.ts |
| TC-021 | Filters - Multiple category filters combine results | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-022 | Filters - Brand filter shows only that brand's products | High | Regression, UI, Positive | 3 | ✅ tests/ui/product-discovery.spec.ts |
| TC-023 | Filters - Price range slider limits results | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-024 | Filters - Eco-friendly filter shows only sustainable products | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-025 | Sorting - Price low to high orders the grid by ascending price | High | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-026 | Sorting - Name Z to A orders the grid alphabetically descending | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-027 | Sorting - CO2 rating orders by sustainability | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-028 | Pagination - Page links navigate through the catalog | High | Regression, UI, Positive | 3 | ✅ tests/ui/product-discovery.spec.ts |
| TC-029 | Search - Sorting applies within search results | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-030 | Listing - Out-of-stock products are labeled on the grid | High | Regression, UI, Positive | 2 | ✅ tests/ui/product-discovery.spec.ts |
| TC-031 | Localization - Language switch changes the UI language | Medium | Regression, UI, Positive | 3 | ✅ tests/ui/product-discovery.spec.ts |
| TC-032 | Compare - Two products can be compared side by side | Medium | Regression, UI, Positive | 3 | ✅ tests/ui/product-discovery.spec.ts |
| TC-033 | Navigation - Category menu opens a pre-filtered listing | Low | Regression, UI, Positive | 1 | ✅ tests/ui/product-discovery.spec.ts |

## Product Detail (`product_detail.csv`, 10 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-034 | Content - Product page displays complete information | Highest | Smoke, UI, Positive | 2 | ✅ tests/ui/product-detail.spec.ts |
| TC-035 | Cart - Add to cart updates the cart badge | Highest | Smoke, UI, Positive | 2 | ✅ tests/ui/product-detail.spec.ts |
| TC-036 | Quantity - Stepper changes quantity within valid bounds | High | Regression, UI, Positive | 4 | ✅ tests/ui/product-detail.spec.ts |
| TC-037 | Cart - Selected quantity is carried into the cart line | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-detail.spec.ts |
| TC-038 | Favorites - Guest cannot add favorites | High | Regression, UI, Negative | 2 | ✅ tests/ui/product-detail.spec.ts |
| TC-039 | Favorites - Logged-in customer adds a product to favorites | High | Regression, UI, Positive | 3 | ✅ tests/ui/product-detail.spec.ts |
| TC-040 | Stock - Out-of-stock product cannot be added to the cart | High | Regression, UI, Negative | 1 | ✅ tests/ui/product-detail.spec.ts |
| TC-041 | Content - Specification rows show name value and unit | Medium | Regression, UI, Positive | 1 | ✅ tests/ui/product-detail.spec.ts |
| TC-042 | Navigation - Related products open their own detail pages | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-detail.spec.ts |
| TC-043 | Rentals - Rental product page shows rental-specific presentation | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/product-detail.spec.ts |

## Cart (`cart.csv`, 8 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-044 | Content - Cart shows the added product with correct amounts | Highest | Smoke, UI, Positive | 2 | ✅ tests/ui/cart.spec.ts |
| TC-045 | Update - Changing quantity recalculates line price and total | High | Regression, UI, Positive | 2 | ✅ tests/ui/cart.spec.ts |
| TC-046 | Remove - Product can be removed from the cart | High | Regression, UI, Positive | 2 | ✅ tests/ui/cart.spec.ts |
| TC-047 | Content - Multiple products appear as separate lines | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/cart.spec.ts |
| TC-048 | Update - Adding the same product again increases its quantity | Medium | Regression, UI, Edge | 2 | ✅ tests/ui/cart.spec.ts |
| TC-049 | Persistence - Cart is kept across navigation and page refresh | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/cart.spec.ts |
| TC-050 | Navigation - Continue shopping returns to the catalog and keeps the cart | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/cart.spec.ts |
| TC-051 | Empty - Checkout cannot proceed with an empty cart | High | Regression, UI, Negative | 1 | ✅ tests/ui/cart.spec.ts |

## Checkout (`checkout.csv`, 15 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-052 | Order - Registered customer completes an order with Cash on Delivery | Highest | Smoke, UI, Positive | 6 | ✅ tests/ui/checkout.spec.ts |
| TC-053 | Billing - Address fields are prefilled from the profile | High | Regression, UI, Positive | 1 | ✅ tests/ui/checkout.spec.ts |
| TC-054 | Billing - Proceed stays disabled until the billing form is complete | High | Regression, UI, Negative | 3 | ✅ tests/ui/checkout.spec.ts |
| TC-055 | Payment - Bank Transfer requires bank fields and completes | High | Regression, UI, Positive | 3 | ✅ tests/ui/checkout.spec.ts |
| TC-056 | Payment - Credit Card completes with valid data | High | Regression, UI, Positive | 3 | ✅ tests/ui/checkout.spec.ts |
| TC-057 | Payment - Credit Card rejects invalid inputs | High | Regression, UI, Negative | 3 | ✅ tests/ui/checkout.spec.ts |
| TC-058 | Payment - Buy Now Pay Later with a selected installment plan | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/checkout.spec.ts |
| TC-059 | Payment - Gift Card completes with card number and validation code | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/checkout.spec.ts |
| TC-060 | Payment - Confirm requires a payment method | High | Regression, UI, Negative | 2 | ✅ tests/ui/checkout.spec.ts |
| TC-061 | Guest - Guest completes checkout without an account | Highest | Smoke, UI, Positive | 5 | ✅ tests/ui/checkout.spec.ts |
| TC-062 | Billing - Postcode lookup fills the address automatically | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/checkout.spec.ts |
| TC-063 | Order - Completed order appears in the customer's invoices | High | Regression, UI, Positive | 2 | ✅ tests/ui/checkout.spec.ts |
| TC-064 | Wizard - Returning to the cart step keeps and updates the order data | Medium | Regression, UI, Positive | 3 | ✅ tests/ui/checkout.spec.ts |
| TC-065 | Session - Cart is kept after signing in during checkout | Medium | Regression, UI, Edge | 2 | ✅ tests/ui/checkout.spec.ts |
| TC-066 | Wizard - Steps must be completed in order | Medium | Regression, UI, Negative | 2 | ✅ tests/ui/checkout.spec.ts |

## Account (`account.csv`, 10 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-067 | Overview - Account page shows section navigation | High | Regression, UI, Positive | 1 | ✅ tests/ui/account.spec.ts |
| TC-068 | Profile - Updating profile fields persists | High | Regression, UI, Positive | 3 | ✅ tests/ui/account.spec.ts |
| TC-069 | Profile - Required-field validation on update | High | Regression, UI, Negative | 2 | ✅ tests/ui/account.spec.ts |
| TC-070 | Password - Customer changes the password and logs in with the new one | High | Regression, UI, Positive | 4 | ✅ tests/ui/account.spec.ts |
| TC-071 | Password - Wrong current password is rejected | Medium | Regression, UI, Negative | 2 | ✅ tests/ui/account.spec.ts |
| TC-072 | Favorites - Favorite can be removed from the favorites page | High | Regression, UI, Positive | 3 | ✅ tests/ui/account.spec.ts |
| TC-073 | Invoices - Invoice PDF can be downloaded after async generation | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/account.spec.ts |
| TC-074 | Messages - Contact messages sent while logged in are listed in the account | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/account.spec.ts |
| TC-075 | Security - TOTP two-factor setup is available on the profile | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/account.spec.ts |
| TC-076 | Session - Expired session redirects to login | Medium | Regression, UI, Edge | 2 | ✅ tests/ui/account.spec.ts |

## Contact (`contact.csv`, 6 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-077 | Form - Guest sends a message with valid data | High | Regression, UI, Positive | 2 | ✅ tests/ui/contact.spec.ts |
| TC-078 | Form - Required-field validations | High | Regression, UI, Negative | 2 | ✅ tests/ui/contact.spec.ts |
| TC-079 | Form - Logged-in user's message is linked to the account | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/contact.spec.ts |
| TC-080 | Attachment - Allowed file is accepted | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/contact.spec.ts |
| TC-081 | Attachment - Non-empty attachment is rejected | High | Regression, UI, Negative | 2 | ✅ tests/ui/contact.spec.ts |
| TC-082 | Form - Message shorter than the minimum length is rejected | Medium | Regression, UI, Negative | 2 | ✅ tests/ui/contact.spec.ts |

## Admin (`admin.csv`, 15 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-083 | Dashboard - Admin sees sales chart and latest orders | Highest | Smoke, UI, Positive | 2 | ✅ tests/ui/admin.spec.ts |
| TC-084 | Products - Admin creates a product | High | Regression, UI, Positive | 4 | ✅ tests/ui/admin.spec.ts |
| TC-085 | Products - Admin edits a product | High | Regression, UI, Positive | 3 | ✅ tests/ui/admin.spec.ts |
| TC-086 | Products - Admin deletes a product | High | Regression, UI, Positive | 3 | ✅ tests/ui/admin.spec.ts |
| TC-087 | Products - Admin product search filters the list | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/admin.spec.ts |
| TC-088 | Brands - Admin manages a brand end to end | High | Regression, UI, Positive | 3 | ✅ tests/ui/admin.spec.ts |
| TC-089 | Categories - Admin manages a category end to end | High | Regression, UI, Positive | 3 | ✅ tests/ui/admin.spec.ts |
| TC-090 | Users - Admin creates a user who can log in | High | Regression, UI, Positive | 2 | ✅ tests/ui/admin.spec.ts |
| TC-091 | Users - Admin edits a user | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/admin.spec.ts |
| TC-092 | Users - Admin deletes a user without related records | High | Regression, UI, Positive | 3 | ✅ tests/ui/admin.spec.ts |
| TC-093 | Orders - Admin updates an order status | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/admin.spec.ts |
| TC-094 | Messages - Admin replies to a contact message | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/admin.spec.ts |
| TC-095 | Statistics - Admin statistics pages render report data | Medium | Regression, UI, Positive | 1 | ✅ tests/ui/admin.spec.ts |
| TC-096 | Validation - Product form rejects invalid input | High | Regression, UI, Negative | 2 | ✅ tests/ui/admin.spec.ts |
| TC-097 | Integrity - Brand or category in use cannot be deleted | Medium | Regression, UI, Edge | 1 | ✅ tests/ui/admin.spec.ts |

## API (`api.csv`, 25 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-098 | Auth - Login returns a JWT for valid credentials | Highest | Smoke, API, Positive | 1 | ✅ tests/api/auth.api.spec.ts |
| TC-099 | Auth - Login with wrong password returns 401 | High | Regression, API, Negative | 1 | ✅ tests/api/auth.api.spec.ts |
| TC-100 | Auth - Repeated failures lock the account | High | Regression, API, Edge | 3 | ✅ tests/api/auth.api.spec.ts |
| TC-101 | Auth - Register creates a user without exposing the password | Highest | Smoke, API, Positive | 1 | ✅ tests/api/auth.api.spec.ts |
| TC-102 | Auth - Register returns 422 with per-field validation errors | High | Regression, API, Negative | 1 | ✅ tests/api/auth.api.spec.ts |
| TC-103 | Auth - Register rejects breached passwords | High | Regression, API, Negative | 1 | ✅ tests/api/auth.api.spec.ts |
| TC-104 | Auth - /users/me returns the authenticated profile | High | Regression, API, Positive | 1 | ✅ tests/api/auth.api.spec.ts |
| TC-105 | Auth - Protected endpoints require a valid token | High | Regression, API, Negative | 2 | ✅ tests/api/auth.api.spec.ts |
| TC-106 | Auth - Token refresh issues a new token | Medium | Regression, API, Positive | 1 | ✅ tests/api/auth.api.spec.ts |
| TC-107 | Users - A customer cannot delete accounts | High | Regression, API, Negative | 2 | ✅ tests/api/auth.api.spec.ts |
| TC-108 | Users - Admin deletes a user without relations | High | Regression, API, Positive | 3 | ✅ tests/api/auth.api.spec.ts |
| TC-109 | Users - Deleting a user with invoices returns 409 | High | Regression, API, Edge | 2 | ✅ tests/api/auth.api.spec.ts |
| TC-110 | Products - Product listing returns a paginated structure | Highest | Smoke, API, Positive | 1 | ✅ tests/api/products.api.spec.ts |
| TC-111 | Products - Filtering and sorting parameters shape the result | High | Regression, API, Positive | 1 | ✅ tests/api/products.api.spec.ts |
| TC-112 | Products - Search endpoint returns matching products | High | Regression, API, Positive | 1 | ✅ tests/api/products.api.spec.ts |
| TC-113 | Products - Product by id and its related products | Medium | Regression, API, Positive | 2 | ✅ tests/api/products.api.spec.ts |
| TC-114 | Products - Unknown product id returns 404 | Medium | Regression, API, Negative | 1 | ✅ tests/api/products.api.spec.ts |
| TC-115 | Categories - Category tree matches the storefront structure | Medium | Regression, API, Positive | 1 | ✅ tests/api/products.api.spec.ts |
| TC-116 | Cart - Cart lifecycle via the API | High | Regression, API, Positive | 5 | ✅ tests/api/commerce.api.spec.ts |
| TC-117 | Invoices - Authenticated order creation via the API | High | Regression, API, Positive | 3 | ✅ tests/api/commerce.api.spec.ts |
| TC-118 | Invoices - Guest order creation | Medium | Regression, API, Positive | 1 | ✅ tests/api/commerce.api.spec.ts |
| TC-119 | Invoices - PDF generation is asynchronous | Medium | Regression, API, Edge | 2 | ✅ tests/api/commerce.api.spec.ts |
| TC-120 | Invoices - A user cannot read another user's invoice | High | Regression, API, Negative | 2 | ✅ tests/api/commerce.api.spec.ts |
| TC-121 | Contact - Message can be created and is visible to the admin | Medium | Regression, API, Positive | 2 | ✅ tests/api/misc.api.spec.ts |
| TC-122 | Postcode - Lookup resolves a valid postcode and rejects an invalid one | Medium | Regression, API, Positive | 2 | ✅ tests/api/misc.api.spec.ts |

## Quality (`quality.csv`, 6 case)

| TC | Case | Öncelik | Etiketler | Adım | Otomasyon |
|---|---|---|---|---|---|
| TC-123 | A11y - Home page has no serious accessibility violations | Medium | Regression, UI, Positive | 1 | ✅ tests/ui/quality.spec.ts |
| TC-124 | A11y - Login and registration pages have no serious violations | Medium | Regression, UI, Positive | 2 | ✅ tests/ui/quality.spec.ts |
| TC-125 | A11y - Product detail page has no serious violations | Medium | Regression, UI, Positive | 1 | ✅ tests/ui/quality.spec.ts |
| TC-126 | A11y - Contact page has no serious violations | Medium | Regression, UI, Positive | 1 | ✅ tests/ui/quality.spec.ts |
| TC-127 | Visual - Login page matches the approved baseline | Low | Regression, UI, Positive | 1 | ✅ tests/ui/quality.spec.ts |
| TC-128 | Visual - Contact page matches the approved baseline | Low | Regression, UI, Positive | 1 | ✅ tests/ui/quality.spec.ts |

