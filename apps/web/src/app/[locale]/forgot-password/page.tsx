import { ForgotPasswordForm } from '@/features/auth/forgot-password-form';
import { clientPage } from '@/lib/page';

const page = clientPage(ForgotPasswordForm, 'auth.forgot.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
