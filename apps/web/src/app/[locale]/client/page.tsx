import { ClientHomePage } from '@/features/hub/client-portal';
import { clientPage } from '@/lib/page';

const page = clientPage(ClientHomePage, 'client.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
