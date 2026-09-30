import { VerifyEmail } from '@/features/auth/verify-email';
import { clientPage } from '@/lib/page';

const page = clientPage(VerifyEmail, 'auth.verify.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
