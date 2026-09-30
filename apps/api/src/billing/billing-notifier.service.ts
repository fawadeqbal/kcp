import { Injectable, Logger } from '@nestjs/common';
import { formatDate, formatMoney } from '../common/format.js';
import { AppConfigService } from '../config/app-config.service.js';
import { PrismaService } from '../database/prisma.service.js';
import { MailService } from '../mail/mail.service.js';
import { type MailTemplate, type MailVars, toMailLanguage } from '../mail/templates.js';
import { NotificationsService } from '../notifications/notifications.service.js';

/**
 * Tells families what happened to their payments: a receipt, a failed renewal, the
 * end of premium — by email (in the parent's language) and in the app's bell. A
 * problem sending never fails what triggered it (a webhook, a staff action).
 */
@Injectable()
export class BillingNotifier {
  private readonly logger = new Logger(BillingNotifier.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    private readonly config: AppConfigService,
  ) {}

  private url(language: string, path: string) {
    return `${this.config.get('WEB_APP_URL')}/${toMailLanguage(language)}${path}`;
  }

  private async send(
    parentId: string,
    template: MailTemplate,
    path: string,
    vars: (language: string) => MailVars,
  ) {
    try {
      const parent = await this.prisma.user.findUnique({
        where: { id: parentId },
        select: { email: true, displayName: true, languageCode: true, status: true },
      });
      if (!parent?.email || parent.status === 'DELETED') return;
      await this.mail.send({
        to: parent.email,
        template,
        language: toMailLanguage(parent.languageCode),
        params: {
          name: parent.displayName ?? '',
          actionUrl: this.url(parent.languageCode, path),
          vars: vars(toMailLanguage(parent.languageCode)),
        },
      });
    } catch (error) {
      this.logger.warn(`Email "${template}" not sent: ${(error as Error).message}`);
    }
  }

  /** A receipt for a paid invoice. */
  async invoicePaid(invoiceId: string): Promise<void> {
    const invoice = await this.prisma.invoice.findUnique({ where: { id: invoiceId } });
    if (!invoice) return;
    const number = `KCP-${String(invoice.number).padStart(6, '0')}`;
    await this.notifications.notify([invoice.parentId], 'payment_receipt', {
      invoiceId: invoice.id,
      number,
    });
    await this.send(invoice.parentId, 'receipt', `/billing/invoices/${invoice.id}`, (language) => ({
      number,
      amount: formatMoney(language, invoice.amountMinor, invoice.currency),
      until: formatDate(language, invoice.periodEnd),
    }));
  }

  async paymentFailed(subscriptionId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!subscription) return;
    await this.notifications.notify([subscription.parentId], 'payment_failed', {});
    await this.send(subscription.parentId, 'paymentFailed', '/billing', () => ({}));
  }

  async subscriptionEnded(subscriptionId: string): Promise<void> {
    const subscription = await this.prisma.subscription.findUnique({
      where: { id: subscriptionId },
    });
    if (!subscription) return;
    await this.notifications.notify([subscription.parentId], 'plan_ended', {});
    await this.send(subscription.parentId, 'subscriptionEnded', '/billing', () => ({}));
  }
}
