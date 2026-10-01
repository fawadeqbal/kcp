import { ReportsPage } from '@/features/reports/reports-page';
import { clientPage } from '@/lib/page';

const page = clientPage(ReportsPage, 'reports.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
