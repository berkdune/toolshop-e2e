# Toolshop E2E — Test Planı

> Proje: `toolshop-e2e` · Hedef: https://practicesoftwaretesting.com (Toolshop)
> Amaç: CV/portfolio + öğrenme · Tarih: 19 Ağustos 2026 · Durum: AKTİF — Faz 0 ✓ · Faz 1 ✓ (122 case) · Faz 2 ✓ (smoke) · **Faz 3 ✓ (122/122 test otomatize; reset penceresi dışında ardışık tam-yeşil koşular, suite ~4 dk)**; sıradaki: Faz 4 CI + vitrin

---

## 1. Karar kaydı (19 Ağu 2026, Berk ile birlikte verildi)

| Karar | Seçim | Gerekçe |
|---|---|---|
| Hedef site | practicesoftwaretesting.com | Modern Angular e-ticaret demosu + Swagger'lı gerçek REST API; UI+API hibrit senaryolara uygun. Site ve API ayakta (root:200, api/status:200 doğrulandı). |
| Stack | Playwright + TypeScript | Endüstri standardı; auto-wait, trace viewer, paralel koşum; aynı projede UI+API. |
| Case yapısı | Xray-tarzı CSV + tag'li kod | Rapsodo'daki 11 kolonlu format birebir; kod TC ID'lerine tag'lenir, traceability ayrı dosyada. |
| Amaç | Portfolio + öğrenme | README/rapor kalitesi öncelikli; adımlar açıklamalı ilerler. Public yüzey (README, case'ler) İngilizce, iç plan Türkçe. |

## 2. Hedef sistem

- **Frontend:** https://practicesoftwaretesting.com — Angular tabanlı "Toolshop" e-ticaret demosu (testsmith-io/practice-software-testing projesi).
- **API:** https://api.practicesoftwaretesting.com — Swagger dokümantasyonu mevcut (`/api/documentation`), JWT auth.
- **Selector avantajı:** Sitede yaygın `data-test` attribute'leri var → birincil selector stratejisi.
- **Faz 0'da doğrulanacak bilgiler:** seed kullanıcılar (`customer@practicesoftwaretesting.com` / `admin@practicesoftwaretesting.com`, şifre `welcome01` olarak biliniyor), veritabanının periyodik reset davranışı, headless tarayıcıya UA bazlı bot filtresi uygulanıp uygulanmadığı (fetch aracı 403 almıştı, gerçek UA 200 aldı).

## 3. Kapsam

### Kapsam içi modüller
| # | Modül | İçerik | ~Case |
|---|---|---|---|
| 1 | Auth | Register, login (customer/admin), logout, forgot password, form validasyonları | 15 |
| 2 | Ürün keşfi | Grid + pagination, arama, kategori/marka filtresi, fiyat slider, sıralama, dil değiştirme | 18 |
| 3 | Ürün detay | Detay bilgileri, adet, sepete ekle, favorilere ekle (auth gerekli), ilgili ürünler, kiralama (rental) | 10 |
| 4 | Sepet | Adet güncelleme, silme, toplam hesaplama | 8 |
| 5 | Checkout | 4 adım: sepet → giriş → fatura adresi → ödeme; ödeme yöntemi varyantları + validasyon; sipariş onayı | 15 |
| 6 | Hesabım | Profil güncelleme, favoriler, siparişler/faturalar, mesajlar | 10 |
| 7 | İletişim | Form + dosya yükleme validasyonu | 6 |
| 8 | Admin | Ürün/marka/kategori yönetimi, kullanıcı yönetimi, sipariş/mesaj yönetimi (read-ağırlıklı, bkz. Riskler) | 15 |
| 9 | API | Auth token, products/search/filter, cart, favorites, invoices, users; negative + status kod kontrolleri | 25 |

**Gerçekleşen (Faz 1):** 122 case / 261 adım; 14'ü `Smoke` (hepsi Highest). Modül dağılımı ve TC listesi `docs/TRACEABILITY.md`'de; format bekçisi `node scripts/validate-cases.js`.

### Kapsam dışı
Performans/yük testi, güvenlik pentest'i, gerçek mobil cihaz testleri. (Erişilebilirlik smoke'u ve visual test örneği Faz 5'te opsiyonel.)

## 4. Test stratejisi

- **Hibrit piramit:** Kritik kullanıcı yolculukları UI'dan; veri hazırlama/temizleme mümkün olduğunca API'den (hız + stabilite). Örn. kullanıcı API ile yaratılır, UI'da login edilir.
- **Seviyeler (tag):**
  - `@smoke` — her push'ta, hedef < 5 dk, yalnızca chromium.
  - `@regression` — nightly + release öncesi tam set, chromium + firefox + webkit.
  - `@api` — saf API suite'i, tarayıcısız, en hızlı katman.
- **Selector önceliği:** 1) `data-test`, 2) `getByRole`/erişilebilir ad, 3) asla kırılgan CSS/XPath.
- **Auth:** `storageState` ile setup projesinde bir kez login → testlere hazır oturum enjekte edilir. Login akışının kendisi ayrı testtir.
- **Test data:** Her test kendi verisini üretir (timestamp'li unique email, faker); seed veriye minimum bağımlılık; API üzerinden cleanup. Testler sıra-bağımsız ve paralel-güvenli olmak zorunda.
- **Ortam:** Tek ortam (public demo, paylaşımlı). Bu yüzden assertion'lar başkalarının verisinden etkilenmeyecek şekilde yazılır (örn. "listede tam N ürün var" değil, "eklediğim ürün listede var").

## 5. Case yapısı (CSV)

- Konum: `docs/cases/<modül>.csv` — modül başına bir dosya, **global TC numaralandırma** (TC-001'den başlar, modüller arası devam eder).
- Format: Rapsodo Xray formatının birebir aynısı, **kolon eklenmez/çıkarılmaz**:

```
test_id,case_name,case_description,test_type,priority,labels,labels,labels,step_number,step_action,expected_result
```

- Çok adımlı case'lerde ilk satır metadata taşır, devam satırlarında yalnız step kolonları dolu (Rapsodo örneğiyle aynı).
- **case_name konvansiyonu:** `Toolshop - <Module> - <Feature> - <Scenario>` (İngilizce).
- **test_type:** `Manual` (Xray tipi). **priority:** Highest (=smoke) / High / Medium / Low.
- **labels (3 kolon):** `[Smoke|Regression]`, `[UI|API]`, `[Positive|Negative|Edge]`.
- **Traceability:** CSV'ye kolon eklemek yerine `docs/TRACEABILITY.md` tutar: TC-ID ↔ spec dosyası/test adı ↔ otomasyon durumu. Kodda her test başlığı TC ID ile başlar: `test('TC-042 | Checkout - pay with credit card', ...)` → rapor ve grep ile eşleşme.

## 6. Framework mimarisi

```
toolshop-e2e/
├── docs/
│   ├── TEST_PLAN.md          # bu dosya
│   ├── EXPLORATION.md        # Faz 0 çıktısı: modül envanteri + davranış notları
│   ├── TRACEABILITY.md       # TC ↔ kod eşlemesi
│   └── cases/                # 11 kolonlu Xray CSV'leri (İngilizce)
├── src/
│   ├── pages/                # Page Object Model (BasePage + sayfa başına sınıf)
│   ├── fixtures/             # auth (storageState), api-client, test-data üreticileri
│   └── utils/
├── tests/
│   ├── setup/                # global setup: login → storageState üretimi
│   ├── ui/                   # modül başına spec: auth.spec.ts, checkout.spec.ts ...
│   └── api/                  # request-context tabanlı API testleri
├── playwright.config.ts      # projects: setup, chromium, firefox, webkit; baseURL .env'den
├── .env.example              # BASE_URL, API_URL, seed cred'ler (gerçek .env git'e girmez)
├── .github/workflows/e2e.yml
└── README.md                 # İngilizce, portfolio vitrini: kurulum 3 komut + rozetler + rapor linki
```

- **Araçlar:** Playwright Test (runner + assertion + rapor hepsi bir arada), TypeScript strict, ESLint + Prettier, dotenv, @faker-js/faker.
- **Raporlama:** Playwright HTML report + hata anında trace/video/screenshot. (Allure eklemiyoruz; built-in rapor portfolio için yeterli ve sıfır bakım.)

## 7. CI/CD (GitHub Actions)

- **Push/PR:** `@smoke` chromium'da koşar (< 5 dk hedef).
- **Nightly (cron):** tam `@regression` + `@api`, 3 tarayıcı.
- **Artifact:** HTML rapor + fail trace'leri her koşumdan saklanır.
- **Vitrin:** Son nightly raporu GitHub Pages'a yayınlanır; README'ye durum rozeti + rapor linki eklenir.

## 8. Fazlar

| Faz | İçerik | Çıktı | Tahmin |
|---|---|---|---|
| **0 — Keşif** | Siteyi uçtan uca gezme, Swagger envanteri, seed user + reset davranışı + headless erişim doğrulaması | `docs/EXPLORATION.md` | 1 oturum |
| **1 — Case seti** | ~120 case, modül modül CSV (İngilizce), Highest/Smoke işaretleme | `docs/cases/*.csv` → birlikte review | 1–2 oturum |
| **2 — İskelet + Smoke** | Repo kurulumu, config, POM çekirdeği, auth fixture, ~15 smoke testi yeşil | koşan smoke suite + HTML rapor | 1–2 oturum |
| **3 — Regression** | Kalan P1–P2 otomasyonu modül modül + API suite + negative'ler | tam suite, 3 ardışık yeşil koşum | 3–4 oturum |
| **4 — CI + vitrin** | Actions (push + nightly), Pages rapor yayını, README (EN), mimari şema, demo GIF | public repo vitrini | 1 oturum |
| **5 — Opsiyonel cila** | axe ile a11y smoke, 1–2 visual test örneği | fark yaratan ekstralar | 1 oturum |

**Definition of Done:** Tüm Highest+High case'ler otomatize · smoke < 5 dk, full < 20 dk · testler sıra-bağımsız/paralel-güvenli · 3 ardışık tam koşum yeşil (flake kontrolü) · nightly CI yeşil ve rapor yayında · README ile kurulum 3 komutta.

## 9. Riskler ve önlemler

| Risk | Önlem |
|---|---|
| Paylaşımlı public demo → veri çakışması | Unique test datası (timestamp email), API cleanup, mutlak-sayı assertion'ı yok |
| Periyodik DB reset (doğrulanacak) | Her test kendi verisini yaratır; seed'e minimum bağımlılık |
| UA bazlı bot filtresi (fetch 403 gördü) | Playwright gerçek tarayıcı motoru kullanır; Faz 0'da headless erişim ayrıca doğrulanır |
| Site sürüm güncellenmesi / DOM değişimi | `data-test` öncelikli selector + POM tek değişiklik noktası |
| Bilinmeyen rate limit | Worker sayısı 2–4 ile başlar, kademeli artırılır |
| Admin hesabı paylaşımlı → yıkıcı işlemler başkalarını etkiler | Admin senaryoları read-ağırlıklı; create ettiğini silen self-contained case'ler |

## 10. Açık sorular (Faz 0'da yanıtlanacak)

✅ Dördü de yanıtlandı — bkz. `EXPLORATION.md §6`.

## 11. Faz 0 sonrası güncellemeler (19 Ağu 2026)

- **Kapsama eklendi:** guest checkout (`/invoices/guest`), ürün karşılaştırma, eco/CO₂ filtre + sıralama, postcode lookup, hesap kilitleme (423), sızıntılı-şifre reddi (422), TOTP 2FA (API seviyesi, P3), fatura PDF asenkron akışı. Case hedefi ~120 → **~130**.
- **Veri stratejisi netleşti:** her test kendi kullanıcısını `toolshop.e2e.<timestamp>@example.com` deseniyle API'den yaratır; cleanup admin token'ıyla best-effort (fatura sahibi kullanıcı 409 → silinemez, tolere edilir). Seed olarak yalnız admin + customer2/3 fallback (customer1 kilitli çıktı).
- **Yeni riskler:** JWT ~5 dk ömür (uzun koşumda refresh); frontend aktif geliştiriliyor (v2.4, build 5 gün önce).

## 12. Faz 3 sonrası güncellemeler (19 Ağu 2026)

- **122/122 case otomatize** (UI 97 + API 25); tam suite ~4 dk, 4 worker. Otomasyon eşlemesi `docs/TRACEABILITY.md`'de (validate script'i spec'lerden otomatik çıkarır).
- **Kritik akış düzeltmesi:** sipariş iki fazlı (ödeme kontrolü + ikinci Confirm) — case'ler ve testler buna göre güncellendi; "fatura gecikmesi" gözlemi geri çekildi.
- **Ortam yönetimi:** DB saat başı resetleniyor → `retries` açık, CI cron'u saat başından uzak planlanacak; stok tükenebiliyor → dinamik `findInStockProducts()`; testler NL/Laren fatura adresi kullanır (geo-doğrulama).
- **Bug adayları** (rapor edilecek): İzmir/TR geo-doğrulama reddi; house_number'ın lookup'ça silinmesi; ürün edit formunun stock/dropdown prefill etmemesi; forgot-password'ta ham i18n anahtarı; register API'sinde e-posta format kontrolü yokluğu. Tam liste `EXPLORATION.md §7`.
