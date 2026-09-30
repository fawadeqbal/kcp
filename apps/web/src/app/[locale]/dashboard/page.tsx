import { ParentDashboard } from '@/features/dashboard/parent-dashboard';
import { clientPage } from '@/lib/page';

const page = clientPage(ParentDashboard, 'nav.dashboard');
export const generateMetadata = page.generateMetadata;
export default page.Page;
