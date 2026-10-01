import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { AdminModule } from './admin/admin.module.js';
import { AppCrashesModule } from './app-crashes/app-crashes.module.js';
import { AuditModule } from './audit/audit.module.js';
import { BillingModule } from './billing/billing.module.js';
import { AuthGuard } from './auth/auth.guard.js';
import { AuthModule } from './auth/auth.module.js';
import { CertificatesModule } from './certificates/certificates.module.js';
import { ChildrenModule } from './children/children.module.js';
import { AppLoggerModule } from './common/logger.module.js';
import { RateLimitGuard } from './common/rate-limit/rate-limit.guard.js';
import { RateLimitModule } from './common/rate-limit/rate-limit.module.js';
import { AppConfigModule } from './config/config.module.js';
import { DatabaseModule } from './database/database.module.js';
import { FamilyEmailsModule } from './family-emails/family-emails.module.js';
import { FeatureFlagsModule } from './feature-flags/feature-flags.module.js';
import { HubModule } from './hub/hub.module.js';
import { HealthModule } from './health/health.module.js';
import { LearningModule } from './learning/learning.module.js';
import { ProgressModule } from './progress/progress.module.js';
import { PushModule } from './push/push.module.js';
import { ProjectsModule } from './projects/projects.module.js';
import { FeedbackModule } from './feedback/feedback.module.js';
import { MetricsModule } from './metrics/metrics.module.js';
import { PremiumModule } from './premium/premium.module.js';
import { MailModule } from './mail/mail.module.js';
import { NotificationsModule } from './notifications/notifications.module.js';
import { PermissionsModule } from './permissions/permissions.module.js';
import { PoliciesGuard } from './permissions/policies.guard.js';
import { RedisModule } from './redis/redis.module.js';
import { StorageModule } from './storage/storage.module.js';
import { ReferenceModule } from './reference/reference.module.js';
import { UsersModule } from './users/users.module.js';
import { WaitlistModule } from './waitlist/waitlist.module.js';
import { AccountModule } from './account/account.module.js';
import { ContentAdminModule } from './content-admin/content-admin.module.js';
import { ContentStudioModule } from './content-studio/content-studio.module.js';
import { ChatModule } from './chat/chat.module.js';
import { EventsModule } from './events/events.module.js';
import { ReadinessModule } from './readiness/readiness.module.js';
import { SchoolsModule } from './schools/schools.module.js';
import { FriendsModule } from './friends/friends.module.js';
import { ReferralsModule } from './referrals/referrals.module.js';
import { ReportsModule } from './reports/reports.module.js';
import { ParentalConsentModule } from './parental-consent/parental-consent.module.js';
import { ReviewsModule } from './reviews/reviews.module.js';
import { SettingsAdminModule } from './settings-admin/settings-admin.module.js';

@Module({
  imports: [
    // Infrastructure
    AppConfigModule,
    // Timed jobs (the nightly numbers); each takes a Redis lock, so several servers are fine.
    ScheduleModule.forRoot(),
    AppLoggerModule,
    DatabaseModule,
    RedisModule,
    StorageModule,
    RateLimitModule,
    MailModule,
    AuditModule,
    PermissionsModule,
    FeatureFlagsModule,
    NotificationsModule,
    PushModule,
    // Features
    HealthModule,
    AuthModule,
    UsersModule,
    ReferenceModule,
    ChildrenModule,
    AdminModule,
    LearningModule,
    ProgressModule,
    ProjectsModule,
    FeedbackModule,
    PremiumModule,
    MetricsModule,
    BillingModule,
    FamilyEmailsModule,
    WaitlistModule,
    CertificatesModule,
    ContentAdminModule,
    ContentStudioModule,
    ReviewsModule,
    ParentalConsentModule,
    ChatModule,
    EventsModule,
    SchoolsModule,
    ReadinessModule,
    HubModule,
    FriendsModule,
    ReferralsModule,
    ReportsModule,
    SettingsAdminModule,
    AccountModule,
    AppCrashesModule,
  ],
  providers: [
    // Global guards run in this order on every request:
    // 1. rate limits  2. who is calling (access token)  3. what they may do (@Can / @Public)
    { provide: APP_GUARD, useExisting: RateLimitGuard },
    { provide: APP_GUARD, useExisting: AuthGuard },
    { provide: APP_GUARD, useExisting: PoliciesGuard },
  ],
})
export class AppModule {}
