import { LeaguePage } from '@/features/progress/league-page';
import { clientPage } from '@/lib/page';

const page = clientPage(LeaguePage, 'league.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
