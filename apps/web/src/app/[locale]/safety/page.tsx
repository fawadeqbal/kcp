import { legalPage } from '@/features/legal/legal-page';

const page = legalPage('safety');
export const generateMetadata = page.generateMetadata;
export default page.Page;
