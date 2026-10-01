import { MentorEventsPage } from '@/features/events/mentor-events';
import { clientPage } from '@/lib/page';

const page = clientPage(MentorEventsPage, 'mentorEvents.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
