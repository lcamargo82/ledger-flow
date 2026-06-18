import { Inject, Injectable } from '@nestjs/common';
import { EMAIL_PROVIDER } from '../../domain/email-provider';
import type { EmailProvider } from '../../domain/email-provider';
import { getPasswordResetTemplate } from '../templates/password-reset.template';

@Injectable()
export class EmailService {
  constructor(
    @Inject(EMAIL_PROVIDER)
    private readonly emailProvider: EmailProvider,
  ) {}

  async sendPasswordResetEmail(to: string, resetLink: string): Promise<void> {
    const template = getPasswordResetTemplate(resetLink);

    await this.emailProvider.sendEmail({
      to,
      subject: template.subject,
      text: template.text,
      html: template.html,
    });
  }
}
