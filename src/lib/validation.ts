export function isValidRwandanPhone(phone: string): boolean {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');
  return /^(?:\+250|0)7[289][0-9]{7}$/.test(cleaned);
}

export function formatPhoneInput(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');

  let number = digitsOnly;
  if (number.startsWith('250')) {
    number = number.slice(3);
  } else if (number.startsWith('0')) {
    number = number.slice(1);
  }

  number = number.slice(0, 9);

  if (number.length === 0) return '+250 ';
  if (number.length <= 2) return `+250 ${number}`;
  if (number.length <= 5) return `+250 ${number.slice(0, 2)} ${number.slice(2)}`;

  return `+250 ${number.slice(0, 2)} ${number.slice(2, 5)} ${number.slice(5)}`;
}

export function getPhoneValidationState(phone: string): {
  isValid: boolean;
  isPartial: boolean;
  isInvalidPrefix: boolean;
} {
  const cleaned = phone.replace(/[\s\-\(\)]/g, '');

  if (cleaned.length === 0) {
    return { isValid: false, isPartial: true, isInvalidPrefix: false };
  }

  const digits = cleaned.replace(/\D/g, '');
  const afterPrefix = cleaned.startsWith('+250')
    ? digits.slice(3)
    : cleaned.startsWith('0')
      ? digits.slice(1)
      : digits;

  if (afterPrefix.length >= 2) {
    const prefix = afterPrefix.slice(0, 2);
    if (prefix !== '72' && prefix !== '78' && prefix !== '79') {
      return { isValid: false, isPartial: false, isInvalidPrefix: true };
    }
  }

  const isValid = isValidRwandanPhone(cleaned);
  return { isValid, isPartial: !isValid && afterPrefix.length < 9, isInvalidPrefix: false };
}

export function normalizePhone(phone: string): string {
  const digitsOnly = phone.replace(/\D/g, '');
  if (digitsOnly.startsWith('250')) {
    return `+${digitsOnly}`;
  }
  if (digitsOnly.startsWith('0')) {
    return `+250${digitsOnly.slice(1)}`;
  }
  return digitsOnly.startsWith('7') ? `+250${digitsOnly}` : digitsOnly;
}

export function formatRwandanPhone(phone: string): string {
  const normalized = normalizePhone(phone);
  const digits = normalized.replace(/\D/g, '');
  if (digits.length === 12) {
    return `+250 ${digits.slice(3, 5)} ${digits.slice(5, 8)} ${digits.slice(8)}`;
  }
  return normalized;
}
