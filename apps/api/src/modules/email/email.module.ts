import { Global, Module } from '@nestjs/common';
import { EmailService } from './application/services/email.service';
import { EMAIL_PROVIDER } from './domain/email-provider';
import { SmtpEmailProvider } from './infra/smtp-email.provider';

@Global()
@Module({
  providers: [
    EmailService,
    {
      provide: EMAIL_PROVIDER,
      useClass: SmtpEmailProvider,
    },
  ],
  exports: [EmailService],
})
export class EmailModule {}
