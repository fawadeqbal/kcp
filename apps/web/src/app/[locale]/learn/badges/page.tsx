import { BadgesPage } from '@/features/badges/badges-page';
import { clientPage } from '@/lib/page';

const page = clientPage(BadgesPage, 'badges.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
