import { ResetPasswordForm } from '@/features/auth/reset-password-form';
import { clientPage } from '@/lib/page';

const page = clientPage(ResetPasswordForm, 'auth.reset.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
