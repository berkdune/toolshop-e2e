// Parses a price text like "$14.15" into a number.
export function money(text: string | null): number {
  return Number((text ?? '').replace(/[^0-9.]/g, ''));
}
