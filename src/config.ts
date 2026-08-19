import dotenv from 'dotenv';

dotenv.config();

// Defaults target the public demo; override via .env.
export const config = {
  baseURL: process.env.BASE_URL ?? 'https://practicesoftwaretesting.com',
  apiURL: process.env.API_URL ?? 'https://api.practicesoftwaretesting.com',
  admin: {
    email: process.env.ADMIN_EMAIL ?? 'admin@practicesoftwaretesting.com',
    password: process.env.ADMIN_PASSWORD ?? 'welcome01',
  },
  // The API returns 403 to non-browser user agents; request contexts send this one.
  browserUA:
    'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36',
};
