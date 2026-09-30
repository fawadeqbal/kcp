import { StudentLoginForm } from '@/features/auth/student-login-form';
import { clientPage } from '@/lib/page';

const page = clientPage(StudentLoginForm, 'auth.student.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
