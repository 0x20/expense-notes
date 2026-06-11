// Single source of truth for payment methods. Add new methods here;
// the submission form and all display sites pick them up automatically.
export const PAYMENT_METHODS = [
  { value: 'iban', label: 'Bank Transfer' },
  { value: 'cash', label: 'Cash' },
  { value: 'bar', label: 'Bar Tab' },
];

export const paymentMethodLabel = (value) =>
  PAYMENT_METHODS.find((m) => m.value === value)?.label || value || '-';
