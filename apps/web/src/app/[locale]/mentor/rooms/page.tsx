import { RoomsPage } from '@/features/rooms/rooms-page';
import { clientPage } from '@/lib/page';

function MentorRooms() {
  return <RoomsPage areas={['MENTOR']} />;
}

const page = clientPage(MentorRooms, 'rooms.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
