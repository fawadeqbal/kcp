import { LoginForm } from '@/features/auth/login-form';
import { clientPage } from '@/lib/page';

const page = clientPage(LoginForm, 'auth.login.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
