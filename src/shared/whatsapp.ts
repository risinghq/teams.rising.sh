// WhatsApp numbers are stored as digits with the country code, the form the
// Cloud API reports in `from`.
export function normalizeNumber(value: string): string | null {
  const digits = value.replace(/[\s()+-]/g, "");
  return /^\d{8,15}$/.test(digits) ? digits : null;
}
