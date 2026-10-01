import { ReadinessPage } from '@/features/readiness/readiness-page';
import { clientPage } from '@/lib/page';

const page = clientPage(ReadinessPage, 'readiness.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
