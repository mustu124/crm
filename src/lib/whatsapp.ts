export function buildWhatsAppUrl(phone: string, message: string) {
  const digits = phone.replace(/\D/g, "");
  const normalizedPhone = digits.startsWith("91") ? digits : `91${digits}`;

  return `https://wa.me/${normalizedPhone}?text=${encodeURIComponent(message)}`;
}
