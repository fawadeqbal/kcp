import { StudentHome } from '@/features/learn/student-home';
import { clientPage } from '@/lib/page';

const page = clientPage(StudentHome, 'learn.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
