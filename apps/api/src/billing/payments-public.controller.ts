import {
  Controller,
  Get,
  Headers,
  HttpCode,
  HttpStatus,
  NotFoundException,
  Param,
  Post,
  Req,
  Res,
} from '@nestjs/common';
import { ApiExcludeEndpoint, ApiOkResponse, ApiTags } from '@nestjs/swagger';
import type { Request, Response } from 'express';
import { byIp, RateLimit } from '../common/rate-limit/rate-limit.decorator.js';
import { AppConfigService } from '../config/app-config.service.js';
import { Public } from '../permissions/permission.decorators.js';
import { PublicPricingDto } from './dto/billing.dto.js';
import { PricingService } from './pricing.service.js';
import { StripeWebhooksService } from './stripe/stripe-webhooks.service.js';
import { StripeGateway } from './stripe/stripe.gateway.js';

const MINUTE = 60;
const escapeHtml = (text: string) => text.replace(/[&<>"']/g, (c) => `&#${c.charCodeAt(0)};`);

/** Public payment routes: prices for the marketing site, and Stripe's webhooks. */
@ApiTags('payments')
@Controller()
export class PaymentsPublicController {
  constructor(
    private readonly pricing: PricingService,
    private readonly webhooks: StripeWebhooksService,
    private readonly stripe: StripeGateway,
    private readonly config: AppConfigService,
  ) {}

  /** Premium prices per country, the trial and the family discount (the marketing site). */
  @Get('public/pricing')
  @Public()
  @RateLimit({ name: 'pricing-ip', limit: 120, windowSeconds: MINUTE, key: byIp })
  @ApiOkResponse({ type: PublicPricingDto })
  async publicPricing(@Res({ passthrough: true }) res: Response): Promise<PublicPricingDto> {
    res.setHeader('Cache-Control', 'public, max-age=300');
    return this.pricing.publicPricing();
  }

  /** Stripe's webhooks. The body is kept raw (app.setup.ts) to check the signature. */
  @Post('payments/webhooks/stripe')
  @Public()
  @HttpCode(HttpStatus.OK)
  @ApiExcludeEndpoint()
  async stripeWebhook(
    @Req() req: Request,
    @Headers('stripe-signature') signature: string | undefined,
  ): Promise<{ received: true }> {
    const body = Buffer.isBuffer(req.body) ? req.body : undefined;
    await this.webhooks.handle(body, signature);
    return { received: true };
  }

  // ── The mock of Stripe Checkout (development and tests only) ──────────────

  private mockOrThrow() {
    if (!this.stripe.mock) throw new NotFoundException();
    return this.stripe.mock;
  }

  /** Buttons may send the family on to the web app (the page's own CSP says so). */
  private mockPageHeaders(res: Response) {
    res.setHeader(
      'Content-Security-Policy',
      `default-src 'none'; style-src 'unsafe-inline'; form-action 'self' ${this.config.get('WEB_APP_URL')}; frame-ancestors 'none'; base-uri 'none'`,
    );
    res.setHeader('Cache-Control', 'no-store');
  }

  @Get('payments/mock-stripe/checkout/:id')
  @Public()
  @ApiExcludeEndpoint()
  async mockCheckout(@Param('id') id: string, @Res() res: Response) {
    const mock = this.mockOrThrow();
    const session = await mock.session(id).catch(() => null);
    if (!session) throw new NotFoundException();
    const amount = new Intl.NumberFormat('en', {
      style: 'currency',
      currency: session.currency.toUpperCase(),
    }).format(session.amount_total / 100);
    const action = (verb: string) =>
      `/v1/payments/mock-stripe/checkout/${encodeURIComponent(id)}/${verb}`;
    this.mockPageHeaders(res);
    res.type('html').send(`<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1">
<title>Test checkout</title>
<style>html{background:#f5ead8}body{font-family:system-ui,sans-serif;max-width:28rem;margin:3rem auto;padding:0 1rem;color:#201e1d}
h1{font-family:Georgia,serif}
.note{background:#fbe8c4;color:#6b4508;padding:.75rem 1rem;border-radius:1.375rem}
button{font:inherit;font-weight:700;padding:.8rem 1.4rem;border-radius:999px;border:1px solid #a05626;margin-top:1rem;cursor:pointer}
.pay{background:#a05626;color:#fffaf3}.cancel{background:transparent;color:#8c491a}</style></head>
<body><main>
<p class="note"><strong>Test mode.</strong> This is the development stand-in for Stripe Checkout. No card is charged.</p>
<h1>Kids Coding Platform Premium</h1>
<p>${escapeHtml(session.status === 'open' ? `Total today: ${amount}` : `This checkout is ${session.status}.`)}</p>
${
  session.status === 'open'
    ? `<form method="post" action="${action('pay')}"><button class="pay" type="submit">Pay ${escapeHtml(amount)} with a test card</button></form>
<form method="post" action="${action('cancel')}"><button class="cancel" type="submit">Cancel and go back</button></form>`
    : ''
}
</main></body></html>`);
  }

  @Post('payments/mock-stripe/checkout/:id/pay')
  @Public()
  @ApiExcludeEndpoint()
  async mockPay(@Param('id') id: string, @Res() res: Response) {
    const session = await this.mockOrThrow()
      .completeSession(id)
      .catch(() => null);
    if (!session) throw new NotFoundException();
    this.mockPageHeaders(res);
    res.redirect(303, session.success_url);
  }

  @Post('payments/mock-stripe/checkout/:id/cancel')
  @Public()
  @ApiExcludeEndpoint()
  async mockCancel(@Param('id') id: string, @Res() res: Response) {
    const session = await this.mockOrThrow()
      .expireSession(id)
      .catch(() => null);
    if (!session) throw new NotFoundException();
    this.mockPageHeaders(res);
    res.redirect(303, session.cancel_url);
  }
}
