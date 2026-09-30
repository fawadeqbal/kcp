import { AccountPage } from '@/features/account/account-page';
import { clientPage } from '@/lib/page';

const page = clientPage(AccountPage, 'account.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
