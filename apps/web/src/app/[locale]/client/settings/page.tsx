import { ClientSettingsPage } from '@/features/hub/client-portal';
import { clientPage } from '@/lib/page';

const page = clientPage(ClientSettingsPage, 'client.settings.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
