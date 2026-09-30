import { Injectable, Logger, type OnModuleDestroy } from '@nestjs/common';
import { createTransport, type Transporter } from 'nodemailer';
import { AppConfigService } from '../config/app-config.service.js';
import { type MailLanguage, type MailParams, type MailTemplate, renderMail } from './templates.js';

export interface SendMailInput {
  to: string;
  template: MailTemplate;
  language: MailLanguage;
  params: MailParams;
}

export interface SentMail extends SendMailInput {
  subject: string;
  text: string;
  html: string;
}

/**
 * Sends transactional email. SMTP works with any provider (Resend, Amazon SES,
 * Postmark…) and with Mailpit locally. The memory transport exists for tests.
 */
@Injectable()
export class MailService implements OnModuleDestroy {
  private readonly logger = new Logger(MailService.name);
  private readonly transport: Transporter | undefined;
  /** Messages kept by the memory transport (tests only). */
  readonly outbox: SentMail[] = [];

  constructor(private readonly config: AppConfigService) {
    if (config.get('MAIL_TRANSPORT') === 'smtp') {
      this.transport = createTransport(config.get('SMTP_URL'));
    }
  }

  async send(input: SendMailInput): Promise<void> {
    const rendered = renderMail(input.template, input.language, input.params);
    if (!this.transport) {
      this.outbox.push({ ...input, ...rendered });
      return;
    }
    await this.transport.sendMail({
      from: this.config.get('MAIL_FROM'),
      to: input.to,
      subject: rendered.subject,
      text: rendered.text,
      html: rendered.html,
    });
    this.logger.log(`Sent "${input.template}" email (${input.language})`);
  }

  onModuleDestroy(): void {
    this.transport?.close();
  }
}
