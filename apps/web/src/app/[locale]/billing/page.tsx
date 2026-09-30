import { BillingPage } from '@/features/billing/billing-page';
import { clientPage } from '@/lib/page';

const page = clientPage(BillingPage, 'billing.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
