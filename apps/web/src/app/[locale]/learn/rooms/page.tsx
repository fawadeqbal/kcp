import { RoomsPage } from '@/features/rooms/rooms-page';
import { clientPage } from '@/lib/page';

function StudentRooms() {
  return <RoomsPage />;
}

const page = clientPage(StudentRooms, 'rooms.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
