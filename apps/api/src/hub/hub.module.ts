import { Module } from '@nestjs/common';
import { AuthModule } from '../auth/auth.module.js';
import { BillingModule } from '../billing/billing.module.js';
import { ChatModule } from '../chat/chat.module.js';
import { EventsModule } from '../events/events.module.js';
import {
  ClientPortalController,
  HubIntakeAdminController,
  PublicIntakeController,
} from './clients.controller.js';
import { ClientsService } from './clients.service.js';
import {
  ClientDeliveriesController,
  HubDeliveriesAdminController,
  LeadDeliveriesController,
  SharedPreviewController,
} from './deliveries.controller.js';
import { DeliveriesService } from './deliveries.service.js';
import { HubEarningsService } from './earnings.service.js';
import { PayoutAccountsService } from './payout-accounts.service.js';
import {
  EarningsController,
  PayoutWebhooksController,
  PayoutsAdminController,
} from './payouts.controller.js';
import { PayoutsService } from './payouts.service.js';
import {
  ParentStoriesController,
  PublicHubController,
  StoriesAdminController,
} from './stories.controller.js';
import { HubStoriesService } from './stories.service.js';
import { WiseGateway } from './payouts/wise.gateway.js';
import { HubContractsController, HubEligibilityController } from './eligibility.controller.js';
import { HubEligibilityService } from './eligibility.service.js';
import { IntakeAdminService } from './intake-admin.service.js';
import { HubInvoicesService } from './invoices.service.js';
import { LedgerService } from './ledger/ledger.service.js';
import {
  ClientProjectsController,
  HubProjectsAdminController,
  LeadProjectsController,
} from './projects.controller.js';
import { ProjectsService } from './projects.service.js';
import { ProjectsAdminService } from './projects-admin.service.js';
import { QuotesService } from './quotes.service.js';
import { HubGitService } from './hub-git.service.js';
import {
  ClientTeamController,
  HubGitController,
  HubGitProxyController,
  LeadTeamController,
  ParentHubController,
  StudentHubController,
} from './team.controller.js';
import { HubTeamService } from './team.service.js';
import { HubTimeService } from './time.service.js';

/**
 * The real-world hub: paid client projects for senior students, led by the platform's
 * lead developers, with a double-entry ledger for the money.
 */
@Module({
  imports: [AuthModule, BillingModule, ChatModule, EventsModule],
  controllers: [
    HubContractsController,
    HubEligibilityController,
    PublicIntakeController,
    ClientPortalController,
    HubIntakeAdminController,
    LeadProjectsController,
    ClientProjectsController,
    HubProjectsAdminController,
    LeadTeamController,
    StudentHubController,
    HubGitController,
    ParentHubController,
    ClientTeamController,
    HubGitProxyController,
    LeadDeliveriesController,
    ClientDeliveriesController,
    HubDeliveriesAdminController,
    SharedPreviewController,
    EarningsController,
    PayoutWebhooksController,
    PayoutsAdminController,
    ParentStoriesController,
    StoriesAdminController,
    PublicHubController,
  ],
  providers: [
    HubEligibilityService,
    LedgerService,
    ClientsService,
    IntakeAdminService,
    ProjectsService,
    ProjectsAdminService,
    QuotesService,
    HubInvoicesService,
    HubTimeService,
    HubGitService,
    HubTeamService,
    DeliveriesService,
    HubEarningsService,
    PayoutAccountsService,
    PayoutsService,
    WiseGateway,
    HubStoriesService,
  ],
  exports: [HubEligibilityService, LedgerService, PayoutAccountsService],
})
export class HubModule {}
