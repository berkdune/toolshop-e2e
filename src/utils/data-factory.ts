import { faker } from '@faker-js/faker';

export interface TestUser {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  street: string;
  houseNumber: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  phone: string;
  dob: string;
  id?: string;
}

/** Paralel worker'lar aynı milisaniyeyi paylaşabilir → ada rastgele ek şart. */
export function uniqueStamp(): string {
  return `${Date.now()}${faker.string.numeric(4)}`;
}

// Şifre politikası bilinen-sızıntı kontrolü içeriyor (HIBP tarzı) → her şifre rastgele üretilir.
// Sabit parçalar büyük/küçük harf, rakam ve sembol sınıflarını garanti eder.
export function buildPassword(): string {
  return `E2e!${faker.string.alphanumeric({ length: 12 })}7q`;
}

// Test hesapları bu desenle işaretlenir: paylaşılan demoda artıklar tanınabilir kalır
// ve teardown'da admin token'ıyla best-effort silinir (faturalı kullanıcı 409 → tolere edilir).
// Adres varsayılanı NL/Laren: invoice API'si city↔country geo-doğrulaması yapıyor ve
// TR kombinasyonları (Izmir/İzmir) 422 dönüyor; bu set sitenin kendi postcode-lookup çıktısı.
export function buildUser(): TestUser {
  const stamp = `${Date.now()}${faker.string.numeric(4)}`;
  return {
    firstName: faker.person.firstName(),
    lastName: faker.person.lastName(),
    email: `toolshop.e2e.${stamp}@example.com`,
    password: buildPassword(),
    street: 'van den Pollaan',
    houseNumber: '1',
    city: 'Laren',
    state: 'Gelderland',
    country: 'NL',
    postalCode: '1012JS',
    phone: '05550000000',
    dob: '1992-02-02',
  };
}
