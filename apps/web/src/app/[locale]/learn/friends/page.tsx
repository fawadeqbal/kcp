import { FriendsPage } from '@/features/friends/friends-page';
import { clientPage } from '@/lib/page';

const page = clientPage(FriendsPage, 'friends.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
