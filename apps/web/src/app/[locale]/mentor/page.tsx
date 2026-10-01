import { MentorHome } from '@/features/mentor/mentor-home';
import { clientPage } from '@/lib/page';

const page = clientPage(MentorHome, 'mentor.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
