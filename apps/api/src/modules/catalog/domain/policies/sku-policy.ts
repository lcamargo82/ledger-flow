import { BadRequestException } from '@nestjs/common';

export class SkuPolicy {
  static readonly minLength = 8;
  static readonly maxLength = 20;
  private static readonly allowedPattern = /^[A-Z0-9_-]+$/;
  private static readonly numericLeadingZeroPattern = /^0[0-9]+$/;

  static normalize(value: string): string {
    const trimmed = value.trim();
    const canonical = trimmed.toUpperCase();

    if (trimmed !== canonical && trimmed.toUpperCase() !== canonical) {
      throw new BadRequestException('Invalid SKU.');
    }

    if (
      canonical.length < this.minLength ||
      canonical.length > this.maxLength ||
      !this.allowedPattern.test(canonical) ||
      this.numericLeadingZeroPattern.test(canonical)
    ) {
      throw new BadRequestException('Invalid SKU.');
    }

    return canonical;
  }
}
