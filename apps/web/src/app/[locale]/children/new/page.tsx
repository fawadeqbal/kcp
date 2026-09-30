import { AddChildForm } from '@/features/children/add-child-form';
import { clientPage } from '@/lib/page';

const page = clientPage(AddChildForm, 'addChild.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
