import { ConsentConfirm } from '@/features/children/parental-consent';
import { clientPage } from '@/lib/page';

const page = clientPage(ConsentConfirm, 'consent.confirmTitle');
export const generateMetadata = page.generateMetadata;
export default page.Page;
