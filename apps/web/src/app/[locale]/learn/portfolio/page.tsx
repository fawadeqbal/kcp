import { PortfolioPage } from '@/features/portfolio/portfolio-page';
import { clientPage } from '@/lib/page';

const page = clientPage(PortfolioPage, 'portfolio.title');
export const generateMetadata = page.generateMetadata;
export default page.Page;
