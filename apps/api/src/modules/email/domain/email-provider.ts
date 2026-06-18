export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export const EMAIL_PROVIDER = Symbol('EMAIL_PROVIDER');

export interface EmailProvider {
  sendEmail(options: SendEmailOptions): Promise<void>;
}
