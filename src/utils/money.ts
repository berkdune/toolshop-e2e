// "$14.15" gibi bir fiyat metnini sayıya çevirir.
export function money(text: string | null): number {
  return Number((text ?? '').replace(/[^0-9.]/g, ''));
}
