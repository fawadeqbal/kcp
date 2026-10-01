import { PayoutsPage } from '@/features/hub/payouts-page';
import { clientPage } from '@/lib/page';

const page = clientPage(PayoutsPage, 'hub.payouts.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
