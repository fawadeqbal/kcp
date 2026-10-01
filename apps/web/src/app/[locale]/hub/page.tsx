import { ParentHubPage } from '@/features/hub/parent-hub';
import { clientPage } from '@/lib/page';

const page = clientPage(ParentHubPage, 'hub.family.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
