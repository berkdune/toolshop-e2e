# Toolshop Keşif Raporu (Faz 0)

> Tarih: 19 Ağustos 2026 · Yöntem: curl API probe + headless Chromium gezinme (scripts/explore.js, explore2.js)
> Sonuç: **Otomasyon önünde engel yok.** 20 sayfa gezildi, 87 API endpoint'i envanterlendi, checkout uçtan uca tamamlandı.

---

## 1. Ortam kimliği

| Bileşen | Değer |
|---|---|
| Frontend | https://practicesoftwaretesting.com — Angular 20.0.5, **v2.4, build 2026-08-14** (5 gün önce → aktif bakımda!) |
| API | https://api.practicesoftwaretesting.com — Toolshop API **v5.0.0**, OpenAPI 3.2 |
| Swagger UI | `/api/documentation` · JSON: `/docs?api-docs.json` |
| Sprint varyantları | v1–v4.practicesoftwaretesting.com (eski sprintler), **with-bugs.practicesoftwaretesting.com** (bilinçli buglı — ileride bug-hunt vitrini için aday) |
| Kaynak | github.com/testsmith-io/practice-software-testing (footer'da link) |

## 2. Erişim ve hesap doğrulamaları

- **Headless Chromium engellenmiyor** (`headlessBlocked: false`). UA bazlı filtre yalnızca tarayıcı-dışı araçları (fetch/curl default UA) 403'lüyor → curl'e browser UA header'ı eklemek yetiyor; Playwright'ta sorun yok.
- Seed hesaplar:
  | Hesap | Durum |
  |---|---|
  | customer@practicesoftwaretesting.com / welcome01 | **KİLİTLİ** (HTTP 423 "Account locked, too many failed attempts") — paylaşılan ortamda başkaları kilitlemiş |
  | customer2@practicesoftwaretesting.com / welcome01 | ✅ çalışıyor |
  | customer3@practicesoftwaretesting.com / pass123 | ✅ çalışıyor |
  | admin@practicesoftwaretesting.com / welcome01 | ✅ çalışıyor → /admin/dashboard |
- **Ders:** Seed customer'lara güvenilmez (herkes kilitleyebilir/kirletebilir). Testler kendi kullanıcısını API'den yaratacak; seed'ler yalnızca admin (tek admin var) ve fallback.

## 3. Test verisi yaşam döngüsü (kanıtlanmış kurallar)

1. **Self-provision çalışıyor:** `POST /users/register` → 201 (adres nested object; `house_number` API'de null olabiliyor).
2. **Şifre politikası sızıntı kontrolü içeriyor:** "SuperSecure@123" → 422 *"The given password has appeared in a data leak"* (HaveIBeenPwned tarzı). Test datası üreticisi rastgele/benzersiz şifre üretmeli; bu ayrıca güzel bir negative case.
3. **Kullanıcı kendini silemiyor:** kendi token'ıyla `DELETE /users/{id}` → 403.
4. **Admin silebiliyor:** admin token'ıyla → 204. **AMA** faturası (ilişkili kaydı) olan kullanıcı → **409 Conflict** (fatura DELETE endpoint'i yok → sipariş vermiş test kullanıcıları kalıcı artık olur).
5. **Politika:** tüm test hesapları `toolshop.e2e.<timestamp>@example.com` deseniyle açılır (artıklar tanınabilir), teardown'da admin token'ıyla best-effort silme (204 beklenir, 409 tolere edilir).
6. Token: JWT Bearer, **~5 dk ömür** (iat/exp farkı 300 sn) → uzun testlerde `GET /users/refresh` veya yeniden login gerekebilir.

## 4. UI modül envanteri (gözlenen)

Tüm sayfalarda ortak: `nav-*` menüsü, 7 dil (`lang-de|el|en|es|fr|nl|tr`), `notification-bar`, `chat-toggle` (chat widget'ı), login sonrası `nav-menu` altında my-account/favorites/profile/invoices/messages/sign-out.

### Ana sayfa `/`
- Ürün grid'i (9/sayfa, 5 sayfa pagination), `product-{ULID}` kartları, `out-of-stock` etiketi, karttan `compare-btn`.
- **Sıralama:** name asc/desc, price asc/desc, **CO₂ rating asc/desc** (A–E sürdürülebilirlik rozeti her üründe).
- **Filtreler:** kategori ağacı (Hand Tools > Hammer/Hand Saw/Wrench/Screwdriver/Pliers/Chisels/Measures; Power Tools > Grinder/Sander/Saw/Drill; Other > Tool Belts/Storage/Workbench/Safety Gear/Fasteners), marka (ForgeFlex Tools, MightyCraft Hardware + başkalarının bıraktığı "some name" çöp markaları — paylaşılan ortam kanıtı), fiyat slider'ı (1–200 çift kollu), **eco-friendly-filter** checkbox'ı.
- Arama: `search-query/submit/reset` + sonuç başlığı `search-caption`, `search-result-count`, tamamlanma işareti `search_completed`.

### Ürün detay `/product/{id}`
`product-name`, `unit-price`, `co2-rating-badge`, kategori+marka chip'leri, `decrease-quantity`/`quantity`/`increase-quantity`, `add-to-cart`, `add-to-favorites`, `add-to-compare`, Specifications tablosu (`spec-row/name/value/unit` — Product Spec API'siyle eşleşir), Related products.

### Checkout `/checkout` — tek sayfa 4 adımlı sihirbaz: CART → SIGN IN → BILLING ADDRESS → PAYMENT
- Adım 1: `product-quantity` (inline değiştirilebilir), `line-price`, `cart-total`, `continue-shopping`, `proceed-1`.
- Adım 2: login formu **VEYA misafir devam** (`guest-email`, `guest-first-name`, `guest-last-name`, `guest-submit`) → **guest checkout kapsama eklendi** (API'de karşılığı `POST /invoices/guest`).
- Adım 3 Billing: `country`(select), `postal_code` + **postcode-lookup-hint** (`GET /postcode-lookup` API'si), `house_number`, `street`, `city`, `state`. **`house_number` UI'da zorunlu ama API kayıtta nullable → tutarsızlık/bug adayı; ayrıca dolu olmadan `proceed-3` disabled kalıyor** (ilk keşif koşusunda buna takıldık).
- Adım 4 Payment: `payment-method` select — **5 yöntem, yöntem-başına dinamik alt alanlar:**
  | Yöntem | Ek alanlar |
  |---|---|
  | bank-transfer | bank_name, account_name, account_number |
  | cash-on-delivery | (yok) |
  | credit-card | credit_card_number, expiration_date, cvv, card_holder_name |
  | buy-now-pay-later | monthly_installments (select) |
  | gift-card | gift_card_number, validation_code |
  - `finish` (buton etiketi "Confirm") → başarıda `payment-success-message`: **"Payment was successful"** (cash-on-delivery ile uçtan uca doğrulandı). API tarafında `POST /payment/check` mevcut.

### Hesap sayfaları (login gerekli, misafir → /auth/login'e redirect ✅)
- `/account` genel bakış; `/account/profile`: profil güncelleme + şifre değiştirme (`current/new/new-confirm`) + **TOTP 2FA kurulumu** (`totp-secret`, `totp-code`, `verify-totp`; API: `/totp/setup|verify`).
- `/account/favorites`: `favorite-{id}` kartları + `delete` (add-to-favorites akışı UI'dan doğrulandı).
- `/account/invoices`: ⚠️ **sipariş verildikten hemen sonra boş listelendi** — fatura listeleme asenkron/gecikmeli olabilir → testte polling/API doğrulaması gerekir (flake riski). PDF indirme API'si ayrıca "download-pdf-status" endpoint'i ile **asenkron** tasarlanmış.

### Auth sayfaları
- `/auth/login`: `login-form`, hata `login-error` → yanlış şifrede **"Invalid email or password"** (kayıtsız e-postada da aynı generic mesaj — user enumeration yok).
- `/auth/register`: first/last name, **dob**, country(select), postal_code, house_number, street, city, state, phone, email, password.
- `/auth/forgot-password`: email + submit.

### Diğer
- `/contact`: first/last name, email, subject (6 konu: Customer service, Webmaster, Return, Payments, Warranty, Status of my order), message, **attachment (dosya yükleme)**.
- `/rentals`: 3 kiralık ürün; detayda qty stepper YOK (add-to-cart/favorites/compare var; süre bileşeni data-test'siz olabilir → otomasyonda dikkat).
- Erişim kontrolü: guest→/account ✅redirect, guest→/admin ✅redirect, **customer→/admin ✅redirect** (üçü de doğrulandı).

### Admin (`John Doe`)
- Menü: dashboard (yıllık satış grafiği + son siparişler tablosu: INV-no, adres, tarih, **status: AWAITING_SHIPMENT/COMPLETED**, tutar, Edit), brands, categories, products, orders, users, messages, **settings**, **statistics** (avg month/week sales — Reports API).
- `/admin/products`: arama + `product-add` + satır başına `product-edit-{id}` / `product-delete-{id}`.
- `/admin/users`: arama + `user-add` + edit/delete.

## 5. API envanteri (87 endpoint, Swagger v5.0.0)

- **User (14):** register, login, logout, me, refresh, forgot-password, change-password, CRUD+search (admin) — login 423 lockout davranışı var.
- **Product (10) + Product Spec (6):** listeleme (`?page,sort,between=price,x,y ...`), search, related, specs; CRUD admin.
- **Category (10):** tree yapısı dahil; **Brand (8)**; ikisinde de search + CRUD.
- **Cart (6):** `POST /carts` (token'sız, id döner) → ürün ekle/çıkar/adet güncelle → UI checkout'la kesişir.
- **Invoice (11):** create, guest-create, search, status update, **PDF download + download-pdf-status (asenkron)**.
- **Favorite (4)**, **Contact (6)** (mesaj + attach-file + admin reply/status), **Payment (1)** `POST /payment/check`, **Postcode (1)** lookup, **TOTP (2)**, **Report (7)** (admin istatistikleri), **Image (1)**.
- Not: OpenAPI 3.2'de bazı uçlar yeni **QUERY** HTTP metoduyla da tanımlı (search'ler) — API testlerinde ilginç bir köşe.

## 6. Açık soruların cevapları (TEST_PLAN §10)

1. **Seed şifreler:** welcome01 geçerli (admin+customer2); customer3=pass123; **customer1 kilitli** → testler kendi kullanıcısını yaratır.
2. **DB reset:** README'de belgelenmemiş. Gözlem: başkalarının çöp verisi ("some name" markalar) ve kilitli hesap duruyordu → sık reset YOK varsayımı; testler artık bırakmamaya çalışır (madde 3'teki politika).
3. **API'de user create/delete:** create serbest (201); delete admin-only (self→403); ilişkili kaydı olan kullanıcı silinemez (409).
4. **data-test kapsamı:** Çok iyi — gezilen 20+ sayfada tüm etkileşimli öğelerde mevcut (istisna: rentals süre bileşeni + fatura satırları belirsiz; Faz 2'de netleşir).

## 7. Faz 3 keşifleri (otomasyon sırasında doğrulanan davranışlar)

### Kritik akış düzeltmeleri
- **Sipariş İKİ FAZLI:** ilk Confirm yalnızca `POST /payment/check` (→ "Payment was successful"); sipariş ancak **ikinci Confirm** ile verilir (`POST /invoices` → 201, sihirbaz sıfırlanır). "Fatura listesi gecikiyor" gözlemi yanılgıymış — sipariş hiç atılmıyormuş.
- **Geo-doğrulama:** `POST /invoices` şehir↔ülke tutarlılığını veri setinden doğruluyor; Izmir/İzmir + TR → 422 ("The city does not belong to the selected country") — **bug adayı** (TR 35000 lookup'ı bile 'Elazığ' döndürüyor). Testler sitenin kendi lookup çıktısı olan **NL/Laren/Gelderland/1012JS** setini kullanır.
- **Misafir sipariş sözleşmesi:** `POST /invoices/guest` + billing + `guest_email/guest_first_name/guest_last_name` → 201 (auth'suz düz /invoices → 401).

### Ortam gerçekleri
- **DB saat başı resetleniyor** (gözlem: 08:00/10:00/11:00) — reset anını kesen testler sunucu verisini kaybeder → `retries: 1` (yerel) / 2 (CI); CI cron'u saat başından uzağa planlanmalı.
- **Stok paylaşımlı ve tükeniyor:** siparişler stok düşürür; sabit ürün adı ("Combination Pliers") suite'i çökertti → `findInStockProducts()` ile dinamik stokta-ürün seçimi (`in_stock` alanı).
- Login endpoint'i başarısız denemeleri sayar: yanlış şifreyle **poll'lamak hesabı kilitler** (4. denemede 423) — TC-070 dersi: önce change-password yanıtını bekle, tek deneme yap.

### UI davranış dersleri (framework'e gömüldü)
- Angular formları veri gelince **resetleniyor**: profil/şifre/edit formlarına yazmadan önce "form doldu" çapası şart (yoksa yazılanlar silinir).
- `house_number` girildikten sonra asenkron postcode lookup alanı **silebiliyor** (bug adayı) — doğrula-yeniden-doldur.
- Ürün **edit formu stock ve dropdown'ları prefill etmiyor**; dokunulmamış kaydetme "Quantity is required" hatası veriyor (bug adayı).
- Checkout wizard adım göstergesi tıklanabilir görünüyor ama **geri navigasyon yapmıyor**; nav-cart aynı route olduğundan işlemsiz — cart'a dönüş tam sayfa reload.
- Form submit → hemen navigasyon, uçuştaki isteği **iptal ediyor** (admin CRUD, status update) → her submit'te yanıt beklenir (`submitAndWait`).
- Admin liste aramaları bootstrap ile yarışıp yutulabiliyor → bulunana dek yeniden-arama poll'u.
- Veri-adlandırma tutarsızlığı: marka kontrolleri `brand-{id}-edit`, kategori kontrolleri `category-edit-{id}` (fiil-önce).
- Gift card **tam 16 harf/rakam** ister; eco ürünlerde h1'e "ECO" rozeti ekleniyor; hesap mesaj listesi subject'i slug gösteriyor (customer-service).
- Contact eki kuralı: **dosya BOŞ (0 bayt) olmalı** ("File should be empty."); mesaj min 50 karakter; forgot-password onayı ham i18n anahtarı sızdırıyor (`page.forgot-password.confirm`) — **bug adayı**; register API'si bozuk e-posta formatına hata dönmüyor (yalnız client-side) — **bug adayı**; contact formu oturumda kimlik prefill etmiyor (bulgu).
- Oturum: JWT localStorage `auth-token` anahtarında → testlerde token enjeksiyonu (UI login'siz hızlı oturum); geçersiz token korumalı sayfadan **ana sayfaya** düşürüyor (login'e değil), nav "Sign in"e döner.
- TOTP secret profili asenkron dolduruyor (16 karakter base32; otplib v12 ile üretilen kod kabul edildi, `totp_enabled=true`).
- PDF üretimi: NOT_INITIATED(HTTP 400) → INITIATED(200) → COMPLETED; demo kuyruğu yavaş (60sn'de tamamlanmayabilir) → testte koşullu yumuşak geçiş + not.

## 8. Case yazımına etkiler (Faz 1 girdileri)

- Kapsama **eklendi:** guest checkout, ürün karşılaştırma (compare), eco/CO₂ filtre+sıralama, postcode lookup, TOTP (API seviyesi, P3), hesap kilitleme, sızıntılı-şifre reddi, fatura PDF (asenkron durum makinesi).
- **Ödeme matrisi:** 5 yöntem × (geçerli/eksik alt alan) → checkout modülünün bel kemiği.
- **Admin yazma işlemleri:** paylaşılan ortamda create→edit→delete'i kendi yarattığı kayıtla yapan self-contained case'ler (başkasının verisine dokunma).
- **Flake önlemleri:** fatura listesinde polling; token 5 dk → uzun suite'lerde storageState tazeleme; "some name" gibi çöp veriye dayanıklı assertion'lar.
