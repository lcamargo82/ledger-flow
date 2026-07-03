import { Prisma } from '@prisma/client';

const currencyExponents: Record<string, number> = {
  BRL: 2,
  USD: 2,
  JPY: 0,
};

export class Money {
  private constructor(
    readonly amountMinor: string,
    readonly currency: string,
    readonly exponent: number,
  ) {}

  static fromMinor(amountMinor: string | number, currency = 'BRL') {
    const normalizedCurrency = currency.toUpperCase();
    return new Money(
      String(amountMinor),
      normalizedCurrency,
      Money.exponentFor(normalizedCurrency),
    );
  }

  static fromDecimalString(value: string | number, currency = 'BRL') {
    const normalizedCurrency = currency.toUpperCase();
    const exponent = Money.exponentFor(normalizedCurrency);
    const multiplier = new Prisma.Decimal(10).pow(exponent);
    const amountMinor = new Prisma.Decimal(String(value))
      .mul(multiplier)
      .toDecimalPlaces(0)
      .toString();

    return new Money(amountMinor, normalizedCurrency, exponent);
  }

  private static exponentFor(currency: string) {
    return currencyExponents[currency] ?? 2;
  }
}
