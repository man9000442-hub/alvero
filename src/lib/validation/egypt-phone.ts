/**
 * Normalizes an Egyptian mobile phone number to 11-digit local format (01XXXXXXXXX).
 * Supports inputs like +201012345678, 00201012345678, 201012345678, 010-1234-5678, etc.
 */
export function normalizeEgyptPhone(raw: string): string {
  let cleaned = (raw ?? "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("0020")) {
    cleaned = cleaned.slice(4);
  } else if (cleaned.startsWith("20") && cleaned.length === 12) {
    cleaned = cleaned.slice(2);
  }
  if (cleaned.length === 10 && cleaned.startsWith("1")) {
    cleaned = `0${cleaned}`;
  }
  return cleaned;
}

/**
 * Validates Egyptian mobile numbers: Vodafone (010), Etisalat (011), Orange (012), WE (015).
 */
export function isValidEgyptPhone(raw: string): boolean {
  const normalized = normalizeEgyptPhone(raw);
  return /^01[0125][0-9]{8}$/.test(normalized);
}

/**
 * Formats normalized phone into WhatsApp international format without '+' (e.g., 201012345678).
 */
export function toWhatsAppEgyptNumber(raw: string): string {
  const cleaned = (raw ?? "").replace(/[^0-9]/g, "");
  if (cleaned.startsWith("20") && cleaned.length === 12) return cleaned;
  const norm = normalizeEgyptPhone(raw);
  if (norm.startsWith("01")) {
    return `2${norm}`;
  }
  return cleaned;
}
