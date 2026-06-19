import { Injectable } from '@nestjs/common';
import * as crypto from 'crypto';

@Injectable()
export class PaymentReferenceService {
  generateReference(): string {
    const date = new Date();
    const yyyy = date.getFullYear();
    const mm = String(date.getMonth() + 1).padStart(2, '0');
    const dd = String(date.getDate()).padStart(2, '0');
    const dateStr = `${yyyy}${mm}${dd}`;

    // Generate 6 random alphanumeric characters
    const randomBytes = crypto.randomBytes(4);
    const randomHex = randomBytes.toString('hex').toUpperCase();
    const uniqueStr = randomHex.slice(0, 6);

    return `PAY-${dateStr}-${uniqueStr}`;
  }
}
