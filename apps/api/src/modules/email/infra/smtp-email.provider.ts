import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import type SMTPTransport from 'nodemailer/lib/smtp-transport';
import { EmailProvider, SendEmailOptions } from '../domain/email-provider';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class SmtpEmailProvider implements EmailProvider {
  private readonly logger = new Logger(SmtpEmailProvider.name);
  private transporter: nodemailer.Transporter;
  private readonly fromAddress: string;

  constructor(private configService: ConfigService) {
    const host = this.configService.get<string>('SMTP_HOST') || 'localhost';
    const port = this.configService.get<number>('SMTP_PORT') || 1025;
    const user = this.configService.get<string>('SMTP_USER');
    const pass = this.configService.get<string>('SMTP_PASS');
    const fromName = this.configService.get<string>('SMTP_FROM_NAME') || 'LedgerFlow';
    const fromEmail =
      this.configService.get<string>('SMTP_FROM_EMAIL') || 'noreply@ledgerflow.local';

    this.fromAddress = `"${fromName}" <${fromEmail}>`;

    const transportConfig: SMTPTransport.Options = {
      host,
      port,
      secure: port === 465,
    };

    if (user && pass) {
      transportConfig.auth = { user, pass };
    }

    this.transporter = nodemailer.createTransport(transportConfig);
    this.logger.log(`SMTP configured for ${host}:${port}`);
  }

  async sendEmail(options: SendEmailOptions): Promise<void> {
    try {
      await this.transporter.sendMail({
        from: this.fromAddress,
        to: options.to,
        subject: options.subject,
        text: options.text,
        html: options.html,
      });
      this.logger.log(`Email sent successfully to ${options.to} - Subject: ${options.subject}`);
    } catch (error) {
      const err = error as Error;
      this.logger.error(`Failed to send email to ${options.to}: ${err.message}`, err.stack);
      throw error;
    }
  }
}
