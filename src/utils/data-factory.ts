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

/** Parallel workers can share the same millisecond — add randomness to names. */
export function uniqueStamp(): string {
  return `${Date.now()}${faker.string.numeric(4)}`;
}

// The password policy includes a known-breach check (HIBP-style), so every
// password is random; the fixed parts guarantee the required character classes.
export function buildPassword(): string {
  return `E2e!${faker.string.alphanumeric({ length: 12 })}7q`;
}

// Test accounts follow this pattern so leftovers stay recognizable on the shared
// demo and can be cleaned up with an admin token. The default address is the NL
// set returned by the app's own postcode lookup: the invoice API geo-validates
// city/country pairs and rejects the TR combinations.
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
