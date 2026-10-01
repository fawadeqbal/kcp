import { EventsPage } from '@/features/events/events-page';
import { clientPage } from '@/lib/page';

const page = clientPage(EventsPage, 'events.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
