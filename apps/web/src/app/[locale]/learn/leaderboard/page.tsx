import { LeaderboardPage } from '@/features/progress/leaderboard-page';
import { clientPage } from '@/lib/page';

const page = clientPage(LeaderboardPage, 'leaderboard.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
