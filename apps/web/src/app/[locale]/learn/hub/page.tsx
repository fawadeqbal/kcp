import { StudentHubPage } from '@/features/hub/student-hub';
import { clientPage } from '@/lib/page';

const page = clientPage(StudentHubPage, 'hub.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
