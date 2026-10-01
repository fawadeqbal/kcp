import { ClassesPage } from '@/features/schools/classes-page';
import { clientPage } from '@/lib/page';

const page = clientPage(ClassesPage, 'classes.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
