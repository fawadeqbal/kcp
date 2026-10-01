import { MentorConduct } from '@/features/mentor/mentor-home';
import { clientPage } from '@/lib/page';

const page = clientPage(MentorConduct, 'mentor.conductTitle');
export const generateMetadata = page.generateMetadata;
export default page.Page;
