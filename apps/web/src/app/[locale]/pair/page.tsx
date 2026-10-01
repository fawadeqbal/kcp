import { PairDevice } from '@/features/children/pair-device';
import { clientPage } from '@/lib/page';

const page = clientPage(PairDevice, 'pair.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
