import { createNavigation } from 'next-intl/navigation';
import { routing } from './routing';

// Language-aware versions of Next's navigation helpers: links keep the current language.
export const { Link, redirect, usePathname, useRouter, getPathname } = createNavigation(routing);
