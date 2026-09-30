import { SignUpForm } from '@/features/auth/sign-up-form';
import { clientPage } from '@/lib/page';

const page = clientPage(SignUpForm, 'auth.signUp.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
