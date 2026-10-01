import { LeadHubPage } from '@/features/hub/lead-hub';
import { clientPage } from '@/lib/page';

const page = clientPage(LeadHubPage, 'hub.lead.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
