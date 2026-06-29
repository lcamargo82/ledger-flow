export function formatMoneyFromCents(amount: number, currency: string = 'BRL', locale: string = 'pt-BR'): string {
  const valueInReais = amount / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency: currency,
  }).format(valueInReais);
}
