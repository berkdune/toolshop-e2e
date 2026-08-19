import dotenv from 'dotenv';

dotenv.config();

// Varsayılanlar public demo ortamını hedefler; .env ile override edilebilir.
export const config = {
  baseURL: process.env.BASE_URL ?? 'https://practicesoftwaretesting.com',
  apiURL: process.env.API_URL ?? 'https://api.practicesoftwaretesting.com',
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@practicesoftwaretesting.com',
    password: process.env.ADMIN_PASSWORD ?? 'welcome01',
  },
  // API, tarayıcı-dışı user-agent'ları 403'lüyor; request context'lerde bunu kullanıyoruz.
  browserUA:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};
