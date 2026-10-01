import { SkillsPage } from '@/features/reports/skills-page';
import { clientPage } from '@/lib/page';

const page = clientPage(SkillsPage, 'skills.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
