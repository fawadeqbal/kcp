import { RoomsPage } from '@/features/rooms/rooms-page';
import { clientPage } from '@/lib/page';

function TeacherRooms() {
  return <RoomsPage areas={['TEACHER']} />;
}

const page = clientPage(TeacherRooms, 'rooms.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
