import { TeacherHomePage } from '@/features/schools/teacher-pages';
import { clientPage } from '@/lib/page';

const page = clientPage(TeacherHomePage, 'teacher.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
