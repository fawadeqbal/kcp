import { CheckEmail } from '@/features/auth/check-email';
import { clientPage } from '@/lib/page';

const page = clientPage(CheckEmail, 'auth.checkEmail.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
