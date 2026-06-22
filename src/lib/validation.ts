export function isValidRwandanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(?:\+250|0)7[0-9]{8}$/.test(cleaned);
}

export function formatRwandanPhone(phone: string): string {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  if (/^0/.test(cleaned)) {
    return '+250' + cleaned.slice(1);
  }
  if (/^7/.test(cleaned)) {
    return '+250' + cleaned;
  }
  return cleaned;
}
